"""
Autorun Engine — monitors active strategy signal and auto-places trades on MT5.
Runs as a per-user background task. One trade open at a time per user.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.models.strategy import UserStrategy
from app.services.signal_engine import SignalEngine
from app.services.market_hours import is_market_open
from app.services.market_regime import detect_regime
from app.services.trade_context import build_context, enrich_with_regime, enrich_with_signal, apply_risk_adjustment, should_autorun_trade
from app.services.risk_manager import RiskManager
from app.mt5_bridge.socket_client import mt5 as mt5_bridge
from app.routers.trading import route_command

logger = logging.getLogger("autorun")

# ── In-memory state ───────────────────────────────────────────────────────────
# { user_id: { "running": bool, "task": asyncio.Task, "last_signal": str,
#              "last_trade": dict, "trades_today": int, "log": [...] } }
_sessions: Dict[int, dict] = {}

POLL_INTERVAL   = 30   # seconds between signal checks
MIN_CONFIDENCE  = 0.40 # minimum signal confidence to place trade
MAX_TRADES_DAY  = 5    # max auto-trades per day per user
COOLDOWN_AFTER  = 120  # seconds to wait after placing a trade


# ─────────────────────────────────────────────────────────────────────────────
def get_status(user_id: int) -> dict:
    s = _sessions.get(user_id)
    if not s:
        return {"running": False, "trades_today": 0, "last_signal": None, "log": []}
    return {
        "running":      s["running"],
        "trades_today": s["trades_today"],
        "last_signal":  s["last_signal"],
        "last_trade":   s.get("last_trade"),
        "log":          s["log"][-20:],  # last 20 log entries
    }


def _log(user_id: int, msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    logger.info(f"User {user_id}: {msg}")
    if user_id in _sessions:
        _sessions[user_id]["log"].append(entry)
        _sessions[user_id]["log"] = _sessions[user_id]["log"][-50:]


# ─────────────────────────────────────────────────────────────────────────────
async def _run_loop(user_id: int):
    """Main autorun loop for a single user."""
    import pandas as pd

    _log(user_id, "Autorun started")
    cooldown_left = 0

    while _sessions.get(user_id, {}).get("running"):
        try:
            # ── Cooldown after trade ──────────────────────────────────────────
            if cooldown_left > 0:
                cooldown_left -= POLL_INTERVAL
                await asyncio.sleep(POLL_INTERVAL)
                continue

            # ── Market hours gate ────────────────────────────────────────────
            market_open, market_reason = is_market_open(asset)
            if not market_open:
                _log(user_id, f"Market closed: {market_reason} — waiting")
                await asyncio.sleep(300)  # check every 5 min when closed
                continue

            # ── Daily trade limit ─────────────────────────────────────────────
            if _sessions[user_id]["trades_today"] >= MAX_TRADES_DAY:
                _log(user_id, f"Daily limit reached ({MAX_TRADES_DAY} trades). Pausing until tomorrow.")
                _sessions[user_id]["running"] = False
                break

            # ── Get active strategy from DB ───────────────────────────────────
            db: Session = SessionLocal()
            try:
                active_us = db.query(UserStrategy).filter(
                    UserStrategy.user_id == user_id,
                    UserStrategy.is_active == True
                ).first()
                user = db.query(User).filter(User.id == user_id).first()
            finally:
                db.close()

            if not active_us:
                _log(user_id, "No active strategy — waiting")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            params = active_us.custom_params or {}
            asset  = active_us.asset or "XAUUSD"
            tf     = params.get("timeframe", "M5")

            # ── Check for existing open position on this asset ─────────────────
            positions_res = await route_command(user_id, {"action": "POSITIONS"})
            open_positions = positions_res.get("positions", [])
            already_open   = any(p.get("symbol") == asset for p in open_positions)

            if already_open:
                _log(user_id, f"Position already open on {asset} — skipping")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            # ── Fetch candles ─────────────────────────────────────────────────
            candle_res = await route_command(user_id, {
                "action": "CANDLES", "symbol": asset,
                "timeframe": tf, "periods": 500
            })
            candles = candle_res.get("candles", [])
            if len(candles) < 50:
                _log(user_id, f"Not enough candles ({len(candles)}) — waiting")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            df = pd.DataFrame(candles)
            df["time"]  = pd.to_datetime(df["t"], unit="s")
            df = df.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
            df = df.set_index("time")

            # ── Generate signal + unified context ─────────────────────────────
            engine = SignalEngine(params)
            result = engine.generate_signal(df)

            current_price = float(df["close"].iloc[-1])

            # Build unified trade context
            ctx = build_context(
                symbol=asset, timeframe=tf,
                strategy_id=user_strat.strategy_id,
                strategy_name=params.get("strategy_name", ""),
                price=current_price, market_open=market_open,
            )
            # Enrich with regime
            try:
                from app.services.market_regime import detect_regime
                regime_data = detect_regime(df.copy())
                ctx = enrich_with_regime(ctx, regime_data)
            except Exception as e:
                _log(user_id, f"Regime check failed: {e}")

            # Enrich with signal
            ctx = enrich_with_signal(ctx, result)

            signal     = ctx.signal
            confidence = ctx.signal_confidence
            sl_dist    = result.get("sl", 0)
            tp_dist    = result.get("tp", 0)

            _sessions[user_id]["last_signal"] = signal
            _log(user_id, f"Signal: {signal} ({confidence:.0%}) | Regime: {ctx.regime} ({ctx.regime_confidence}%) | Fit: {ctx.strategy_fit}")

            # ── Place trade if signal is strong enough ─────────────────────────
            if signal in ("BUY", "SELL") and confidence >= MIN_CONFIDENCE:
                # Validate regime gate
                if ctx.strategy_fit_score == 0:
                    _log(user_id, f"Skip: Strategy unfit for {ctx.regime} regime (Avoid)")
                    await asyncio.sleep(POLL_INTERVAL); continue
                if ctx.regime == "VOLATILE" and ctx.regime_confidence > 60:
                    _log(user_id, f"Skip: VOLATILE regime detected — pausing for safety")
                    await asyncio.sleep(POLL_INTERVAL); continue

                # Get current price for SL/TP calculation
                balance_res = await route_command(user_id, {"action": "BALANCE"})
                balance     = float(balance_res.get("balance", 10000))
                price_res   = await route_command(user_id, {
                    "action": "CANDLES", "symbol": asset, "timeframe": "M1", "periods": 3
                })
                price_candles = price_res.get("candles", [])
                if not price_candles:
                    await asyncio.sleep(POLL_INTERVAL)
                    continue
                current_price = float(price_candles[-1]["c"])

                # Risk management
                risk_pct = float(params.get("risk_per_trade", 1.0))
                rm       = RiskManager(balance=balance, risk_per_trade=risk_pct)
                pip_size = 0.1
                sl_pips  = sl_dist / pip_size if sl_dist > 0 else float(params.get("sl_pips", 15))
                volume   = rm.calculate_lot_size(sl_pips=sl_pips)
                volume   = round(max(0.01, min(volume, 1.0)), 2)

                # Volatility-adjusted sizing via unified context
                ctx = apply_risk_adjustment(ctx, balance, risk_pct)
                if ctx.adjusted_lot > 0:
                    volume = ctx.adjusted_lot
                    _log(user_id, f"Lot adjusted: {ctx.lot_adjustment_reason}")

                # Absolute SL/TP prices
                if sl_dist > 0 and tp_dist > 0:
                    sl_price = round(current_price - sl_dist, 2) if signal == "BUY" else round(current_price + sl_dist, 2)
                    tp_price = round(current_price + tp_dist, 2) if signal == "BUY" else round(current_price - tp_dist, 2)
                else:
                    sl_pips_val = float(params.get("sl_pips", 15)) * pip_size
                    tp_pips_val = float(params.get("tp_pips", 30)) * pip_size
                    sl_price = round(current_price - sl_pips_val, 2) if signal == "BUY" else round(current_price + sl_pips_val, 2)
                    tp_price = round(current_price + tp_pips_val, 2) if signal == "BUY" else round(current_price - tp_pips_val, 2)

                strategy_name = params.get("strategy_name", "AutoRun")
                comment       = f"PP-Auto:{strategy_name[:12]}"

                _log(user_id, f"Placing {signal} {volume}lot {asset} @ ~{current_price} SL:{sl_price} TP:{tp_price}")

                trade_res = await route_command(user_id, {
                    "action":  signal,
                    "symbol":  asset,
                    "volume":  volume,
                    "sl":      sl_price,
                    "tp":      tp_price,
                    "comment": comment,
                })

                if trade_res.get("status") == "ok":
                    ticket = trade_res.get("ticket", "?")
                    _log(user_id, f"✓ Trade placed — ticket #{ticket} | Regime: {ctx.regime} | Fit: {ctx.strategy_fit} | Lot: {volume}")
                    _sessions[user_id]["trades_today"] += 1

                    # Send notification for placed trade
                    try:
                        from app.core.database import SessionLocal as SL
                        from app.models.notification import Notification
                        db_j = SL()
                        notif = Notification(
                            user_id = user_id,
                            type    = "signal",
                            title   = f"{'📈' if sig=='BUY' else '📉'} Trade placed: {sig} {asset}",
                            message = f"Lot: {volume} | {ctx.signal_reason[:100]} | Regime: {ctx.regime} ({ctx.regime_confidence}%) | Fit: {ctx.strategy_fit}",
                            read    = False,
                        )
                        db_j.add(notif)
                        db_j.commit()
                        db_j.close()
                    except Exception as je:
                        _log(user_id, f"Notification failed: {je}")
                    _sessions[user_id]["last_trade"] = {
                        "signal":    signal,
                        "asset":     asset,
                        "volume":    volume,
                        "price":     current_price,
                        "sl":        sl_price,
                        "tp":        tp_price,
                        "ticket":    ticket,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "strategy":  strategy_name,
                    }
                    cooldown_left = COOLDOWN_AFTER
                else:
                    err = trade_res.get("message", "unknown error")
                    _log(user_id, f"✗ Trade failed — {err}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            _log(user_id, f"Error: {e}")
            logger.exception(f"Autorun error for user {user_id}")

        await asyncio.sleep(POLL_INTERVAL)

    _log(user_id, "Autorun stopped")
    if user_id in _sessions:
        _sessions[user_id]["running"] = False


# ─────────────────────────────────────────────────────────────────────────────
async def start(user_id: int):
    """Start autorun for a user."""
    if user_id in _sessions and _sessions[user_id]["running"]:
        return {"status": "already_running"}

    if user_id not in _sessions:
        _sessions[user_id] = {
            "running": False, "task": None,
            "trades_today": 0, "last_signal": None,
            "last_trade": None, "log": []
        }

    _sessions[user_id]["running"] = True
    task = asyncio.create_task(_run_loop(user_id))
    _sessions[user_id]["task"] = task
    return {"status": "started"}


async def stop(user_id: int):
    """Stop autorun for a user."""
    if user_id not in _sessions:
        return {"status": "not_running"}
    _sessions[user_id]["running"] = False
    task = _sessions[user_id].get("task")
    if task and not task.done():
        task.cancel()
    return {"status": "stopped"}


# ── PERSISTENCE ───────────────────────────────────────────────────────────────
def save_autorun_state(user_id: int, active: bool, strategy_id: int = None):
    """Save autorun state to DB so it survives restarts."""
    try:
        from app.core.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            u.autorun_active = active
            if strategy_id:
                u.autorun_strategy_id = strategy_id
            db.commit()
        db.close()
    except Exception as e:
        logger.error(f"Failed to save autorun state: {e}")


async def restore_autorun_sessions():
    """On server startup, restore autorun for all users who had it active."""
    try:
        from app.core.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        active_users = db.query(User).filter(User.autorun_active == True).all()
        db.close()

        if not active_users:
            logger.info("No autorun sessions to restore")
            return

        logger.info(f"Restoring {len(active_users)} autorun session(s)")
        for user in active_users:
            _log(user.id, "Autorun restored after server restart")
            await start_autorun(user.id)
            logger.info(f"Restored autorun for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to restore autorun sessions: {e}")
