"""
Index Management Blueprint - Routes for FAISS index operations.
"""

import logging
import traceback

from flask import Blueprint, jsonify, request

from config import Config
from services import index_service
from utils.validators import validate_embedding, validate_person_id

logger = logging.getLogger(__name__)

index_bp = Blueprint("index", __name__)


@index_bp.route("/api/rebuild-index", methods=["POST"])
def rebuild_index():
    """
    Rebuild the FAISS index from all embeddings in the database.

    Returns:
        JSON with rebuild statistics.
    """
    try:
        from services.database_service import get_all_embeddings

        logger.info("Starting FAISS index rebuild...")

        # Load all embeddings from database
        embeddings = get_all_embeddings()

        if not embeddings:
            return jsonify({
                "success": True,
                "data": {
                    "message": "No embeddings found in database",
                    "count": 0,
                    "dimension": Config.EMBEDDING_DIMENSION,
                },
            })

        # Build the index
        stats = index_service.build_index(embeddings)

        logger.info("FAISS index rebuilt successfully: %d vectors", stats["count"])

        return jsonify({
            "success": True,
            "data": {
                "message": f"Index rebuilt with {stats['count']} face embeddings",
                "count": stats["count"],
                "dimension": stats["dimension"],
                "index_path": stats["path"],
            },
        })

    except Exception as e:
        logger.error("Error rebuilding index: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": f"Failed to rebuild index: {str(e)}"}), 500


@index_bp.route("/api/add-person", methods=["POST"])
def add_person():
    """
    Add a person's face embedding to the FAISS index.

    Expects JSON body:
        {
            "person_id": "uuid-string",
            "embedding": [0.1, 0.2, ...]  // 128-dim vector
        }

    Returns:
        JSON with updated index statistics.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "JSON body required"}), 400

        person_id = request.json.get("person_id")
        embedding = request.json.get("embedding")

        # Validate inputs
        is_valid, error = validate_person_id(person_id)
        if not is_valid:
            return jsonify({"success": False, "error": error}), 400

        is_valid, error = validate_embedding(embedding)
        if not is_valid:
            return jsonify({"success": False, "error": error}), 400

        # Add to index
        stats = index_service.add_to_index(person_id, embedding)

        logger.info("Person %s added to FAISS index", person_id)

        return jsonify({
            "success": True,
            "data": {
                "message": f"Person {person_id} added to index",
                "person_id": stats["person_id"],
                "total_count": stats["count"],
                "dimension": stats["dimension"],
            },
        })

    except ValueError as e:
        logger.warning("Failed to add person to index: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error("Error adding person to index: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@index_bp.route("/api/remove-person", methods=["DELETE"])
def remove_person():
    """
    Remove a person from the FAISS index.

    Expects JSON body:
        {
            "person_id": "uuid-string"
        }

    Returns:
        JSON with updated index statistics.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "JSON body required"}), 400

        person_id = request.json.get("person_id")

        is_valid, error = validate_person_id(person_id)
        if not is_valid:
            return jsonify({"success": False, "error": error}), 400

        stats = index_service.remove_from_index(person_id)

        logger.info("Person %s removed from FAISS index", person_id)

        return jsonify({
            "success": True,
            "data": {
                "message": f"Person {person_id} removed from index",
                "person_id": person_id,
                "total_count": stats["count"],
                "dimension": stats["dimension"],
            },
        })

    except ValueError as e:
        logger.warning("Failed to remove person from index: %s", str(e))
        return jsonify({"success": False, "error": str(e)}), 404
    except Exception as e:
        logger.error("Error removing person from index: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500


@index_bp.route("/api/index-stats", methods=["GET"])
def get_index_stats():
    """
    Get statistics about the current FAISS index.

    Returns:
        JSON with index statistics.
    """
    try:
        stats = index_service.get_index_stats()

        return jsonify({
            "success": True,
            "data": stats,
        })

    except Exception as e:
        logger.error("Error getting index stats: %s", str(e))
        return jsonify({"success": False, "error": "Internal server error"}), 500


@index_bp.route("/api/search-index", methods=["POST"])
def search_index():
    """
    Search the FAISS index for similar faces.

    Expects JSON body:
        {
            "embedding": [0.1, 0.2, ...],
            "top_k": 5  // optional
        }

    Returns:
        JSON with top-k matches.
    """
    try:
        if not request.is_json:
            return jsonify({"success": False, "error": "JSON body required"}), 400

        embedding = request.json.get("embedding")
        top_k = request.json.get("top_k", 5)

        is_valid, error = validate_embedding(embedding)
        if not is_valid:
            return jsonify({"success": False, "error": error}), 400

        results = index_service.search_index(embedding, top_k=top_k)

        return jsonify({
            "success": True,
            "data": {
                "results": results,
                "result_count": len(results),
                "top_k": top_k,
                "threshold": Config.SIMILARITY_THRESHOLD,
            },
        })

    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        logger.error("Error searching index: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"success": False, "error": "Internal server error"}), 500
