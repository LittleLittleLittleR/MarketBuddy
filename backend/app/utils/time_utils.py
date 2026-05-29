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
