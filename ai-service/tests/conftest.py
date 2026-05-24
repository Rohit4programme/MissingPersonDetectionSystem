"""
Pytest configuration for AI Service tests
"""

import sys
import os
import pytest

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
