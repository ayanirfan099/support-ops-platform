from fastapi.testclient import TestClient

from supportops_intelligence.main import app


def test_health_is_explicitly_liveness_only() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "intelligence",
        "milestone": "M1",
    }
