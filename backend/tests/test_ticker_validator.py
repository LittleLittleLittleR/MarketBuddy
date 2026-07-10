import pytest
from fastapi import HTTPException
from app.utils.ticker_validator import validate_ticker

@pytest.mark.parametrize("raw,expected", [
    ("aapl", "AAPL"),
    ("BRK.B", "BRK.B"),
    ("brk-a", "BRK-A"),
])
def test_valid_tickers_uppercased(raw, expected):
    assert validate_ticker(raw) == expected

@pytest.mark.parametrize("bad", [
    "AAPL; DROP", "../../etc/passwd", "AAPL\r\nSET x", "", "A"*11, "AAPL$",
])
def test_rejects_injection_and_invalid_input(bad):
    with pytest.raises(HTTPException) as exc:
        validate_ticker(bad)
    assert exc.value.status_code == 400