"""
Regime Scanner — PesaPips
Runs every hour, scans all users with active strategies,
detects regime changes and sends notifications.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict

logger = logging.getLogger("regime_scanner")

# Track last known regime per user
_last_regimes: Dict[int, str] = {}

REGIME_CHANGE_ALERTS = {
    ("TRENDING_UP",   "VOLATILE"):      ("⚡", "warning", "Volatility spike detected",      "Market has shifted to HIGH VOLATILITY. Consider pausing autorun and reducing position size."),
    ("TRENDING_DOWN", "VOLATILE"):      ("⚡", "warning", "Volatility spike detected",      "Market has shifted to HIGH VOLATILITY. Consider pausing autorun and reducing position size."),
    ("TRENDING_UP",   "RANGING"):       ("↔", "info",    "Trend may be stalling",          "Market is transitioning from Trending to Ranging. Trend-following strategies may underperform."),
    ("TRENDING_DOWN", "RANGING"):       ("↔", "info",    "Trend may be stalling",          "Market is transitioning from Trending to Ranging. Trend-following strategies may underperform."),
    ("RANGING",       "TRENDING_UP"):   ("▲", "signal",  "Uptrend emerging",               "Market is breaking out of consolidation with bullish bias. Trend-following strategies now favoured."),
    ("RANGING",       "TRENDING_DOWN"): ("▼", "signal",  "Downtrend emerging",             "Market is breaking out of consolidation with bearish bias. Trend-following strategies now favoured."),
    ("RANGING",       "BREAKOUT"):      ("◈", "signal",  "Breakout in progress",           "Price is breaking out of consolidation. High-probability entry window. Check your signals now."),
    ("VOLATILE",      "TRENDING_UP"):   ("▲", "signal",  "Volatility settling — bull trend","Volatility is easing into a bullish trend. Autorun can resume with normal sizing."),
    ("VOLATILE",      "TRENDING_DOWN"): ("▼", "signal",  "Volatility settling — bear trend","Volatility is easing into a bearish trend. Autorun can resume with normal sizing."),
}

REGIME_COLORS = {
    "TRENDING_UP":   "#3dd68c",
    "TRENDING_DOWN": "#f06b6b",
    "RANGING":       "#f5c842",
    "VOLATILE":      "#a78bfa",
    "BREAKOUT":      "#5b9cf6",
}


async def scan_user(user_id: int, symbol: str, timeframe: str, strategy_id: int):
    """Run regime scan for one user and send notification if regime changed."""
    try:
        from app.services.market_regime import detect_regime
        from app.services.market_hours import is_market_open
        from app.mt5_bridge.socket_client import mt5 as bridge
        import pandas as pd

        # Skip if market closed
        open_, _ = is_market_open(symbol)
        if not open_:
            return

        # Get candles
        r = bridge._send({"action": "CANDLES", "symbol": symbol, "timeframe": timeframe, "periods": 300})
        candles = r.get("candles", [])
        if len(candles) < 50:
            return

        df = pd.DataFrame(candles)
        df["time"] = pd.to_datetime(df["t"], unit="s")
        df = df.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
        df = df.set_index("time")

        regime_data = detect_regime(df)
        if "error" in regime_data:
            return

        new_regime  = regime_data.get("regime", "UNKNOWN")
        confidence  = regime_data.get("confidence", 0)
        last_regime = _last_regimes.get(user_id)

        # Update tracking
        _last_regimes[user_id] = new_regime

        # First scan — just record, don't notify
        if last_regime is None:
            logger.info(f"User {user_id}: Initial regime = {new_regime}")
            return

        # Check if regime changed
        if new_regime == last_regime:
            return

        logger.info(f"User {user_id}: Regime changed {last_regime} → {new_regime}")

        # Get alert config
        alert = REGIME_CHANGE_ALERTS.get((last_regime, new_regime))
        if not alert:
            # Generic regime change
            icon, ntype, title, msg = "🔄", "info", f"Regime changed: {new_regime}", f"Market regime shifted from {last_regime} to {new_regime} ({confidence}% confidence)."
        else:
            icon, ntype, title, msg = alert
            msg += f" (Confidence: {confidence}%)"

        # Save notification to DB using existing system
        from app.core.database import SessionLocal
        from app.models.notification import Notification
        db = SessionLocal()
        notif = Notification(
            user_id = user_id,
            type    = ntype,
            title   = f"{icon} {title}",
            message = f"[{symbol} {timeframe}] {msg}",
            read    = False,
        )
        db.add(notif)
        db.commit()
        db.close()
        logger.info(f"Notification sent to user {user_id}: {title}")

    except Exception as e:
        logger.error(f"Regime scan failed for user {user_id}: {e}")


async def start_regime_scanner():
    """Background task — scans all active users every hour."""
    logger.info("Regime scanner started")
    await asyncio.sleep(60)  # Wait 1 min after startup before first scan

    while True:
        try:
            from app.core.database import SessionLocal
            from app.models.user import User
            from app.models.strategy import UserStrategy, Strategy

            db = SessionLocal()
            # Get all users with active strategies — load strategy eagerly
            from sqlalchemy.orm import joinedload
            active = db.query(UserStrategy)                .options(joinedload(UserStrategy.strategy))                .filter(UserStrategy.is_active == True).all()

            # Extract data while session is open
            scan_targets = []
            for us in active:
                strat_params = us.strategy.default_params if us.strategy else {}
                scan_targets.append({
                    "user_id":     us.user_id,
                    "strategy_id": us.strategy_id,
                    "symbol":      strat_params.get("asset", "XAUUSD"),
                    "timeframe":   strat_params.get("timeframe", "H1"),
                })
            db.close()

            if scan_targets:
                logger.info(f"Scanning {len(scan_targets)} active strategy user(s)")
                for target in scan_targets:
                    await scan_user(target["user_id"], target["symbol"], target["timeframe"], target["strategy_id"])
                    await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Regime scanner loop error: {e}")

        # Scan every hour
        await asyncio.sleep(3600)
