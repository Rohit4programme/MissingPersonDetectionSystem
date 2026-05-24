"""
CCTV API Blueprint - Routes for CCTV frame processing, stream management.
"""

import logging
import os
import tempfile
import traceback

import cv2
from flask import Blueprint, jsonify, request

from config import Config
from services import cctv_service, face_service
from utils.image_utils import load_image
from utils.validators import validate_image, validate_rtsp_url, validate_person_id

logger = logging.getLogger(__name__)

cctv_bp = Blueprint("cctv", __name__)


@cctv_bp.route("/api/process-cctv", methods=["POST"])
def process_cctv():
    """
    Process a single CCTV frame/image and match against all known faces.

    Accepts:
        - Multipart form with 'image' file field
        - JSON with 'image_base64' field

    Returns:
        JSON with list of matches found.
    """
    try:
        frame = None

        # Handle file upload
        if "image" in request.files:
            file = request.files["image"]
            is_valid, error = validate_image(file)
            if not is_valid:
                return jsonify({"success": False, "error": error}), 400

            file_bytes = file.read()
            frame = load_image(file_bytes)

        # Handle base64 input
        elif request.is_json and request.json.get("image_base64"):
            from utils.image_utils import base64_to_image
            base64_str = request.json["image_base64"]
            frame = base64_to_image(base64_str)
        else:
            return jsonify({
                "success": False,
                "error": "No image provided. Send as 'image' file or 'image_base64' JSON field.",
            }), 400

        # Load known embeddings from database or index
        known_embeddings = {}
        try:
            from services.index_service import get_index_stats, search_index
            from services.database_service import get_all_embeddings

            # Try loading from database
            known_embeddings = get_all_embeddings()
        except Exception as e:
            logger.warning("Could not load embeddings from database: %s", str(e))

        if not known_embeddings:
            return jsonify({
                "success": True,
                "data": {
                    "matches": [],
                    "faces_detected": 0,
                    "message": "No known face embeddings in database. Add missing persons first.",
                },
            })

        # Process the frame
        matches = cctv_service.process_frame(frame, known_embeddings)

        # Also count total detected faces
        faces = face_service.detect_faces(frame)

        return jsonify({
            "success": True,
            "data": {
                "matches": matches,
                "match_count": len(matches),
                "faces_detected": len(faces),
                "known_faces_in_db": len(known_embeddings),
                "threshold": Config.SIMILARITY_THRESHOLD,
            },
        })

    except ValueError as e:
        logger.warning("CCTV processing failed: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 422
    except Exception as e:
        logger.error("Unexpected error in process-cctv: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@cctv_bp.route("/api/start-stream", methods=["POST"])
def start_stream():
    """
    Start processing an RTSP video stream in the background.

    Expects JSON body:
        {
            "rtsp_url": "rtsp://...",
            "camera_id": "camera-1",
            "frame_skip": 5  // optional
        }

    Returns:
        JSON with stream status.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "JSON body required"}), 400

        data = request.json
        rtsp_url = data.get("rtsp_url")
        camera_id = data.get("camera_id")
        frame_skip = data.get("frame_skip")

        # Validate inputs
        is_valid, error = validate_rtsp_url(rtsp_url)
        if not is_valid:
            return jsonify({"success": False, "error": error}), 400

        is_valid, error = validate_person_id(camera_id)
        if not is_valid:
            return jsonify({"success": False, "error": "camera_id is required"}), 400

        # Define the detection callback
        def on_detection(match, frame):
            """Called when a face match is found in the stream."""
            try:
                from services.database_service import save_detection

                # Save screenshot
                screenshot_path = None
                try:
                    screenshot_dir = os.path.join(Config.UPLOAD_FOLDER, "detections")
                    os.makedirs(screenshot_dir, exist_ok=True)
                    import uuid
                    filename = f"{uuid.uuid4().hex}.jpg"
                    screenshot_path = os.path.join(screenshot_dir, filename)
                    cv2.imwrite(screenshot_path, frame)
                except Exception as e:
                    logger.warning("Failed to save detection screenshot: %s", str(e))

                # Save detection record
                save_detection(
                    person_id=match["person_id"],
                    camera_id=match["camera_id"],
                    confidence=match["similarity"],
                    screenshot_path=screenshot_path,
                )
                logger.info(
                    "Detection callback: person=%s, camera=%s, similarity=%.4f",
                    match["person_id"], match["camera_id"], match["similarity"],
                )
            except Exception as e:
                logger.error("Detection callback error: %s", str(e))

        # Start the stream
        status = cctv_service.process_rtsp_stream(
            rtsp_url=rtsp_url,
            camera_id=camera_id,
            callback=on_detection,
            frame_skip=frame_skip,
        )

        return jsonify({
            "success": True,
            "data": status,
        })

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error("Unexpected error starting stream: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@cctv_bp.route("/api/stop-stream", methods=["POST"])
def stop_stream():
    """
    Stop a running RTSP stream processor.

    Expects JSON body:
        {
            "camera_id": "camera-1"
        }

    Returns:
        JSON with stop confirmation.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "JSON body required"}), 400

        camera_id = request.json.get("camera_id")
        if not camera_id:
            return jsonify({"success": False, "error": "camera_id is required"}), 400

        stopped = cctv_service.stop_stream(camera_id)

        if stopped:
            return jsonify({
                "success": True,
                "data": {
                    "camera_id": camera_id,
                    "status": "stopped",
                },
            })
        else:
            return jsonify({
                "success": False,
                "error": f"No active stream found for camera_id: {camera_id}",
            }), 404

    except Exception as e:
        logger.error("Error stopping stream: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@cctv_bp.route("/api/stream-status", methods=["GET"])
def stream_status():
    """
    Get the status of all active RTSP stream processors.

    Returns:
        JSON with list of active stream statuses.
    """
    try:
        statuses = cctv_service.get_all_stream_statuses()

        return jsonify({
            "success": True,
            "data": {
                "active_streams": len(statuses),
                "max_streams": Config.MAX_STREAMS,
                "streams": statuses,
            },
        })

    except Exception as e:
        logger.error("Error getting stream status: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500
