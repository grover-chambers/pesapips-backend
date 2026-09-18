"""
Market Hours Service — PesaPips
Detects whether Forex/Gold markets are currently open.
Forex: Opens Sunday 22:00 UTC, Closes Friday 22:00 UTC
Gold (XAU): Follows Forex hours
Crypto: 24/7
"""
from datetime import datetime, timezone, time
from typing import Tuple


ALWAYS_OPEN = {"BTCUSD", "ETHUSD", "ADAUSD"}

SESSIONS = {
    "Sydney":  {"open": 22, "close": 7,  "days": range(0, 5)},
    "Tokyo":   {"open": 0,  "close": 9,  "days": range(0, 5)},
    "London":  {"open": 8,  "close": 17, "days": range(0, 5)},
    "New York":{"open": 13, "close": 22, "days": range(0, 5)},
}


def is_market_open(symbol: str = "XAUUSD") -> Tuple[bool, str]:
    """
    Returns (is_open, reason_string)
    """
    if symbol.upper() in ALWAYS_OPEN:
        return True, "Crypto — 24/7"

    now = datetime.now(timezone.utc)
    dow = now.weekday()  # 0=Mon, 6=Sun
    hour = now.hour
    minute = now.minute

    # Weekend: Friday 22:00 UTC to Sunday 22:00 UTC
    # Friday = 4, Saturday = 5, Sunday = 6
    if dow == 5:  # Saturday — fully closed
        return False, "Weekend — market closed (reopens Sunday 22:00 UTC)"

    if dow == 4 and hour >= 22:  # Friday after 22:00 UTC
        return False, "Weekend — market closed (reopens Sunday 22:00 UTC)"

    if dow == 6 and hour < 22:  # Sunday before 22:00 UTC
        return False, "Weekend — market closed (reopens Sunday 22:00 UTC)"

    # Check for low liquidity periods (between NY close and Sydney open)
    # 22:00 - 22:30 UTC is rollover — avoid trading
    if hour == 22 and minute < 30 and dow not in (4, 6):
        return False, "Market rollover period (22:00-22:30 UTC) — paused"

    return True, "Market open"


def get_active_sessions(symbol: str = "XAUUSD") -> list:
    """Returns list of currently active trading sessions."""
    if symbol.upper() in ALWAYS_OPEN:
        return ["24/7"]

    # If market is closed, return empty
    open_, _ = is_market_open(symbol)
    if not open_:
        return []

    now  = datetime.now(timezone.utc)
    dow  = now.weekday()
    hour = now.hour
    active = []

    session_hours = {
        "Sydney":   (22, 7),
        "Tokyo":    (0,  9),
        "London":   (8,  17),
        "New York": (13, 22),
    }

    for name, (open_h, close_h) in session_hours.items():
        if open_h < close_h:
            if open_h <= hour < close_h:
                active.append(name)
        else:  # crosses midnight
            if hour >= open_h or hour < close_h:
                active.append(name)

    return active if active else ["Off-hours"]


def next_open_utc() -> str:
    """Returns human-readable string for when market next opens."""
    now = datetime.now(timezone.utc)
    dow = now.weekday()
    hour = now.hour

    if dow == 5:  # Saturday
        hours_left = (6 - dow) * 24 + (22 - hour)
        return f"Sunday at 22:00 UTC (~{int((2-0)*24 + (22-hour))}h)"
    if dow == 4 and hour >= 22:
        return "Sunday at 22:00 UTC"
    if dow == 6 and hour < 22:
        hours_left = 22 - hour
        return f"Today at 22:00 UTC (~{hours_left}h)"
    return "Now"
