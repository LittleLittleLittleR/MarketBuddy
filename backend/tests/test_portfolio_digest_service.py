import asyncio
import pandas as pd
import app.services.portfolio_digest_service as digest_mod
from app.services.portfolio_digest_service import PortfolioDigestService


class FakeResp:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, data):
        self._data = data

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def in_(self, *a, **k):
        return self

    def order(self, *a, **k):
        return self

    async def execute(self):
        return FakeResp(self._data)


class FakeSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, name):
        return FakeQuery(self.tables.get(name, []))


def test_fetch_current_prices_single(monkeypatch):
    df = pd.DataFrame({"Open": [1.0], "Close": [42.0], "High": [1.0], "Low": [1.0]})
    monkeypatch.setattr(digest_mod.yf, "download", lambda *a, **k: df)

    svc = PortfolioDigestService(supabase_client=None)
    prices = asyncio.run(svc._fetch_current_prices(["aapl"]))

    assert prices == {"AAPL": 42.0}


def test_build_digest_uses_fresh_prices(monkeypatch):
    tables = {
        "portfolios": [{"id": 1}],
        "trades": [
            {
                "ticker": "AAPL",
                "side": "buy",
                "quantity": 10,
                "entry_cost": 100,
                "trade_date": "2026-07-01",
                "portfolio_id": 1,
            }
        ],
        "stocks": [{"ticker": "AAPL", "company_name": "Apple"}],
        "summaries": [],
    }

    async def fake_prices(self, tickers):
        return {"AAPL": 150.0}

    monkeypatch.setattr(
        PortfolioDigestService, "_fetch_current_prices", fake_prices
    )

    svc = PortfolioDigestService(supabase_client=FakeSupabase(tables))
    digest = asyncio.run(svc.build_digest("user-1", 7, 2026))

    assert len(digest.positions) == 1
    assert digest.positions[0].current_price == 150.0
    assert digest.total_pnl == 500.0
