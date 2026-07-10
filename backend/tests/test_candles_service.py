import json
import pytest
from unittest.mock import AsyncMock, patch
from app.services.candles_service import CandleService

@pytest.mark.asyncio
async def test_intraday_cache_hit_skips_yfinance():
    redis = AsyncMock()
    redis.get.return_value = json.dumps([{"time": 1, "open": 1, "high": 1, "low": 1, "close": 1, "volume": 1}])
    service = CandleService(redis_client=redis, supabase=AsyncMock())

    with patch("app.services.candles_service._fetch_candles_sync") as mock_fetch:
        result = await service.get_candles("AAPL", "1D")

    mock_fetch.assert_not_called()
    assert len(result) == 1

@pytest.mark.asyncio
async def test_get_candles_rejects_unknown_range():
    service = CandleService(redis_client=AsyncMock(), supabase=AsyncMock())
    with pytest.raises(ValueError):
        await service.get_candles("AAPL", "5Y")