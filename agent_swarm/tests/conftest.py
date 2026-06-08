import pytest
import sys
import os

# Make sure agent-swarm root is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from tools.vector_search import seed_fake_incidents

@pytest.fixture(scope="session", autouse=True)
def seed_database():
    """Runs once before all tests in the session."""
    seed_fake_incidents()