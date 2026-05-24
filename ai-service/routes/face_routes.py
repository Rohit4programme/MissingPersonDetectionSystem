"""
Face API Blueprint - Routes for face embedding generation, comparison, and detection.
"""

import logging
import os
import tempfile
import traceback

from flask import Blueprint, jsonify, request

from config import Config
from services import face_service
from utils.image_utils import load_image, resize_image, image_to_base64
from utils.validators import validate_image, validate_embedding

logger = logging.getLogger(__name__)

face_bp = Blueprint("face", __name__)


@face_bp.route("/api/generate-embedding", methods=["POST"])
def generate_embedding():
    """
    Generate a face embedding from an uploaded image.

    Accepts:
        - Multipart form with 'image' file field
        - JSON with 'image_base64' field

    Returns:
        JSON with embedding vector, quality score, and face count.
    """
    try:
        image_path = None

        # Handle file upload
        if "image" in request.files:
            file = request.files["image"]
            is_valid, error = validate_image(file)
            if not is_valid:
                return jsonify({"success": False, "error": error}), 400

            # Save to temp file
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            file.save(temp.name)
            image_path = temp.name

        # Handle base64 input
        elif request.is_json and request.json.get("image_base64"):
            import base64
            from utils.image_utils import base64_to_image

            base64_str = request.json["image_base64"]
            frame = base64_to_image(base64_str)
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            import cv2
            cv2.imwrite(temp.name, frame)
            image_path = temp.name
        else:
            return jsonify({
                "success": False,
                "error": "No image provided. Send as 'image' file or 'image_base64' JSON field.",
            }), 400

        # Generate embedding
        embedding = face_service.generate_embedding(image_path)

        # Assess quality
        quality_score = face_service.assess_quality(image_path)

        # Detect faces count
        faces = face_service.detect_faces(image_path)

        # Cleanup temp file
        try:
            os.unlink(image_path)
        except OSError:
            pass

        return jsonify({
            "success": True,
            "data": {
                "embedding": embedding,
                "dimension": len(embedding),
                "quality_score": round(quality_score, 4),
                "faces_detected": len(faces),
                "model": Config.FACE_MODEL,
            },
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except ValueError as e:
        logger.warning("Embedding generation failed: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        logger.error("Unexpected error in generate-embedding: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@face_bp.route("/api/compare-face", methods=["POST"])
def compare_face():
    """
    Compare an uploaded face image against a person or embedding.

    Accepts:
        - Multipart form: 'image' file + 'person_id' OR 'embedding' (JSON string)
        - JSON: 'image_base64' + 'person_id' OR 'embedding'

    Returns:
        JSON with similarity score and match details.
    """
    try:
        image_path = None

        # Handle file upload
        if "image" in request.files:
            file = request.files["image"]
            is_valid, error = validate_image(file)
            if not is_valid:
                return jsonify({"success": False, "error": error}), 400

            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            file.save(temp.name)
            image_path = temp.name

        elif request.is_json and request.json.get("image_base64"):
            import base64
            from utils.image_utils import base64_to_image

            base64_str = request.json["image_base64"]
            frame = base64_to_image(base64_str)
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            import cv2
            cv2.imwrite(temp.name, frame)
            image_path = temp.name
        else:
            return jsonify({"success": False, "error": "No image provided."}), 400

        # Generate embedding for the uploaded image
        uploaded_embedding = face_service.generate_embedding(image_path)

        # Cleanup
        try:
            os.unlink(image_path)
        except OSError:
            pass

        # Get reference embedding
        ref_embedding = None
        person_id = None

        if request.is_json:
            person_id = request.json.get("person_id")
            ref_embedding_data = request.json.get("embedding")
        else:
            person_id = request.form.get("person_id")
            ref_embedding_data = request.form.get("embedding")

        if ref_embedding_data:
            # Use provided embedding directly
            import json
            if isinstance(ref_embedding_data, str):
                ref_embedding = json.loads(ref_embedding_data)
            else:
                ref_embedding = ref_embedding_data

            is_valid, error = validate_embedding(ref_embedding)
            if not is_valid:
                return jsonify({"success": False, "error": f"Invalid embedding: {error}"}), 400

        elif person_id:
            # Look up embedding from database or index
            from services.database_service import get_person_embedding
            ref_embedding = get_person_embedding(person_id)
            if ref_embedding is None:
                return jsonify({
                    "success": False,
                    "error": f"No embedding found for person_id: {person_id}",
                }), 404
        else:
            return jsonify({
                "success": False,
                "error": "Provide either 'person_id' or 'embedding' for comparison.",
            }), 400

        # Compare faces
        similarity = face_service.compare_faces(uploaded_embedding, ref_embedding)

        is_match = similarity >= Config.SIMILARITY_THRESHOLD
        is_high_confidence = similarity >= Config.HIGH_CONFIDENCE

        return jsonify({
            "success": True,
            "data": {
                "similarity": round(similarity, 4),
                "is_match": is_match,
                "is_high_confidence": is_high_confidence,
                "person_id": person_id,
                "threshold": Config.SIMILARITY_THRESHOLD,
                "high_confidence_threshold": Config.HIGH_CONFIDENCE,
            },
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except ValueError as e:
        logger.warning("Face comparison failed: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        logger.error("Unexpected error in compare-face: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@face_bp.route("/api/detect-face", methods=["POST"])
def detect_face():
    """
    Detect faces in an uploaded image.

    Accepts:
        - Multipart form with 'image' file field
        - JSON with 'image_base64' field

    Returns:
        JSON with list of detected faces and bounding boxes.
    """
    try:
        image_path = None

        # Handle file upload
        if "image" in request.files:
            file = request.files["image"]
            is_valid, error = validate_image(file)
            if not is_valid:
                return jsonify({"success": False, "error": error}), 400

            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            file.save(temp.name)
            image_path = temp.name

        elif request.is_json and request.json.get("image_base64"):
            from utils.image_utils import base64_to_image

            base64_str = request.json["image_base64"]
            frame = base64_to_image(base64_str)
            temp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg", dir=Config.UPLOAD_FOLDER)
            import cv2
            cv2.imwrite(temp.name, frame)
            image_path = temp.name
        else:
            return jsonify({"success": False, "error": "No image provided."}), 400

        # Detect faces
        faces = face_service.detect_faces(image_path)

        # Get quality score
        quality_score = face_service.assess_quality(image_path)

        # Cleanup
        try:
            os.unlink(image_path)
        except OSError:
            pass

        return jsonify({
            "success": True,
            "data": {
                "faces": faces,
                "face_count": len(faces),
                "quality_score": round(quality_score, 4),
            },
        })

    except FileNotFoundError as e:
        return jsonify({"success": False, "error": str(e)}), 404
    except ValueError as e:
        logger.warning("Face detection failed: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        logger.error("Unexpected error in detect-face: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500
