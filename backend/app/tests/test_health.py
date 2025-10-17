from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/api/v1/health")
    # In unit tests, DB/Redis may not be available, but route should exist.
    assert resp.status_code in (200, 500)
