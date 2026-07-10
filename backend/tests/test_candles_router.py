from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.routers.candles import get_candle_service

app.dependency_overrides[get_current_user] = lambda: {"email": "test@test.com"}

def test_invalid_ticker_returns_400():
    with TestClient(app) as client:
        resp = client.get("/api/tickers/../etc/candles")
    assert resp.status_code == 400

def test_invalid_range_returns_400():
    class FakeService:
        async def get_candles(self, *a, **kw): return []
    app.dependency_overrides[get_candle_service] = lambda: FakeService()
    with TestClient(app) as client:
        resp = client.get("/api/tickers/AAPL/candles?range=5Y")
    assert resp.status_code == 400

def test_missing_auth_returns_401(monkeypatch):
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as client:
        resp = client.get("/api/tickers/AAPL/candles")
    assert resp.status_code in (401, 403)