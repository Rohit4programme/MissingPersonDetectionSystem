"""
Missing Person Detection System - AI Service Tests
Run with: pytest tests/ -v
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock


# ──────────────────────────── Config Tests ────────────────────────────

class TestConfig:
    def test_default_thresholds(self):
        from config import Config
        assert Config.SIMILARITY_THRESHOLD == 0.70
        assert Config.HIGH_CONFIDENCE == 0.85
        assert Config.QUALITY_THRESHOLD == 0.50

    def test_model_path_exists(self):
        from config import Config
        assert hasattr(Config, 'MODEL_PATH')
        assert hasattr(Config, 'FACE_DATA_PATH')


# ──────────────────────────── Image Utils Tests ────────────────────────────

class TestImageUtils:
    def test_resize_image_maintains_aspect_ratio(self):
        """Resize should maintain aspect ratio within max_size."""
        import cv2
        from utils.image_utils import resize_image

        # Create a test image 200x100
        img = np.zeros((100, 200, 3), dtype=np.uint8)
        result = resize_image(img, max_size=100)

        h, w = result.shape[:2]
        assert max(h, w) <= 100
        # Aspect ratio preserved: 200/100 = 2.0
        assert abs(w / h - 2.0) < 0.1

    def test_image_to_base64_returns_string(self):
        import cv2
        from utils.image_utils import image_to_base64

        img = np.zeros((100, 100, 3), dtype=np.uint8)
        result = image_to_base64(img)

        assert isinstance(result, str)
        assert len(result) > 0

    def test_save_and_load_image(self, tmp_path):
        import cv2
        from utils.image_utils import save_image, load_image

        img = np.zeros((100, 100, 3), dtype=np.uint8)
        path = str(tmp_path / "test.jpg")

        save_image(img, path)
        loaded = load_image(path)

        assert loaded is not None
        assert loaded.shape == img.shape


# ──────────────────────────── Validator Tests ────────────────────────────

class TestValidators:
    def test_valid_confidence_score(self):
        from utils.validators import validate_confidence
        assert validate_confidence(0.5) == True
        assert validate_confidence(0.0) == True
        assert validate_confidence(1.0) == True

    def test_invalid_confidence_score(self):
        from utils.validators import validate_confidence
        assert validate_confidence(-0.1) == False
        assert validate_confidence(1.1) == False


# ──────────────────────────── Face Service Tests ────────────────────────────

class TestFaceService:
    @patch('services.face_service.DeepFace')
    def test_generate_embedding_returns_list(self, mock_deepface):
        """Embedding generation should return a list of floats."""
        mock_deepface.represent.return_value = [
            {"embedding": [0.1] * 128}
        ]

        from services.face_service import generate_embedding
        result = generate_embedding("test_image.jpg")

        assert isinstance(result, list)
        assert len(result) == 128
        assert all(isinstance(v, float) for v in result)

    def test_compare_faces_identical(self):
        """Identical embeddings should have similarity ~1.0."""
        from services.face_service import compare_faces

        emb = [0.5] * 128
        similarity = compare_faces(emb, emb)

        assert similarity > 0.99

    def test_compare_faces_orthogonal(self):
        """Orthogonal vectors should have low similarity."""
        from services.face_service import compare_faces

        emb1 = [1.0] + [0.0] * 127
        emb2 = [0.0] * 127 + [1.0]
        similarity = compare_faces(emb1, emb2)

        assert similarity < 0.1

    def test_compare_faces_similar(self):
        """Similar embeddings should have high similarity."""
        from services.face_service import compare_faces

        np.random.seed(42)
        base = np.random.randn(128).tolist()
        noise = (np.array(base) + np.random.randn(128) * 0.01).tolist()
        similarity = compare_faces(base, noise)

        assert similarity > 0.90

    @patch('services.face_service.DeepFace')
    def test_assess_quality_returns_score(self, mock_deepface):
        """Quality assessment should return a float 0-1."""
        from services.face_service import assess_quality

        # Create a test image
        test_img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)

        with patch('services.face_service.cv2.imread', return_value=test_img):
            score = assess_quality("test.jpg")

        assert isinstance(score, float)
        assert 0 <= score <= 1

    def test_batch_compare_returns_sorted_results(self):
        """Batch comparison should return results sorted by similarity."""
        from services.face_service import batch_compare

        target = [0.5] * 128
        database = {
            1: [0.1] * 128,
            2: [0.5] * 128,  # identical
            3: [0.3] * 128,
        }

        results = batch_compare(target, database)

        assert len(results) == 3
        # Should be sorted by similarity descending
        for i in range(len(results) - 1):
            assert results[i][1] >= results[i + 1][1]


# ──────────────────────────── Index Service Tests ────────────────────────────

class TestIndexService:
    def test_build_and_search_index(self, tmp_path):
        """Building an index and searching should return correct results."""
        import faiss

        # Create test embeddings
        embeddings = {
            1: np.random.randn(128).tolist(),
            2: np.random.randn(128).tolist(),
            3: np.random.randn(128).tolist(),
        }

        from services.index_service import build_index, search_index

        with patch('services.index_service.INDEX_PATH', str(tmp_path / "test.index")):
            build_index(embeddings)
            results = search_index(embeddings[2], top_k=3)

        assert len(results) <= 3
        # Best match should be person 2
        if len(results) > 0:
            assert results[0][0] == 2


# ──────────────────────────── CCTV Service Tests ────────────────────────────

class TestCCTVService:
    @patch('services.cctv_service.face_service')
    def test_process_frame_returns_matches(self, mock_face_service):
        """Processing a frame should return list of matches."""
        mock_face_service.detect_faces.return_value = [(10, 10, 50, 50)]
        mock_face_service.generate_embedding.return_value = [0.5] * 128
        mock_face_service.batch_compare.return_value = [(1, 0.92)]

        from services.cctv_service import process_frame

        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        known = {1: [0.5] * 128}

        matches = process_frame(frame, known)

        assert isinstance(matches, list)

    def test_extract_face_returns_cropped_region(self):
        """Face extraction should return a cropped image."""
        from services.cctv_service import extract_face

        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        bbox = (100, 100, 200, 200)

        face = extract_face(frame, bbox)

        assert face is not None
        assert face.shape[0] > 0
        assert face.shape[1] > 0


# ──────────────────────────── API Route Tests ────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        response = client.get('/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'


# ──────────────────────────── Fixtures ────────────────────────────

@pytest.fixture
def client():
    """Create a Flask test client."""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_embedding():
    """Generate a sample 128-dim embedding."""
    np.random.seed(42)
    return np.random.randn(128).tolist()
