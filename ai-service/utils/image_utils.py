"""
Image utility functions for loading, saving, resizing, and encoding images.
"""

import base64
import logging
import os
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def load_image(path_or_bytes):
    """
    Load an image from a file path or bytes buffer.

    Args:
        path_or_bytes: File path (str) or bytes/BytesIO object.

    Returns:
        numpy.ndarray: Image in BGR format (OpenCV convention).

    Raises:
        ValueError: If image cannot be loaded.
    """
    try:
        if isinstance(path_or_bytes, (bytes, bytearray)):
            # Decode from bytes
            nparr = np.frombuffer(path_or_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(path_or_bytes, BytesIO):
            path_or_bytes.seek(0)
            nparr = np.frombuffer(path_or_bytes.read(), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif isinstance(path_or_bytes, str):
            # Load from file path
            if not os.path.exists(path_or_bytes):
                raise FileNotFoundError(f"Image file not found: {path_or_bytes}")
            frame = cv2.imread(path_or_bytes)
        else:
            raise ValueError(f"Unsupported input type: {type(path_or_bytes)}")

        if frame is None:
            raise ValueError("Failed to decode image - file may be corrupted or unsupported format")

        logger.debug("Image loaded successfully: shape=%s", frame.shape)
        return frame

    except (FileNotFoundError, ValueError):
        raise
    except Exception as e:
        logger.error("Error loading image: %s", str(e))
        raise ValueError(f"Failed to load image: {str(e)}")


def save_image(frame, path):
    """
    Save an OpenCV frame to disk.

    Args:
        frame: numpy.ndarray image in BGR format.
        path: Destination file path.

    Returns:
        str: The path where the image was saved.

    Raises:
        ValueError: If saving fails.
    """
    try:
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)

        success = cv2.imwrite(path, frame)
        if not success:
            raise ValueError(f"cv2.imwrite failed for path: {path}")

        logger.debug("Image saved to: %s", path)
        return path

    except Exception as e:
        logger.error("Error saving image to %s: %s", path, str(e))
        raise ValueError(f"Failed to save image: {str(e)}")


def resize_image(frame, max_size=1024):
    """
    Resize an image maintaining aspect ratio so the longest side is at most max_size.

    Args:
        frame: numpy.ndarray image.
        max_size: Maximum dimension for the longest side.

    Returns:
        numpy.ndarray: Resized image.
    """
    try:
        h, w = frame.shape[:2]

        if max(h, w) <= max_size:
            return frame

        if h > w:
            ratio = max_size / h
            new_h = max_size
            new_w = int(w * ratio)
        else:
            ratio = max_size / w
            new_w = max_size
            new_h = int(h * ratio)

        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
        logger.debug("Image resized from (%d, %d) to (%d, %d)", w, h, new_w, new_h)
        return resized

    except Exception as e:
        logger.error("Error resizing image: %s", str(e))
        return frame


def image_to_base64(frame):
    """
    Convert an OpenCV frame to a base64 encoded string.

    Args:
        frame: numpy.ndarray image in BGR format.

    Returns:
        str: Base64 encoded image string with data URI prefix.
    """
    try:
        _, buffer = cv2.imencode(".jpg", frame)
        jpg_as_text = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{jpg_as_text}"

    except Exception as e:
        logger.error("Error converting image to base64: %s", str(e))
        raise ValueError(f"Failed to convert image to base64: {str(e)}")


def base64_to_image(base64_string):
    """
    Convert a base64 string back to an OpenCV frame.

    Args:
        base64_string: Base64 encoded image (with or without data URI prefix).

    Returns:
        numpy.ndarray: Image in BGR format.
    """
    try:
        # Strip data URI prefix if present
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]

        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Failed to decode base64 image")

        return frame

    except Exception as e:
        logger.error("Error decoding base64 image: %s", str(e))
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


def crop_face(frame, bbox, padding=0.2):
    """
    Crop a face region from a frame with optional padding.

    Args:
        frame: numpy.ndarray image.
        bbox: Tuple of (x, y, w, h) bounding box.
        padding: Fraction of padding around the face.

    Returns:
        numpy.ndarray: Cropped face image.
    """
    try:
        h, w = frame.shape[:2]
        x, y, bw, bh = bbox

        # Add padding
        pad_w = int(bw * padding)
        pad_h = int(bh * padding)

        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(w, x + bw + pad_w)
        y2 = min(h, y + bh + pad_h)

        cropped = frame[y1:y2, x1:x2]
        logger.debug("Face cropped: bbox=(%d,%d,%d,%d), result shape=%s", x, y, bw, bh, cropped.shape)
        return cropped

    except Exception as e:
        logger.error("Error cropping face: %s", str(e))
        raise ValueError(f"Failed to crop face: {str(e)}")
