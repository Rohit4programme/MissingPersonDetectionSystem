"""
Database Service - Handles MySQL database operations for missing person data,
face embeddings, and detection records.
"""

import logging
import uuid
from datetime import datetime

import pymysql
import pymysql.cursors

from config import Config

logger = logging.getLogger(__name__)


def _get_connection():
    """
    Create and return a new MySQL database connection.

    Returns:
        pymysql.Connection: Database connection with DictCursor.

    Raises:
        ConnectionError: If connection fails.
    """
    try:
        connection = pymysql.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            charset=Config.DB_CHARSET,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10,
            read_timeout=30,
            write_timeout=30,
            autocommit=True,
        )
        return connection
    except pymysql.Error as e:
        logger.error("Database connection failed: %s", str(e))
        raise ConnectionError(f"Failed to connect to database: {str(e)}")


def get_all_embeddings():
    """
    Query MySQL for all face embeddings stored in the database.

    Returns:
        dict: {person_id: embedding_list} for all missing persons with embeddings.
    """
    connection = None
    try:
        connection = _get_connection()
        with connection.cursor() as cursor:
            # Query for all active missing persons with face embeddings
            cursor.execute("""
                SELECT person_id, face_embedding
                FROM missing_persons
                WHERE face_embedding IS NOT NULL
                  AND face_embedding != ''
                  AND status = 'active'
            """)
            rows = cursor.fetchall()

        embeddings = {}
        for row in rows:
            person_id = str(row["person_id"])
            embedding_raw = row["face_embedding"]

            try:
                # Parse embedding - stored as JSON string or comma-separated
                if isinstance(embedding_raw, str):
                    if embedding_raw.startswith("["):
                        import json
                        embedding = json.loads(embedding_raw)
                    else:
                        embedding = [float(x) for x in embedding_raw.split(",")]
                elif isinstance(embedding_raw, (list, tuple)):
                    embedding = list(embedding_raw)
                else:
                    logger.warning("Unknown embedding format for person %s", person_id)
                    continue

                # Validate dimension
                if len(embedding) == Config.EMBEDDING_DIMENSION:
                    embeddings[person_id] = embedding
                else:
                    logger.warning(
                        "Embedding dimension mismatch for person %s: expected %d, got %d",
                        person_id, Config.EMBEDDING_DIMENSION, len(embedding),
                    )

            except (json.JSONDecodeError, ValueError) as e:
                logger.warning("Failed to parse embedding for person %s: %s", person_id, str(e))
                continue

        logger.info("Loaded %d face embeddings from database", len(embeddings))
        return embeddings

    except ConnectionError:
        raise
    except pymysql.Error as e:
        logger.error("Database query failed: %s", str(e))
        raise RuntimeError(f"Failed to query embeddings: {str(e)}")
    finally:
        if connection:
            connection.close()


def save_detection(person_id, camera_id, confidence, screenshot_path=None, location=None):
    """
    Save a face detection record to the database.

    Args:
        person_id: ID of the matched missing person.
        camera_id: Identifier of the camera that made the detection.
        confidence: Similarity/confidence score (0-1).
        screenshot_path: Optional path to the detection screenshot.
        location: Optional location description or coordinates.

    Returns:
        str: The detection ID of the saved record.

    Raises:
        RuntimeError: If saving fails.
    """
    connection = None
    try:
        detection_id = str(uuid.uuid4())
        connection = _get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO detections
                    (id, person_id, camera_id, confidence, screenshot_path, location, detected_at, status)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                detection_id,
                person_id,
                camera_id,
                confidence,
                screenshot_path,
                location,
                datetime.utcnow(),
                "new",
            ))

        logger.info(
            "Detection saved: id=%s, person=%s, camera=%s, confidence=%.4f",
            detection_id, person_id, camera_id, confidence,
        )
        return detection_id

    except pymysql.Error as e:
        logger.error("Failed to save detection: %s", str(e))
        raise RuntimeError(f"Failed to save detection record: {str(e)}")
    finally:
        if connection:
            connection.close()


def get_person(person_id):
    """
    Get missing person details by ID.

    Args:
        person_id: The person's unique identifier.

    Returns:
        dict: Person details or None if not found.

    Raises:
        RuntimeError: If query fails.
    """
    connection = None
    try:
        connection = _get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id, full_name, age, gender, date_of_birth,
                    last_seen_date, last_seen_location, description,
                    photo_url, face_embedding, status,
                    contact_info, created_at, updated_at
                FROM missing_persons
                WHERE id = %s
            """, (person_id,))

            person = cursor.fetchone()

            if person:
                # Convert datetime objects to strings for JSON serialization
                for key in ["date_of_birth", "last_seen_date", "created_at", "updated_at"]:
                    if person.get(key) and isinstance(person[key], datetime):
                        person[key] = person[key].isoformat()

                # Remove embedding from response (it's large)
                person.pop("face_embedding", None)
                logger.debug("Person found: %s", person.get("full_name"))
            else:
                logger.debug("Person not found: %s", person_id)

            return person

    except pymysql.Error as e:
        logger.error("Failed to get person %s: %s", person_id, str(e))
        raise RuntimeError(f"Failed to get person details: {str(e)}")
    finally:
        if connection:
            connection.close()


def get_person_embedding(person_id):
    """
    Get the face embedding for a specific person.

    Args:
        person_id: The person's unique identifier.

    Returns:
        list: Face embedding vector, or None if not found.
    """
    connection = None
    try:
        connection = _get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT face_embedding
                FROM missing_persons
                WHERE id = %s AND status = 'active'
            """, (person_id,))

            row = cursor.fetchone()
            if not row or not row.get("face_embedding"):
                return None

            embedding_raw = row["face_embedding"]
            if isinstance(embedding_raw, str):
                if embedding_raw.startswith("["):
                    import json
                    return json.loads(embedding_raw)
                else:
                    return [float(x) for x in embedding_raw.split(",")]

            return list(embedding_raw)

    except pymysql.Error as e:
        logger.error("Failed to get embedding for person %s: %s", person_id, str(e))
        return None
    finally:
        if connection:
            connection.close()


def save_embedding(person_id, embedding):
    """
    Save or update a person's face embedding in the database.

    Args:
        person_id: The person's unique identifier.
        embedding: Face embedding (list of floats).

    Returns:
        bool: True if saved successfully.
    """
    import json
    connection = None
    try:
        embedding_str = json.dumps(embedding)
        connection = _get_connection()
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE missing_persons
                SET face_embedding = %s, updated_at = %s
                WHERE id = %s
            """, (embedding_str, datetime.utcnow(), person_id))

            affected = cursor.rowcount
            if affected == 0:
                logger.warning("No person found with id %s to update embedding", person_id)
                return False

        logger.info("Embedding saved for person %s", person_id)
        return True

    except pymysql.Error as e:
        logger.error("Failed to save embedding for person %s: %s", person_id, str(e))
        return False
    finally:
        if connection:
            connection.close()


def get_recent_detections(person_id=None, limit=50):
    """
    Get recent detection records, optionally filtered by person.

    Args:
        person_id: Optional filter by person ID.
        limit: Maximum records to return.

    Returns:
        list: List of detection record dicts.
    """
    connection = None
    try:
        connection = _get_connection()
        with connection.cursor() as cursor:
            if person_id:
                cursor.execute("""
                    SELECT d.*, mp.full_name, mp.photo_url as person_photo
                    FROM detections d
                    LEFT JOIN missing_persons mp ON d.person_id = mp.id
                    WHERE d.person_id = %s
                    ORDER BY d.detected_at DESC
                    LIMIT %s
                """, (person_id, limit))
            else:
                cursor.execute("""
                    SELECT d.*, mp.full_name, mp.photo_url as person_photo
                    FROM detections d
                    LEFT JOIN missing_persons mp ON d.person_id = mp.id
                    ORDER BY d.detected_at DESC
                    LIMIT %s
                """, (limit,))

            detections = cursor.fetchall()

            # Serialize datetime objects
            for det in detections:
                if det.get("detected_at") and isinstance(det["detected_at"], datetime):
                    det["detected_at"] = det["detected_at"].isoformat()

            return detections

    except pymysql.Error as e:
        logger.error("Failed to get recent detections: %s", str(e))
        return []
    finally:
        if connection:
            connection.close()
