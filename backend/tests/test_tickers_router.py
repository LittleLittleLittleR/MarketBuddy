import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies.auth import get_current_user
from app.dependencies.redis_client import get_redis
import app.utils.ticker_validator as ticker_validator


class FakeRedis:
    def __init__(self):
        self.sadd_calls = []
        self.store = {}

    async def hmget(self, key, *fields):
        return [None for _ in fields]

    async def get(self, key):
        return self.store.get(key)

    async def set(self, key, val, ex=None, nx=None, **kwargs):
        self.store[key] = val
        return True

    async def delete(self, *keys):
        for key in keys:
            self.store.pop(key, None)

    async def sadd(self, key, *vals):
        self.sadd_calls.extend(vals)

    async def hmset(self, key, mapping):
        pass


@pytest.fixture
def fake_redis():
    redis = FakeRedis()
    app.dependency_overrides[get_current_user] = lambda: {"email": "test@test.com"}
    app.dependency_overrides[get_redis] = lambda: redis
    yield redis
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_redis, None)


def test_invalid_ticker_marked_and_not_persisted(fake_redis, monkeypatch):
    monkeypatch.setattr(ticker_validator, "_probe_ticker", lambda t: False)

    with TestClient(app) as client:
        resp = client.post("/api/tickers", json={"tickers": ["ZZZZFAKE"]})

    assert resp.status_code == 200
    assert resp.json()["prices"]["ZZZZFAKE"]["status"] == "INVALID"
    assert fake_redis.sadd_calls == []


def test_valid_ticker_persisted_as_pending(fake_redis, monkeypatch):
    monkeypatch.setattr(ticker_validator, "_probe_ticker", lambda t: True)

    async def _noop_scrape(self, tickers, is_clock_sweep=False):
        return {}

    monkeypatch.setattr(
        "app.services.ticker_worker.TickerScraperService.scrape_and_cache_batch",
        _noop_scrape,
    )

    with TestClient(app) as client:
        resp = client.post("/api/tickers", json={"tickers": ["AAPL"]})

    assert resp.status_code == 200
    assert resp.json()["prices"]["AAPL"]["status"] == "PENDING"
    assert "AAPL" in fake_redis.sadd_calls
