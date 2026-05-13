"""
News Filter — pauses autorun trading around high-impact economic events.
Uses the ForexFactory calendar scraper to detect upcoming events.
"""
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("news_filter")

NEWS_PAUSE_BEFORE_MIN = 60
NEWS_PAUSE_AFTER_MIN = 30
CURRENCIES_TO_WATCH = ["USD", "EUR", "GBP"]
CACHE_TTL = 900

_events_cache: Dict = {"events": [], "fetched_at": 0}


def _parse_event_time(event: dict, now: datetime) -> Optional[datetime]:
    date_str = event.get("date", "")
    time_str = event.get("time", "")

    if not time_str or time_str.lower() in ("all day", "tentative", ""):
        return None

    today_str = now.strftime("%b %d")
    tomorrow_str = (now + timedelta(days=1)).strftime("%b %d")

    event_date = date_str.strip()

    try:
        if "Today" in event_date or today_str in event_date:
            hour, minute = 0, 0
            parts = time_str.replace("am", "").replace("pm", "").strip().split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if "pm" in time_str.lower() and hour != 12:
                hour += 12
            if "am" in time_str.lower() and hour == 12:
                hour = 0
            return now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        elif tomorrow_str in event_date:
            hour, minute = 0, 0
            parts = time_str.replace("am", "").replace("pm", "").strip().split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if "pm" in time_str.lower() and hour != 12:
                hour += 12
            if "am" in time_str.lower() and hour == 12:
                hour = 0
            return (now + timedelta(days=1)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    except Exception:
        pass

    return None


def _fetch_events() -> List[dict]:
    try:
        from app.services.calendar_scraper import scrape_forex_factory
        events = scrape_forex_factory()
        return events
    except Exception as e:
        logger.error(f"Failed to fetch calendar events: {e}")
        return []


def get_upcoming_high_impact() -> List[dict]:
    now_ts = time.time()
    if now_ts - _events_cache["fetched_at"] > CACHE_TTL:
        _events_cache["events"] = _fetch_events()
        _events_cache["fetched_at"] = now_ts

    now = datetime.now(timezone.utc)
    high_impact = []

    for event in _events_cache["events"]:
        if event.get("impact") != "high":
            continue
        if event.get("currency") not in CURRENCIES_TO_WATCH:
            continue

        event_time = _parse_event_time(event, now)
        if event_time is None:
            if event.get("impact") == "high" and event.get("currency") in CURRENCIES_TO_WATCH:
                high_impact.append({
                    **event,
                    "estimated": True,
                    "minutes_to": None,
                })
            continue

        minutes_to = (event_time - now).total_seconds() / 60
        if minutes_to < -NEWS_PAUSE_AFTER_MIN:
            continue

        high_impact.append({
            **event,
            "event_time_utc": event_time.isoformat(),
            "minutes_to": round(minutes_to, 1),
            "estimated": False,
        })

    return high_impact


def is_news_blackout(symbol: str = "XAUUSD") -> Tuple[bool, str]:
    """
    Check if we should pause trading due to upcoming/recent high-impact news.
    Returns (is_blackout: bool, reason: str)
    """
    events = get_upcoming_high_impact()
    now = datetime.now(timezone.utc)

    relevant_currencies = ["USD"]
    if "EUR" in symbol.upper():
        relevant_currencies.append("EUR")
    elif "GBP" in symbol.upper():
        relevant_currencies.append("GBP")
    elif "JPY" in symbol.upper():
        relevant_currencies.append("JPY")
    elif "XAU" in symbol.upper() or "XAG" in symbol.upper():
        relevant_currencies = ["USD"]

    for event in events:
        currency = event.get("currency", "")
        if currency not in relevant_currencies:
            continue

        minutes_to = event.get("minutes_to")
        if minutes_to is None:
            if event.get("impact") == "high" and event.get("estimated"):
                return True, f"High-impact {currency} event today ({event.get('event', 'Unknown')}) — time unknown, pausing"
            continue

        if -NEWS_PAUSE_AFTER_MIN <= minutes_to <= NEWS_PAUSE_BEFORE_MIN:
            if minutes_to > 0:
                return True, f"High-impact {currency} event in {minutes_to:.0f} min: {event.get('event', 'Unknown')} — trading paused"
            else:
                return True, f"High-impact {currency} event {abs(minutes_to):.0f} min ago: {event.get('event', 'Unknown')} — cooling down"

    return False, "No high-impact news nearby"


def force_refresh():
    global _events_cache
    _events_cache = {"events": [], "fetched_at": 0}
