import time_machine
from app.utils.time_utils import is_market_open

# Tuesday, 10am ET (market open)
@time_machine.travel("2026-07-07 14:00") 
def test_market_open_during_hours():
    assert is_market_open() is True

# Saturday (market closed)
@time_machine.travel("2026-07-11 14:00") 
def test_market_closed_on_weekend():
    assert is_market_open() is False

# before 9:30am ET (market closed)
@time_machine.travel("2026-07-07 09:00")  
def test_market_closed_before_open():
    assert is_market_open() is False