"""
Validation utilities for input data.
"""

import logging

logger = logging.getLogger(__name__)

# Allowed MIME types for images
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/bmp",
    "image/tiff",
    "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_image(file):
    """
    Validate that an uploaded file is a valid image within size limits.

    Args:
        file: Flask file object (werkzeug FileStorage).

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if file is None:
        return False, "No file provided"

    if file.filename is None or file.filename.strip() == "":
        return False, "No file selected"

    # Check file extension
    allowed_extensions = {"png", "jpg", "jpeg", "bmp", "tiff", "webp"}
    if "." not in file.filename:
        return False, "File has no extension"

    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in allowed_extensions:
        return False, f"File type '.{ext}' not allowed. Allowed: {', '.join(allowed_extensions)}"

    # Check MIME type if content_type is available
    if hasattr(file, "content_type") and file.content_type:
        if file.content_type not in ALLOWED_MIME_TYPES:
            logger.warning("Suspicious MIME type: %s for file %s", file.content_type, file.filename)

    # Check file size
    file.seek(0, 2)  # Seek to end
    file_size = file.tell()
    file.seek(0)  # Reset to beginning

    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        max_mb = MAX_FILE_SIZE / (1024 * 1024)
        return False, f"File too large: {size_mb:.1f}MB. Maximum: {max_mb:.0f}MB"

    if file_size == 0:
        return False, "File is empty"

    logger.debug("Image validation passed: %s (%d bytes)", file.filename, file_size)
    return True, None


def validate_confidence(score):
    """
    Validate that a confidence score is between 0 and 1.

    Args:
        score: The confidence score to validate.

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if score is None:
        return False, "Confidence score is required"

    try:
        score = float(score)
    except (TypeError, ValueError):
        return False, f"Confidence must be a number, got: {type(score).__name__}"

    if score < 0.0 or score > 1.0:
        return False, f"Confidence must be between 0.0 and 1.0, got: {score}"

    return True, None


def validate_embedding(embedding):
    """
    Validate that an embedding is a valid vector.

    Args:
        embedding: The embedding to validate (list or numpy array).

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if embedding is None:
        return False, "Embedding is required"

    if not isinstance(embedding, (list, tuple)):
        return False, "Embedding must be a list or array"

    if len(embedding) == 0:
        return False, "Embedding is empty"

    expected_dim = 128
    if len(embedding) != expected_dim:
        return False, f"Embedding dimension mismatch: expected {expected_dim}, got {len(embedding)}"

    try:
        for i, val in enumerate(embedding):
            float(val)
    except (TypeError, ValueError):
        return False, f"Embedding contains non-numeric value at index {i}"

    return True, None


def validate_person_id(person_id):
    """
    Validate that a person ID is provided and reasonable.

    Args:
        person_id: The person ID to validate.

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if person_id is None:
        return False, "Person ID is required"

    if isinstance(person_id, str) and person_id.strip() == "":
        return False, "Person ID cannot be empty"

    return True, None


def validate_rtsp_url(url):
    """
    Validate that an RTSP URL is properly formatted.

    Args:
        url: The RTSP URL to validate.

    Returns:
        tuple: (is_valid: bool, error_message: str or None)
    """
    if url is None or url.strip() == "":
        return False, "RTSP URL is required"

    if not url.startswith(("rtsp://", "rtmp://", "http://", "https://")):
        return False, "URL must start with rtsp://, rtmp://, http://, or https://"

    return True, None
