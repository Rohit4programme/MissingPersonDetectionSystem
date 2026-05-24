"""
CCTV Processing Service - Handles real-time video stream processing,
frame analysis, and face matching against a known database.
"""

import logging
import threading
import time
from collections import defaultdict

import cv2
import numpy as np

from config import Config
from services import face_service

logger = logging.getLogger(__name__)

# Global registry of active streams
_active_streams = {}
_stream_lock = threading.Lock()


class StreamProcessor:
    """
    Processes an RTSP video stream, detects and matches faces against known embeddings.

    Attributes:
        rtsp_url: RTSP stream URL.
        camera_id: Identifier for the camera.
        known_embeddings: Dict of {person_id: embedding_list}.
        frame_skip: Process every Nth frame.
        callback: Function called when a match is found.
        running: Whether the processor is active.
    """

    def __init__(self, rtsp_url, camera_id, known_embeddings, callback=None, frame_skip=None):
        self.rtsp_url = rtsp_url
        self.camera_id = camera_id
        self.known_embeddings = known_embeddings or {}
        self.callback = callback
        self.frame_skip = frame_skip or Config.FRAME_SKIP
        self.running = False
        self._thread = None
        self._cap = None
        self._frame_count = 0
        self._detection_count = 0
        self._last_error = None
        self._started_at = None

    def start(self):
        """Start the stream processing in a background thread."""
        if self.running:
            logger.warning("Stream %s is already running", self.camera_id)
            return False

        self.running = True
        self._started_at = time.time()
        self._thread = threading.Thread(target=self._process_loop, daemon=True)
        self._thread.start()

        logger.info("Stream processor started: camera=%s, url=%s", self.camera_id, self.rtsp_url)
        return True

    def stop(self):
        """Stop the stream processing."""
        self.running = False
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        if self._thread is not None:
            self._thread.join(timeout=10)
            self._thread = None
        logger.info("Stream processor stopped: camera=%s", self.camera_id)

    def get_status(self):
        """Return current status of the stream processor."""
        uptime = None
        if self._started_at:
            uptime = time.time() - self._started_at

        return {
            "camera_id": self.camera_id,
            "rtsp_url": self.rtsp_url,
            "running": self.running,
            "frame_count": self._frame_count,
            "detection_count": self._detection_count,
            "frame_skip": self.frame_skip,
            "uptime_seconds": uptime,
            "last_error": self._last_error,
            "known_faces": len(self.known_embeddings),
        }

    def update_embeddings(self, known_embeddings):
        """Update the known face embeddings."""
        self.known_embeddings = known_embeddings or {}
        logger.info("Updated embeddings for stream %s: %d faces", self.camera_id, len(self.known_embeddings))

    def _process_loop(self):
        """Main processing loop running in background thread."""
        logger.info("Entering process loop for camera %s", self.camera_id)

        try:
            self._cap = cv2.VideoCapture(self.rtsp_url)
            if not self._cap.isOpened():
                self._last_error = f"Failed to open stream: {self.rtsp_url}"
                logger.error(self._last_error)
                self.running = False
                return

            while self.running:
                ret, frame = self._cap.read()
                if not ret:
                    logger.warning("Failed to read frame from camera %s, retrying...", self.camera_id)
                    time.sleep(1)
                    # Try to reconnect
                    self._cap.release()
                    self._cap = cv2.VideoCapture(self.rtsp_url)
                    if not self._cap.isOpened():
                        self._last_error = "Stream reconnection failed"
                        logger.error("Reconnection failed for camera %s", self.camera_id)
                        break
                    continue

                self._frame_count += 1

                # Skip frames for performance
                if self._frame_count % self.frame_skip != 0:
                    continue

                try:
                    matches = process_frame(frame, self.known_embeddings)
                    if matches:
                        self._detection_count += len(matches)
                        logger.info(
                            "Camera %s: %d match(es) on frame %d",
                            self.camera_id, len(matches), self._frame_count,
                        )
                        if self.callback:
                            for match in matches:
                                match["camera_id"] = self.camera_id
                                match["frame_number"] = self._frame_count
                                try:
                                    self.callback(match, frame)
                                except Exception as cb_err:
                                    logger.error("Callback error: %s", str(cb_err))

                except Exception as e:
                    self._last_error = str(e)
                    logger.error("Error processing frame from camera %s: %s", self.camera_id, str(e))

        except Exception as e:
            self._last_error = str(e)
            logger.error("Stream processor fatal error for camera %s: %s", self.camera_id, str(e))
        finally:
            self.running = False
            if self._cap is not None:
                self._cap.release()
            logger.info("Process loop ended for camera %s", self.camera_id)


def process_frame(frame, known_embeddings):
    """
    Process a single video frame: detect faces, generate embeddings, compare against known faces.

    Args:
        frame: OpenCV BGR frame (numpy.ndarray).
        known_embeddings: Dict of {person_id: embedding_list}.

    Returns:
        list: List of match dicts:
              [{"person_id": str, "similarity": float, "bbox": dict, "confidence": float}, ...]
    """
    try:
        # Detect faces in the frame
        faces = face_service.detect_faces(frame)

        if not faces:
            return []

        matches = []
        for face_info in faces:
            try:
                # Extract face region
                face_img = extract_face(frame, face_info)
                if face_img is None:
                    continue

                # Generate embedding for the detected face
                try:
                    embedding = face_service.generate_embedding(face_img)
                except ValueError as e:
                    logger.debug("Could not generate embedding for detected face: %s", str(e))
                    continue

                # Compare against all known embeddings
                best_match = None
                best_similarity = 0.0

                for person_id, known_emb in known_embeddings.items():
                    try:
                        similarity = face_service.compare_faces(embedding, known_emb)
                        if similarity > best_similarity:
                            best_similarity = similarity
                            best_match = person_id
                    except Exception:
                        continue

                # Check if best match exceeds threshold
                if best_match and best_similarity >= Config.SIMILARITY_THRESHOLD:
                    match = {
                        "person_id": best_match,
                        "similarity": round(best_similarity, 4),
                        "bbox": {
                            "x": face_info["x"],
                            "y": face_info["y"],
                            "w": face_info["w"],
                            "h": face_info["h"],
                        },
                        "confidence": round(face_info.get("confidence", 0.0), 4),
                        "is_high_confidence": best_similarity >= Config.HIGH_CONFIDENCE,
                    }
                    matches.append(match)
                    logger.info(
                        "Match found: person=%s, similarity=%.4f",
                        best_match, best_similarity,
                    )

            except Exception as e:
                logger.warning("Error processing detected face: %s", str(e))
                continue

        return matches

    except Exception as e:
        logger.error("Error processing frame: %s", str(e), exc_info=True)
        return []


def process_rtsp_stream(rtsp_url, camera_id, callback, frame_skip=None):
    """
    Start processing an RTSP stream in a background thread.

    Args:
        rtsp_url: RTSP stream URL.
        camera_id: Identifier for the camera.
        callback: Function called with (match_dict, frame) on detection.
        frame_skip: Process every Nth frame (default: from config).

    Returns:
        dict: Stream status information.

    Raises:
        ValueError: If max streams exceeded or stream already exists.
    """
    with _stream_lock:
        if camera_id in _active_streams and _active_streams[camera_id].running:
            raise ValueError(f"Stream '{camera_id}' is already active")

        if len([s for s in _active_streams.values() if s.running]) >= Config.MAX_STREAMS:
            raise ValueError(f"Maximum number of streams ({Config.MAX_STREAMS}) reached")

        # Load current embeddings from database
        try:
            from services.database_service import get_all_embeddings
            known_embeddings = get_all_embeddings()
        except Exception as e:
            logger.warning("Failed to load embeddings from database: %s", str(e))
            known_embeddings = {}

        processor = StreamProcessor(
            rtsp_url=rtsp_url,
            camera_id=camera_id,
            known_embeddings=known_embeddings,
            callback=callback,
            frame_skip=frame_skip,
        )
        _active_streams[camera_id] = processor

    processor.start()
    return processor.get_status()


def extract_face(frame, bbox):
    """
    Extract and preprocess a face region from a video frame.

    Args:
        frame: OpenCV BGR frame (numpy.ndarray).
        bbox: Bounding box dict with keys: x, y, w, h.

    Returns:
        numpy.ndarray: Preprocessed face image (BGR), or None if extraction fails.
    """
    try:
        x = int(bbox.get("x", 0))
        y = int(bbox.get("y", 0))
        w = int(bbox.get("w", 0))
        h = int(bbox.get("h", 0))

        if w <= 0 or h <= 0:
            logger.warning("Invalid bounding box: x=%d, y=%d, w=%d, h=%d", x, y, w, h)
            return None

        # Add 20% padding around face
        pad_w = int(w * 0.2)
        pad_h = int(h * 0.2)

        frame_h, frame_w = frame.shape[:2]
        x1 = max(0, x - pad_w)
        y1 = max(0, y - pad_h)
        x2 = min(frame_w, x + w + pad_w)
        y2 = min(frame_h, y + h + pad_h)

        face_img = frame[y1:y2, x1:x2]

        if face_img.size == 0:
            logger.warning("Extracted face region is empty")
            return None

        # Resize to standard size for consistent embedding
        face_img = cv2.resize(face_img, (160, 160), interpolation=cv2.INTER_AREA)

        return face_img

    except Exception as e:
        logger.error("Error extracting face: %s", str(e))
        return None


def stop_stream(camera_id):
    """
    Stop an active stream by camera ID.

    Args:
        camera_id: Identifier of the stream to stop.

    Returns:
        bool: True if stopped, False if not found.
    """
    with _stream_lock:
        processor = _active_streams.get(camera_id)
        if processor is None:
            return False
        processor.stop()
        return True


def get_all_stream_statuses():
    """
    Get status of all active streams.

    Returns:
        list: List of stream status dicts.
    """
    with _stream_lock:
        return [p.get_status() for p in _active_streams.values()]


def stop_all_streams():
    """Stop all active streams."""
    with _stream_lock:
        for processor in _active_streams.values():
            processor.stop()
    logger.info("All streams stopped")
