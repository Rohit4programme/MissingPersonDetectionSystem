"""
AI Face Recognition Microservice for Missing Person Detection System.

Main Flask application with CORS support, blueprint registration,
health check endpoint, and error handlers.
"""

import logging
import os
import sys

from flask import Flask, jsonify
from flask_cors import CORS

from config import get_config


def create_app():
    """
    Application factory: creates and configures the Flask app.

    Returns:
        Flask: Configured Flask application.
    """
    config = get_config()

    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config)

    # Enable CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    })

    # Set up logging
    _setup_logging(config)

    # Ensure required directories exist
    os.makedirs(config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(config.INDEX_PATH, exist_ok=True)
    os.makedirs(config.MODEL_PATH, exist_ok=True)

    logger = logging.getLogger(__name__)
    logger.info("AI Face Recognition Service starting...")
    logger.info("Model: %s, Threshold: %.2f", config.FACE_MODEL, config.SIMILARITY_THRESHOLD)

    # Register blueprints
    from routes.face_routes import face_bp
    from routes.cctv_routes import cctv_bp
    from routes.index_routes import index_bp

    app.register_blueprint(face_bp)
    app.register_blueprint(cctv_bp)
    app.register_blueprint(index_bp)

    # Health check endpoint
    @app.route("/health", methods=["GET"])
    def health_check():
        """Health check endpoint for container orchestration."""
        from services.index_service import get_index_stats

        index_stats = get_index_stats()

        return jsonify({
            "status": "healthy",
            "service": "ai-face-recognition",
            "version": "1.0.0",
            "model": config.FACE_MODEL,
            "thresholds": {
                "similarity": config.SIMILARITY_THRESHOLD,
                "high_confidence": config.HIGH_CONFIDENCE,
                "quality": config.QUALITY_THRESHOLD,
            },
            "index": {
                "loaded": index_stats.get("loaded", False),
                "count": index_stats.get("count", 0),
            },
        })

    # Detailed API health check
    @app.route("/api/health", methods=["GET"])
    def api_health_check():
        """Detailed health check with dependency status."""
        health = {
            "status": "healthy",
            "service": "ai-face-recognition",
            "version": "1.0.0",
            "checks": {},
        }
        status_code = 200

        # Check database connectivity
        try:
            from services.database_service import _get_connection
            conn = _get_connection()
            conn.close()
            health["checks"]["database"] = {"status": "healthy"}
        except Exception as e:
            health["checks"]["database"] = {
                "status": "unhealthy",
                "error": str(e),
            }
            status_code = 503

        # Check FAISS index
        try:
            from services.index_service import get_index_stats
            index_info = get_index_stats()
            health["checks"]["faiss_index"] = {
                "status": "healthy" if index_info.get("loaded") else "no_index",
                "vectors": index_info.get("count", 0),
            }
        except Exception as e:
            health["checks"]["faiss_index"] = {
                "status": "unhealthy",
                "error": str(e),
            }

        # Check face model availability
        try:
            health["checks"]["face_model"] = {
                "status": "healthy",
                "model": config.FACE_MODEL,
                "embedding_dim": config.EMBEDDING_DIMENSION,
            }
        except Exception as e:
            health["checks"]["face_model"] = {
                "status": "unhealthy",
                "error": str(e),
            }

        if status_code != 200:
            health["status"] = "degraded"

        return jsonify(health), status_code

    # Root endpoint
    @app.route("/", methods=["GET"])
    def root():
        """Service information endpoint."""
        return jsonify({
            "service": "Missing Person Detection - AI Face Recognition",
            "version": "1.0.0",
            "endpoints": {
                "health": "GET /health",
                "api_health": "GET /api/health",
                "generate_embedding": "POST /api/generate-embedding",
                "compare_face": "POST /api/compare-face",
                "detect_face": "POST /api/detect-face",
                "process_cctv": "POST /api/process-cctv",
                "start_stream": "POST /api/start-stream",
                "stop_stream": "POST /api/stop-stream",
                "stream_status": "GET /api/stream-status",
                "rebuild_index": "POST /api/rebuild-index",
                "add_person": "POST /api/add-person",
                "remove_person": "DELETE /api/remove-person",
                "index_stats": "GET /api/index-stats",
                "search_index": "POST /api/search-index",
            },
        })

    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error": "Bad request",
            "message": str(error.description),
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Not found",
            "message": str(error.description),
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": "Method not allowed",
            "message": str(error.description),
        }), 405

    @app.errorhandler(413)
    def payload_too_large(error):
        return jsonify({
            "success": False,
            "error": "Payload too large",
            "message": "File exceeds maximum allowed size (10MB)",
        }), 413

    @app.errorhandler(500)
    def internal_error(error):
        logger.error("Unhandled exception: %s", error, exc_info=True)
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred",
        }), 500

    @app.errorhandler(503)
    def service_unavailable(error):
        return jsonify({
            "success": False,
            "error": "Service unavailable",
            "message": str(error.description),
        }), 503

    # Try to load FAISS index on startup
    with app.app_context():
        try:
            from services.index_service import load_index
            loaded = load_index()
            if loaded:
                logger.info("FAISS index loaded from disk on startup")
            else:
                logger.info("No existing FAISS index found - will be created on first rebuild")
        except Exception as e:
            logger.warning("Could not load FAISS index on startup: %s", str(e))

    logger.info("Application configured successfully")
    return app


def _setup_logging(config):
    """Configure application logging."""
    log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
    log_format = config.LOG_FORMAT

    # Root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )

    # Suppress noisy library loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)


# Create the default application instance (used by gunicorn: app:app)
app = create_app()

if __name__ == "__main__":
    config = get_config()
    port = int(os.getenv("PORT", 5000))
    debug = config.DEBUG

    print(f"Starting AI Face Recognition Service on port {port}")
    print(f"Debug mode: {debug}")
    print(f"Model: {config.FACE_MODEL}")
    print(f"Similarity threshold: {config.SIMILARITY_THRESHOLD}")

    app.run(host="0.0.0.0", port=port, debug=debug)
