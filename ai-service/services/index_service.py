"""
FAISS Index Service - Manages a FAISS index for fast approximate nearest-neighbor
search of face embeddings.
"""

import json
import logging
import os
import threading

import faiss
import numpy as np

from config import Config

logger = logging.getLogger(__name__)

# Module-level state
_index = None
_id_mapping = {}  # {faiss_internal_id: person_id}
_reverse_mapping = {}  # {person_id: faiss_internal_id}
_next_id = 0
_index_lock = threading.Lock()


def _get_index_path():
    """Get the full path for the FAISS index file."""
    os.makedirs(Config.INDEX_PATH, exist_ok=True)
    return os.path.join(Config.INDEX_PATH, Config.FAISS_INDEX_FILE)


def _get_mapping_path():
    """Get the full path for the ID mapping file."""
    os.makedirs(Config.INDEX_PATH, exist_ok=True)
    return os.path.join(Config.INDEX_PATH, Config.FAISS_MAPPING_FILE)


def build_index(embeddings_dict):
    """
    Build a FAISS flat L2 index from a dict of embeddings.

    Args:
        embeddings_dict: Dict of {person_id: embedding_list}.

    Returns:
        dict: Index statistics (count, dimension, path).
    """
    global _index, _id_mapping, _reverse_mapping, _next_id

    with _index_lock:
        if not embeddings_dict:
            logger.warning("No embeddings provided to build index")
            _index = None
            _id_mapping = {}
            _reverse_mapping = {}
            _next_id = 0
            return {"count": 0, "dimension": Config.EMBEDDING_DIMENSION, "path": _get_index_path()}

        # Convert to arrays
        person_ids = list(embeddings_dict.keys())
        vectors = np.array([embeddings_dict[pid] for pid in person_ids], dtype=np.float32)

        if vectors.ndim != 2:
            raise ValueError(f"Expected 2D array, got shape {vectors.shape}")

        dimension = vectors.shape[1]
        count = vectors.shape[0]

        # Normalize vectors for cosine similarity (use inner product index)
        faiss.normalize_L2(vectors)

        # Build flat inner product index (equivalent to cosine similarity after normalization)
        index = faiss.IndexFlatIP(dimension)

        # Add vectors
        index.add(vectors)

        # Update mappings
        _id_mapping = {}
        _reverse_mapping = {}
        for i, person_id in enumerate(person_ids):
            _id_mapping[i] = person_id
            _reverse_mapping[person_id] = i

        _next_id = count
        _index = index

        # Save to disk
        _save_index()

        logger.info("FAISS index built: %d vectors, dimension=%d", count, dimension)
        return {
            "count": count,
            "dimension": dimension,
            "path": _get_index_path(),
        }


def search_index(embedding, top_k=5):
    """
    Search the FAISS index for the closest matches to a query embedding.

    Args:
        embedding: Query embedding (list of floats).
        top_k: Number of top matches to return.

    Returns:
        list: List of dicts with 'person_id', 'similarity', and 'distance'.
              Sorted by similarity descending.
    """
    global _index

    with _index_lock:
        if _index is None:
            # Try to load from disk
            if not load_index():
                logger.warning("No FAISS index available for search")
                return []

        if _index.ntotal == 0:
            return []

        # Prepare query vector
        query = np.array([embedding], dtype=np.float32)
        faiss.normalize_L2(query)

        # Search
        k = min(top_k, _index.ntotal)
        distances, indices = _index.search(query, k)

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for empty slots
                continue
            person_id = _id_mapping.get(idx)
            if person_id is None:
                continue

            # For IndexFlatIP, distance is the inner product (cosine similarity after normalization)
            similarity = float(dist)

            results.append({
                "person_id": person_id,
                "similarity": round(max(0.0, min(1.0, similarity)), 4),
                "distance": round(float(1.0 - similarity), 4),
                "faiss_index": int(idx),
            })

        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)

        logger.debug("Index search: top_k=%d, returned %d results", top_k, len(results))
        return results


def add_to_index(person_id, embedding):
    """
    Add a new person embedding to the existing FAISS index.

    Args:
        person_id: Unique person identifier.
        embedding: Face embedding (list of floats).

    Returns:
        dict: Updated index statistics.

    Raises:
        ValueError: If person already exists in index.
    """
    global _index, _next_id

    with _index_lock:
        # Check if person already exists
        if person_id in _reverse_mapping:
            # Remove old entry first
            _remove_person_internal(person_id)

        # Ensure index exists
        if _index is None:
            dimension = len(embedding)
            _index = faiss.IndexFlatIP(dimension)

        # Prepare vector
        vector = np.array([embedding], dtype=np.float32)
        faiss.normalize_L2(vector)

        # Add to index
        _index.add(vector)

        # Update mappings
        _id_mapping[_next_id] = person_id
        _reverse_mapping[person_id] = _next_id
        _next_id += 1

        # Save to disk
        _save_index()

        logger.info("Person %s added to index (total: %d)", person_id, _index.ntotal)
        return {
            "count": _index.ntotal,
            "dimension": _index.d,
            "person_id": person_id,
        }


def remove_from_index(person_id):
    """
    Remove a person from the FAISS index.

    Note: FAISS IndexFlat does not support efficient removal.
    We rebuild the index without the removed person.

    Args:
        person_id: Person identifier to remove.

    Returns:
        dict: Updated index statistics.

    Raises:
        ValueError: If person not found in index.
    """
    global _index, _next_id

    with _index_lock:
        if person_id not in _reverse_mapping:
            raise ValueError(f"Person '{person_id}' not found in index")

        _remove_person_internal(person_id)
        _save_index()

        count = _index.ntotal if _index else 0
        logger.info("Person %s removed from index (total: %d)", person_id, count)
        return {
            "count": count,
            "dimension": _index.d if _index else Config.EMBEDDING_DIMENSION,
            "person_id": person_id,
        }


def _remove_person_internal(person_id):
    """
    Internal: Remove a person by rebuilding the index without them.

    Must be called within _index_lock.
    """
    global _index, _id_mapping, _reverse_mapping, _next_id

    if _index is None or _index.ntotal == 0:
        return

    faiss_idx = _reverse_mapping.pop(person_id, None)
    if faiss_idx is None:
        return

    # Collect all remaining vectors
    remaining_ids = []
    remaining_vectors = []

    for idx, pid in list(_id_mapping.items()):
        if pid == person_id:
            continue
        # Reconstruct vector from index
        vec = _index.reconstruct(idx)
        remaining_ids.append(pid)
        remaining_vectors.append(vec)

    # Rebuild index
    if remaining_vectors:
        vectors = np.array(remaining_vectors, dtype=np.float32)
        dimension = vectors.shape[1]
        new_index = faiss.IndexFlatIP(dimension)
        new_index.add(vectors)

        # Rebuild mappings
        _id_mapping = {}
        _reverse_mapping = {}
        for i, pid in enumerate(remaining_ids):
            _id_mapping[i] = pid
            _reverse_mapping[pid] = i

        _next_id = len(remaining_ids)
        _index = new_index
    else:
        # Index is now empty
        _index = None
        _id_mapping = {}
        _reverse_mapping = {}
        _next_id = 0


def load_index():
    """
    Load a FAISS index from disk.

    Returns:
        bool: True if loaded successfully, False otherwise.
    """
    global _index, _id_mapping, _reverse_mapping, _next_id

    with _index_lock:
        index_path = _get_index_path()
        mapping_path = _get_mapping_path()

        if not os.path.exists(index_path) or not os.path.exists(mapping_path):
            logger.info("No saved FAISS index found on disk")
            return False

        try:
            _index = faiss.read_index(index_path)

            with open(mapping_path, "r") as f:
                data = json.load(f)

            _id_mapping = {int(k): v for k, v in data.get("id_mapping", {}).items()}
            _reverse_mapping = {v: k for k, v in _id_mapping.items()}
            _next_id = data.get("next_id", max(_id_mapping.keys(), default=-1) + 1)

            logger.info("FAISS index loaded: %d vectors", _index.ntotal)
            return True

        except Exception as e:
            logger.error("Failed to load FAISS index: %s", str(e))
            _index = None
            _id_mapping = {}
            _reverse_mapping = {}
            _next_id = 0
            return False


def _save_index():
    """
    Save the current FAISS index and mappings to disk.

    Must be called within _index_lock.
    """
    try:
        index_path = _get_index_path()
        mapping_path = _get_mapping_path()

        os.makedirs(os.path.dirname(index_path), exist_ok=True)

        if _index is not None:
            faiss.write_index(_index, index_path)

        with open(mapping_path, "w") as f:
            json.dump({
                "id_mapping": {str(k): v for k, v in _id_mapping.items()},
                "next_id": _next_id,
            }, f, indent=2)

        logger.debug("FAISS index saved to disk")

    except Exception as e:
        logger.error("Failed to save FAISS index: %s", str(e))


def get_index_stats():
    """
    Get statistics about the current index.

    Returns:
        dict: Index statistics.
    """
    with _index_lock:
        if _index is None:
            return {
                "loaded": False,
                "count": 0,
                "dimension": Config.EMBEDDING_DIMENSION,
            }
        return {
            "loaded": True,
            "count": _index.ntotal,
            "dimension": _index.d,
            "person_ids": list(_reverse_mapping.keys()),
        }
