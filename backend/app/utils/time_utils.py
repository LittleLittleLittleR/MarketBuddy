from datetime import datetime, time, timedelta
import zoneinfo
import pandas_market_calendars as mcal
import pytz


def get_time_to_6am():
    SGT = zoneinfo.ZoneInfo("Asia/Singapore")
    TARGET_TIME = time(6, 0, 0)  # 6:00:00 AM

    while True:
        now = datetime.now(SGT)
        target = datetime.combine(now.date(), TARGET_TIME).replace(tzinfo=SGT)
        if now >= target:
            target += timedelta(days=1)
        seconds_until_target = int((target - now).total_seconds())
        return seconds_until_target


def is_market_open() -> bool:
    """
    Checks if the current time falls within standard US market hours:
    Monday - Friday, 9:30 AM to 4:00 PM Eastern Time.
    """
    ny_time = datetime.now(zoneinfo.ZoneInfo("America/New_York"))

    # check weekend
    if ny_time.weekday() >= 5:
        return False

    # extract hours and minutes for comparison
    current_time_float = ny_time.hour + (ny_time.minute / 60.0)

    if 9.5 <= current_time_float < 16.0:
        return True

    return False


def sg_time_now():
    """
    Returns SGT
    """

    return datetime.now(zoneinfo.ZoneInfo("Asia/Singapore"))


def seconds_until_market_open() -> float:
    """Returns seconds until the next NYSE market open, accounting for weekends/holidays."""
    eastern = pytz.timezone("America/New_York")
    now_et = datetime.now(eastern)

    nyse = mcal.get_calendar("NYSE")

    # Check the next 7 days for a valid trading session
    schedule = nyse.schedule(
        start_date=now_et.strftime("%Y-%m-%d"),
        end_date=(now_et + timedelta(days=7)).strftime("%Y-%m-%d"),
    )

    for _, row in schedule.iterrows():
        market_open_utc = row["market_open"].to_pydatetime()
        market_open_et = market_open_utc.astimezone(eastern)

        if market_open_et > now_et:
            delta = (market_open_et - now_et).total_seconds()
            return delta

    # fallback: sleep 1 hour and retry if no schedule found
    return 3600


def get_time_to_8am():
    SGT = zoneinfo.ZoneInfo("Asia/Singapore")
    TARGET_TIME = time(8, 0, 0)
    now = datetime.now(SGT)
    target = datetime.combine(now.date(), TARGET_TIME).replace(tzinfo=SGT)
    if now >= target:
        target += timedelta(days=1)
    return int((target - now).total_seconds())
