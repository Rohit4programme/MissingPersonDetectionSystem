"""
Face Recognition Service - Core face detection, embedding generation, and comparison.
Uses DeepFace with Facenet model by default.
"""

import logging
import os

import cv2
import numpy as np
from scipy.spatial.distance import cosine

logger = logging.getLogger(__name__)

# Lazy-loaded model cache
_deepface = None
_face_detector = None


def _get_deepface():
    """Lazy import and initialize DeepFace."""
    global _deepface
    if _deepface is None:
        try:
            from deepface import DeepFace
            _deepface = DeepFace
            logger.info("DeepFace loaded successfully")
        except ImportError as e:
            logger.error("Failed to import DeepFace: %s", str(e))
            raise
    return _deepface


def _get_face_detector():
    """Lazy load OpenCV Haar cascade face detector as fallback."""
    global _face_detector
    if _face_detector is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _face_detector = cv2.CascadeClassifier(cascade_path)
        logger.info("OpenCV Haar cascade face detector loaded")
    return _face_detector


def generate_embedding(image_path, model_name="Facenet", detector_backend="opencv"):
    """
    Generate a face embedding vector from an image.

    Uses DeepFace with the specified model (default: Facenet).
    If multiple faces are detected, the largest face is selected.
    Falls back to OpenCV Haar cascade + manual preprocessing if DeepFace fails.

    Args:
        image_path: Path to the image file or numpy array (BGR).
        model_name: DeepFace model name (default: Facenet).
        detector_backend: Face detector backend (default: opencv).

    Returns:
        list: 128-dimensional embedding as list of floats.

    Raises:
        ValueError: If no face is detected or embedding generation fails.
    """
    try:
        deepface = _get_deepface()

        # Ensure we have a file path (DeepFace needs a path or numpy array)
        if isinstance(image_path, str):
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            img_input = image_path
        elif isinstance(image_path, np.ndarray):
            img_input = image_path
        else:
            raise ValueError(f"Unsupported image input type: {type(image_path)}")

        # Use DeepFace to represent (generate embedding)
        try:
            embeddings = deepface.represent(
                img_path=img_input,
                model_name=model_name,
                detector_backend=detector_backend,
                enforce_detection=True,
                align=True,
            )
        except Exception as deepface_error:
            logger.warning(
                "DeepFace embedding failed, attempting fallback: %s",
                str(deepface_error),
            )
            return _fallback_embedding(image_path)

        if not embeddings or len(embeddings) == 0:
            logger.warning("DeepFace returned no embeddings, attempting fallback")
            return _fallback_embedding(image_path)

        # If multiple faces, pick the one with the largest area
        if len(embeddings) > 1:
            logger.info("Multiple faces detected (%d), selecting largest", len(embeddings))
            # DeepFace represent returns list of dicts with 'embedding' and 'face_area'
            best = max(embeddings, key=lambda e: e.get("face_area", 0))
            embedding = best["embedding"]
        else:
            embedding = embeddings[0]["embedding"]

        # Normalize to 128 dimensions if needed (Facenet outputs 128-dim)
        embedding = _normalize_embedding(embedding, target_dim=128)

        logger.info("Embedding generated: %d dimensions", len(embedding))
        return [float(x) for x in embedding]

    except FileNotFoundError:
        raise
    except ValueError:
        raise
    except Exception as e:
        logger.error("Error generating embedding: %s", str(e), exc_info=True)
        raise ValueError(f"Failed to generate embedding: {str(e)}")


def _fallback_embedding(image_path):
    """
    Fallback embedding generation using OpenCV face detection and a simple feature vector.

    This is used when DeepFace fails (e.g., model download issues).
    Note: These embeddings are NOT compatible with DeepFace embeddings.

    Args:
        image_path: Path to image or numpy array.

    Returns:
        list: 128-dimensional feature vector.
    """
    logger.info("Using fallback embedding generation")

    if isinstance(image_path, str):
        img = cv2.imread(image_path)
    else:
        img = image_path.copy()

    if img is None:
        raise ValueError("Failed to load image for fallback embedding")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    detector = _get_face_detector()
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    if len(faces) == 0:
        raise ValueError("No face detected in image (fallback detector)")

    # Pick largest face
    faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
    x, y, w, h = faces[0]

    # Extract and preprocess face
    face_roi = gray[y:y+h, x:x+w]
    face_roi = cv2.resize(face_roi, (160, 160))
    face_roi = face_roi.astype(np.float32) / 255.0

    # Create a simple feature vector (histogram + LBP-like features)
    embedding = []

    # Histogram features (64 bins)
    hist = cv2.calcHist([face_roi], [0], None, [64], [0, 1]).flatten()
    hist = hist / (hist.sum() + 1e-7)
    embedding.extend(hist.tolist())

    # Spatial features (divide into 4x4 grid, compute mean and std for each = 32 features)
    grid_size = 4
    cell_h = face_roi.shape[0] // grid_size
    cell_w = face_roi.shape[1] // grid_size
    for i in range(grid_size):
        for j in range(grid_size):
            cell = face_roi[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
            embedding.append(float(cell.mean()))
            embedding.append(float(cell.std()))

    # Pad or trim to 128
    embedding = embedding[:128]
    while len(embedding) < 128:
        embedding.append(0.0)

    return embedding


def _normalize_embedding(embedding, target_dim=128):
    """
    Normalize embedding to target dimensionality.

    Args:
        embedding: Input embedding vector.
        target_dim: Desired output dimension.

    Returns:
        list: Normalized embedding.
    """
    emb = list(embedding)
    if len(emb) == target_dim:
        return emb
    elif len(emb) > target_dim:
        # Truncate
        return emb[:target_dim]
    else:
        # Pad with zeros
        return emb + [0.0] * (target_dim - len(emb))


def compare_faces(embedding1, embedding2):
    """
    Compute cosine similarity between two face embeddings.

    Args:
        embedding1: First embedding (list of floats).
        embedding2: Second embedding (list of floats).

    Returns:
        float: Similarity score between 0 and 1 (1 = identical).

    Raises:
        ValueError: If embeddings have different dimensions.
    """
    try:
        emb1 = np.array(embedding1, dtype=np.float32)
        emb2 = np.array(embedding2, dtype=np.float32)

        if emb1.shape != emb2.shape:
            raise ValueError(
                f"Embedding dimensions mismatch: {emb1.shape} vs {emb2.shape}"
            )

        # Cosine similarity = 1 - cosine_distance
        similarity = 1.0 - cosine(emb1, emb2)

        # Clamp to [0, 1]
        similarity = max(0.0, min(1.0, similarity))

        logger.debug("Face comparison: similarity=%.4f", similarity)
        return float(similarity)

    except ValueError:
        raise
    except Exception as e:
        logger.error("Error comparing faces: %s", str(e))
        raise ValueError(f"Failed to compare faces: {str(e)}")


def batch_compare(target_embedding, database_embeddings):
    """
    Compare one target embedding against many database embeddings.

    Args:
        target_embedding: The query embedding (list of floats).
        database_embeddings: Dict of {person_id: embedding_list}.

    Returns:
        list: List of (person_id, similarity) tuples, sorted by similarity descending.
    """
    try:
        target = np.array(target_embedding, dtype=np.float32)
        results = []

        for person_id, db_embedding in database_embeddings.items():
            try:
                similarity = compare_faces(target, db_embedding)
                results.append((person_id, similarity))
            except Exception as e:
                logger.warning(
                    "Failed to compare with person %s: %s", person_id, str(e)
                )
                continue

        # Sort by similarity descending
        results.sort(key=lambda x: x[1], reverse=True)

        logger.info("Batch compare: %d results computed", len(results))
        return results

    except Exception as e:
        logger.error("Error in batch compare: %s", str(e))
        raise ValueError(f"Batch comparison failed: {str(e)}")


def detect_faces(image_path, detector_backend="opencv"):
    """
    Detect all faces in an image and return bounding boxes.

    Args:
        image_path: Path to image file or numpy array.
        detector_backend: DeepFace detector backend (default: opencv).

    Returns:
        list: List of dicts with face bounding boxes:
              [{"x": int, "y": int, "w": int, "h": int, "confidence": float}, ...]
    """
    try:
        deepface = _get_deepface()

        if isinstance(image_path, str):
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            img = cv2.imread(image_path)
        elif isinstance(image_path, np.ndarray):
            img = image_path.copy()
        else:
            raise ValueError(f"Unsupported input type: {type(image_path)}")

        if img is None:
            raise ValueError("Failed to load image")

        # Try DeepFace detection first
        try:
            detections = deepface.extract_faces(
                img_path=img,
                detector_backend=detector_backend,
                enforce_detection=False,
                align=True,
            )
        except Exception as e:
            logger.warning("DeepFace detection failed, using fallback: %s", str(e))
            return _fallback_detect_faces(img)

        faces = []
        for detection in detections:
            if detection is None:
                continue

            # DeepFace returns dict with 'facial_area' key
            area = detection.get("facial_area", {})
            if area:
                face_info = {
                    "x": int(area.get("x", 0)),
                    "y": int(area.get("y", 0)),
                    "w": int(area.get("w", 0)),
                    "h": int(area.get("h", 0)),
                    "confidence": float(detection.get("confidence", 0.0)),
                }
                faces.append(face_info)

        logger.info("Detected %d face(s) in image", len(faces))
        return faces

    except (FileNotFoundError, ValueError):
        raise
    except Exception as e:
        logger.error("Error detecting faces: %s", str(e), exc_info=True)
        # Try fallback
        if isinstance(image_path, np.ndarray):
            return _fallback_detect_faces(image_path)
        elif isinstance(image_path, str):
            img = cv2.imread(image_path)
            if img is not None:
                return _fallback_detect_faces(img)
        raise ValueError(f"Face detection failed: {str(e)}")


def _fallback_detect_faces(img):
    """
    Fallback face detection using OpenCV Haar cascade.

    Args:
        img: numpy.ndarray BGR image.

    Returns:
        list: Face bounding boxes.
    """
    logger.info("Using fallback Haar cascade face detection")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    detector = _get_face_detector()
    rects = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

    faces = []
    for (x, y, w, h) in rects:
        faces.append({
            "x": int(x),
            "y": int(y),
            "w": int(w),
            "h": int(h),
            "confidence": 0.85,  # Haar cascade doesn't provide confidence
        })

    return faces


def enhance_image(image_path):
    """
    Basic image enhancement for low-quality images.

    Applies contrast enhancement (CLAHE), brightness adjustment, and denoising.

    Args:
        image_path: Path to image or numpy array.

    Returns:
        numpy.ndarray: Enhanced image in BGR format.
    """
    try:
        if isinstance(image_path, str):
            img = cv2.imread(image_path)
        elif isinstance(image_path, np.ndarray):
            img = image_path.copy()
        else:
            raise ValueError(f"Unsupported input type: {type(image_path)}")

        if img is None:
            raise ValueError("Failed to load image for enhancement")

        # Convert to LAB color space for CLAHE
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)

        # Apply CLAHE to the L (lightness) channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l_channel)

        # Merge and convert back
        enhanced_lab = cv2.merge([l_enhanced, a_channel, b_channel])
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

        # Denoise
        enhanced = cv2.fastNlMeansDenoisingColored(enhanced, None, h=6, hForColoredImage=6, templateWindowSize=7, searchWindowSize=21)

        logger.info("Image enhancement complete")
        return enhanced

    except Exception as e:
        logger.error("Error enhancing image: %s", str(e))
        raise ValueError(f"Image enhancement failed: {str(e)}")


def assess_quality(image_path):
    """
    Assess the quality of an image for face recognition purposes.

    Quality is based on:
    - Blur detection (Laplacian variance)
    - Brightness (mean pixel intensity)
    - Face size relative to image

    Args:
        image_path: Path to image or numpy array.

    Returns:
        float: Quality score between 0.0 and 1.0.
    """
    try:
        if isinstance(image_path, str):
            img = cv2.imread(image_path)
        elif isinstance(image_path, np.ndarray):
            img = image_path.copy()
        else:
            raise ValueError(f"Unsupported input type: {type(image_path)}")

        if img is None:
            raise ValueError("Failed to load image for quality assessment")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        scores = []

        # 1. Blur detection using Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        # Normalize: typical good images have variance > 100, blurry < 50
        blur_score = min(1.0, laplacian_var / 200.0)
        scores.append(blur_score)
        logger.debug("Blur score: %.4f (laplacian_var=%.2f)", blur_score, laplacian_var)

        # 2. Brightness assessment
        mean_brightness = gray.mean()
        # Ideal brightness is around 100-150 (out of 255)
        if mean_brightness < 40:
            brightness_score = mean_brightness / 40.0 * 0.5
        elif mean_brightness > 220:
            brightness_score = (255.0 - mean_brightness) / 35.0 * 0.5
        else:
            brightness_score = 1.0
        scores.append(brightness_score)
        logger.debug("Brightness score: %.4f (mean=%.2f)", brightness_score, mean_brightness)

        # 3. Face size assessment
        try:
            faces = detect_faces(img)
            if faces:
                # Check size of largest face relative to image
                img_area = img.shape[0] * img.shape[1]
                largest_face = max(faces, key=lambda f: f["w"] * f["h"])
                face_area = largest_face["w"] * largest_face["h"]
                face_ratio = face_area / img_area

                # Face should be at least 1% of image for good recognition
                face_size_score = min(1.0, face_ratio / 0.05)
                scores.append(face_size_score)
                logger.debug("Face size score: %.4f (ratio=%.4f)", face_size_score, face_ratio)
            else:
                scores.append(0.0)
                logger.debug("No faces detected for quality assessment")
        except Exception:
            scores.append(0.3)  # Neutral score if face detection fails

        # Weighted average
        weights = [0.4, 0.3, 0.3]  # blur, brightness, face size
        quality_score = sum(s * w for s, w in zip(scores, weights[:len(scores)]))
        quality_score = max(0.0, min(1.0, quality_score))

        logger.info("Image quality score: %.4f", quality_score)
        return float(quality_score)

    except Exception as e:
        logger.error("Error assessing image quality: %s", str(e))
        raise ValueError(f"Quality assessment failed: {str(e)}")
