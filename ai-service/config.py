"""
Configuration module for AI Face Recognition Microservice.
Loads settings from environment variables with sensible defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "ai-service-secret-key-change-in-production")
    DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    # Database (MySQL)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "missing_person_db")
    DB_CHARSET = os.getenv("DB_CHARSET", "utf8mb4")

    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_DB = int(os.getenv("REDIS_DB", 0))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

    # Celery
    CELERY_BROKER_URL = os.getenv(
        "CELERY_BROKER_URL",
        f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
    )
    CELERY_RESULT_BACKEND = os.getenv(
        "CELERY_RESULT_BACKEND",
        f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"
    )

    # Model Settings
    FACE_MODEL = os.getenv("FACE_MODEL", "Facenet")
    DETECTOR_BACKEND = os.getenv("DETECTOR_BACKEND", "opencv")
    EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", 128))
    MODEL_PATH = os.getenv("MODEL_PATH", "./models")

    # Index Settings
    INDEX_PATH = os.getenv("INDEX_PATH", "./indexes")
    FAISS_INDEX_FILE = os.getenv("FAISS_INDEX_FILE", "face_index.faiss")
    FAISS_MAPPING_FILE = os.getenv("FAISS_MAPPING_FILE", "id_mapping.json")

    # Thresholds
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", 0.70))
    HIGH_CONFIDENCE = float(os.getenv("HIGH_CONFIDENCE", 0.85))
    QUALITY_THRESHOLD = float(os.getenv("QUALITY_THRESHOLD", 0.5))

    # Image Settings
    MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", 10 * 1024 * 1024))  # 10MB
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "tiff", "webp"}
    MAX_FACE_DIMENSION = int(os.getenv("MAX_FACE_DIMENSION", 1024))
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")

    # CCTV Settings
    FRAME_SKIP = int(os.getenv("FRAME_SKIP", 5))  # Process every Nth frame
    RTSP_TIMEOUT = int(os.getenv("RTSP_TIMEOUT", 30))  # seconds
    MAX_STREAMS = int(os.getenv("MAX_STREAMS", 10))

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = os.getenv(
        "LOG_FORMAT",
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # AWS (optional)
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET = os.getenv("S3_BUCKET")

    @classmethod
    def get_db_config(cls):
        """Return database connection configuration dict."""
        return {
            "host": cls.DB_HOST,
            "port": cls.DB_PORT,
            "user": cls.DB_USER,
            "password": cls.DB_PASSWORD,
            "database": cls.DB_NAME,
            "charset": cls.DB_CHARSET,
            "cursorclass": "pymysql.cursors.DictCursor",
        }


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DB_NAME = "missing_person_db_test"


# Configuration map
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    """Get configuration based on FLASK_ENV environment variable."""
    env = os.getenv("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
