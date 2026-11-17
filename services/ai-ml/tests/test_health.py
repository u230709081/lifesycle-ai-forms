
from fastapi.testclient import TestClient

from app.main import app


# Create an HTTP test client for our FastAPI application
client = TestClient(app)


def test_health():
    # Send a GET request to the health endpoint
    response = client.get("/ml/health")

    # Verify that the request succeeded
    assert response.status_code == 200

    # Verify that the returned JSON matches our contract
    assert response.json() == {
        "status": "ok",
        "service": "ai-ml"
    }
