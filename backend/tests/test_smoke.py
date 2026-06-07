from fastapi.testclient import TestClient

from app.main import app


def test_app_imports_and_root_route_works():
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"root": "welcome to MarketBuddy"}