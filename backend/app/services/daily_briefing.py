"""
Daily AI Market Briefing — generates a morning market analysis.
Runs once per day and stores the briefing for frontend display.
"""
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict

logger = logging.getLogger("daily_briefing")

_briefing_cache: Dict = {"briefing": None, "date": ""}

ASSET_PROFILES = {
    "XAUUSD": {"name": "Gold", "key_level_above": 2350, "key_level_below": 2300, "session": "London/NY"},
    "EURUSD": {"name": "EUR/USD", "key_level_above": 1.0900, "key_level_below": 1.0800, "session": "London"},
    "GBPUSD": {"name": "GBP/USD", "key_level_above": 1.2800, "key_level_below": 1.2700, "session": "London"},
    "USDJPY": {"name": "USD/JPY", "key_level_above": 155.00, "key_level_below": 152.00, "session": "Tokyo/London"},
    "BTCUSD": {"name": "Bitcoin", "key_level_above": 70000, "key_level_below": 65000, "session": "24/7"},
}


def _get_regime_text(regime: str, confidence: int) -> str:
    descriptions = {
        "TRENDING_UP": "bullish trend with upward momentum",
        "TRENDING_DOWN": "bearish trend with downward pressure",
        "RANGING": "consolidation phase — no clear direction",
        "VOLATILE": "high volatility — exercise caution",
        "BREAKOUT": "potential breakout forming",
    }
    base = descriptions.get(regime, "uncertain conditions")
    conf = "strong" if confidence >= 70 else "moderate" if confidence >= 40 else "weak"
    return f"{conf} {base} ({confidence}% confidence)"


def _get_strategy_recommendation(regime: str) -> str:
    if regime == "TRENDING_UP":
        return "Trend-following longs. Enter on pullbacks to 21 EMA. Trail stops."
    elif regime == "TRENDING_DOWN":
        return "Trend-following shorts. Enter on pullbacks to 21 EMA. Trail stops."
    elif regime == "RANGING":
        return "Avoid trend strategies. Consider range-bound plays at support/resistance only."
    elif regime == "VOLATILE":
        return "Reduce position size 50%. Widen stops. Avoid new entries until volatility settles."
    elif regime == "BREAKOUT":
        return "Wait for breakout confirmation before entering. Do NOT chase the initial move."
    return "Monitor and wait for clearer conditions."


def _get_events_summary() -> str:
    try:
        from app.services.news_filter import get_upcoming_high_impact
        events = get_upcoming_high_impact()
        if not events:
            return "No high-impact events scheduled today. Normal trading conditions."
        lines = []
        for e in events[:5]:
            minutes = e.get("minutes_to", 0)
            if minutes and minutes > 0:
                lines.append(f"- {e.get('event', 'Unknown')} ({e.get('currency', '')}) in ~{minutes:.0f} min")
            else:
                lines.append(f"- {e.get('event', 'Unknown')} ({e.get('currency', '')})")
        return "\n".join(lines)
    except Exception:
        return "Calendar data unavailable. Check ForexFactory manually."


def _get_key_assets_analysis() -> list:
    results = []
    try:
        from app.services.market_data import get_market_data
        from app.services.market_regime import detect_regime

        for symbol, profile in ASSET_PROFILES.items():
            try:
                df = get_market_data(symbol=symbol, timeframe="H1", periods=200)
                if df is None or df.empty or len(df) < 50:
                    continue
                regime_data = detect_regime(df)
                if "error" in regime_data:
                    continue
                price = float(df["close"].iloc[-1])
                prev_price = float(df["close"].iloc[-2]) if len(df) > 1 else price
                chg_pct = ((price - prev_price) / prev_price * 100) if prev_price else 0

                results.append({
                    "symbol": symbol,
                    "name": profile["name"],
                    "price": round(price, 2),
                    "change_pct": round(chg_pct, 3),
                    "regime": regime_data["regime"],
                    "regime_label": regime_data["regime_label"],
                    "confidence": regime_data["confidence"],
                    "regime_advice": regime_data.get("regime_advice", ""),
                    "session": profile["session"],
                })
            except Exception:
                continue
    except Exception as e:
        logger.error(f"Asset analysis failed: {e}")

    return results


def generate_briefing() -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if _briefing_cache.get("date") == today and _briefing_cache.get("briefing"):
        return _briefing_cache["briefing"]

    logger.info("Generating daily market briefing...")

    now = datetime.now(timezone.utc)
    hour = now.hour
    if hour < 7:
        session = "Asian"
    elif hour < 15:
        session = "London"
    elif hour < 21:
        session = "New York"
    else:
        session = "After-hours"

    assets = _get_key_assets_analysis()
    events_text = _get_events_summary()

    overall_regime = "RANGING"
    overall_confidence = 0
    if assets:
        from collections import Counter
        regime_counts = Counter(a["regime"] for a in assets)
        overall_regime = regime_counts.most_common(1)[0][0] if regime_counts else "RANGING"
        overall_confidence = int(sum(a["confidence"] for a in assets) / len(assets))

    strategy_rec = _get_strategy_recommendation(overall_regime)
    regime_text = _get_regime_text(overall_regime, overall_confidence)

    headline = f"Market shows {regime_text}"
    summary = f"Current session: {session}. {strategy_rec}"

    briefing = {
        "date": today,
        "generated_at": now.isoformat(),
        "headline": headline,
        "summary": summary,
        "session": session,
        "overall_regime": overall_regime,
        "overall_confidence": overall_confidence,
        "strategy_recommendation": strategy_rec,
        "events": events_text,
        "assets": assets,
        "autorun_likely": overall_regime in ("TRENDING_UP", "TRENDING_DOWN", "BREAKOUT") and overall_confidence >= 50,
    }

    _briefing_cache["briefing"] = briefing
    _briefing_cache["date"] = today

    return briefing
