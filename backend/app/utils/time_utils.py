from datetime import datetime, time, timedelta
import zoneinfo


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
