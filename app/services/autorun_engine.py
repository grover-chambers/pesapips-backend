"""
Autorun Engine — monitors active strategy signal and auto-places trades on MT5.
Runs as a per-user background task. One trade open at a time per user.
Now includes: news filter, circuit breaker, trailing stop, Telegram notifications.
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
from app.services.risk_manager import RiskManager, CircuitBreakerState
from app.services.news_filter import is_news_blackout
from app.mt5_bridge.socket_client import mt5 as mt5_bridge
from app.routers.trading import route_command

logger = logging.getLogger("autorun")

_sessions: Dict[int, dict] = {}

POLL_INTERVAL = 30
MIN_CONFIDENCE = 0.40
MAX_TRADES_DAY = 5
COOLDOWN_AFTER = 120


def get_status(user_id: int) -> dict:
    s = _sessions.get(user_id)
    if not s:
        return {"running": False, "trades_today": 0, "last_signal": None, "log": [], "circuit_breaker": None}
    cb = s.get("circuit_breaker")
    return {
        "running": s["running"],
        "trades_today": s["trades_today"],
        "last_signal": s["last_signal"],
        "last_trade": s.get("last_trade"),
        "log": s["log"][-20:],
        "circuit_breaker": cb.to_dict() if cb else None,
    }


def _log(user_id: int, msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    logger.info(f"User {user_id}: {msg}")
    if user_id in _sessions:
        _sessions[user_id]["log"].append(entry)
        _sessions[user_id]["log"] = _sessions[user_id]["log"][-50:]


def _get_user_telegram_chat_id(user_id: int) -> str:
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        prefs_str = getattr(user, "notification_prefs", None) if user else None
        db.close()
        if prefs_str:
            import json
            prefs = json.loads(prefs_str) if isinstance(prefs_str, str) else prefs_str
            return prefs.get("telegram_chat_id", "")
    except Exception:
        pass
    return ""


async def _run_loop(user_id: int):
    """Main autorun loop for a single user."""
    import pandas as pd
    from app.services.market_data import get_market_data, is_synthetic_data
    from app.services.signal_engine import check_h4_trend

    _log(user_id, "Autorun started")
    cooldown_left = 0
    news_blackout_notified = False
    cb_notified = False

    while _sessions.get(user_id, {}).get("running"):
        try:
            if cooldown_left > 0:
                cooldown_left -= POLL_INTERVAL
                await asyncio.sleep(POLL_INTERVAL)
                continue

            if _sessions[user_id]["trades_today"] >= MAX_TRADES_DAY:
                _log(user_id, f"Daily limit reached ({MAX_TRADES_DAY} trades). Pausing until tomorrow.")
                _sessions[user_id]["running"] = False
                break

            cb = _sessions[user_id].get("circuit_breaker")
            if not cb:
                cb = CircuitBreakerState()
                _sessions[user_id]["circuit_breaker"] = cb

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
            asset = active_us.asset or "XAUUSD"
            tf = params.get("timeframe", "M5")

            market_open, market_reason = is_market_open(asset)
            if not market_open:
                _log(user_id, f"Market closed: {market_reason} — waiting")
                await asyncio.sleep(300)
                continue

            is_blackout, blackout_reason = is_news_blackout(asset)
            if is_blackout:
                if not news_blackout_notified:
                    _log(user_id, f"NEWS BLACKOUT: {blackout_reason}")
                    try:
                        from app.services.telegram_bot import notify_news_blackout
                        chat_id = _get_user_telegram_chat_id(user_id)
                        await notify_news_blackout(chat_id, blackout_reason, "USD", 0)
                    except Exception:
                        pass
                    news_blackout_notified = True
                await asyncio.sleep(POLL_INTERVAL)
                continue
            else:
                news_blackout_notified = False

            positions_res = await route_command(user_id, {"action": "POSITIONS"})
            open_positions = positions_res.get("positions", [])
            already_open = any(p.get("symbol") == asset for p in open_positions)

            if already_open:
                balance_res = await route_command(user_id, {"action": "BALANCE"})
                balance = float(balance_res.get("balance", 10000))
                cb.update_balance(balance)

                for pos in open_positions:
                    if pos.get("symbol") != asset:
                        continue
                    entry_price = float(pos.get("open_price", 0))
                    current_price = float(pos.get("current_price", 0))
                    current_sl = float(pos.get("sl", 0))
                    pos_type = pos.get("type", "")
                    profit = float(pos.get("profit", 0))
                    ticket = pos.get("ticket", 0)

                    if current_sl and current_price and entry_price and profit != 0:
                        rm = RiskManager(balance=balance)
                        candle_res = await route_command(user_id, {
                            "action": "CANDLES", "symbol": asset,
                            "timeframe": tf, "periods": 30
                        })
                        atr = 0
                        if candle_res.get("candles"):
                            highs = [c["h"] for c in candle_res["candles"][-14:]]
                            lows = [c["l"] for c in candle_res["candles"][-14:]]
                            closes = [c["c"] for c in candle_res["candles"][-14:]]
                            if len(highs) >= 14:
                                tr_sum = 0
                                for i in range(1, len(highs)):
                                    tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
                                    tr_sum += tr
                                atr = tr_sum / 14

                        should_trail, new_sl, trail_reason = rm.should_trail_stop(
                            signal=pos_type,
                            entry_price=entry_price,
                            current_price=current_price,
                            current_sl=current_sl,
                            atr=atr,
                        )
                        if should_trail and new_sl != current_sl:
                            _log(user_id, f"Trailing stop: {trail_reason} | SL: {current_sl} → {new_sl}")
                            await route_command(user_id, {
                                "action": "MODIFY",
                                "ticket": ticket,
                                "sl": new_sl,
                            })

                await asyncio.sleep(POLL_INTERVAL)
                continue

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
            df["time"] = pd.to_datetime(df["t"], unit="s")
            df = df.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
            df = df.set_index("time")

            if is_synthetic_data(df):
                _log(user_id, "BLOCKED: Synthetic data detected — will not generate signals on fake data")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            engine = SignalEngine(params)
            result = engine.generate_signal(df)
            current_price = float(df["close"].iloc[-1])

            h4_trend = None
            if params.get("use_mtf_filter", True):
                try:
                    h4_res = await route_command(user_id, {
                        "action": "CANDLES", "symbol": asset,
                        "timeframe": "H4", "periods": 100
                    })
                    h4_candles = h4_res.get("candles", [])
                    if len(h4_candles) >= 50:
                        df_h4 = pd.DataFrame(h4_candles)
                        df_h4["time"] = pd.to_datetime(df_h4["t"], unit="s")
                        df_h4 = df_h4.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
                        df_h4 = df_h4.set_index("time")
                        h4_trend = check_h4_trend(df_h4)
                        if h4_trend:
                            from app.services.signal_engine import run_signal as _run_signal
                            result = _run_signal(df, params, h4_trend=h4_trend)
                except Exception as e:
                    _log(user_id, f"H4 trend check failed: {e}")

            ctx = build_context(
                symbol=asset, timeframe=tf,
                strategy_id=active_us.strategy_id,
                strategy_name=params.get("strategy_name", ""),
                price=current_price, market_open=market_open,
            )
            try:
                regime_data = detect_regime(df.copy())
                ctx = enrich_with_regime(ctx, regime_data)
            except Exception as e:
                _log(user_id, f"Regime check failed: {e}")

            ctx = enrich_with_signal(ctx, result)

            signal = ctx.signal
            confidence = ctx.signal_confidence
            sl_dist = result.get("sl", 0)
            tp_dist = result.get("tp", 0)

            _sessions[user_id]["last_signal"] = signal
            _log(user_id, f"Signal: {signal} ({confidence:.0%}) | Regime: {ctx.regime} ({ctx.regime_confidence}%) | Fit: {ctx.strategy_fit} | H4: {h4_trend or 'N/A'}")

            if signal in ("BUY", "SELL") and confidence >= MIN_CONFIDENCE:
                if ctx.strategy_fit_score == 0:
                    _log(user_id, f"Skip: Strategy unfit for {ctx.regime} regime (Avoid)")
                    await asyncio.sleep(POLL_INTERVAL); continue
                if ctx.regime == "VOLATILE" and ctx.regime_confidence > 60:
                    _log(user_id, f"Skip: VOLATILE regime detected — pausing for safety")
                    await asyncio.sleep(POLL_INTERVAL); continue

                balance_res = await route_command(user_id, {"action": "BALANCE"})
                balance = float(balance_res.get("balance", 10000))
                cb.update_balance(balance)

                is_cb_paused, cb_reason = cb.is_paused()
                if is_cb_paused:
                    if not cb_notified:
                        _log(user_id, f"CIRCUIT BREAKER: {cb_reason}")
                        try:
                            from app.services.telegram_bot import notify_circuit_breaker
                            chat_id = _get_user_telegram_chat_id(user_id)
                            await notify_circuit_breaker(chat_id, cb_reason)
                        except Exception:
                            pass
                        cb_notified = True
                    await asyncio.sleep(POLL_INTERVAL)
                    continue
                else:
                    cb_notified = False

                rm = RiskManager(balance=balance)
                open_count = len(open_positions)
                dd_pct = 0
                if cb.peak_balance > 0:
                    dd_pct = (cb.peak_balance - balance) / cb.peak_balance * 100
                can_trade, can_trade_reason = rm.can_open_trade(open_count, dd_pct)
                if not can_trade:
                    _log(user_id, f"Risk manager blocked: {can_trade_reason}")
                    await asyncio.sleep(POLL_INTERVAL)
                    continue

                price_res = await route_command(user_id, {
                    "action": "CANDLES", "symbol": asset, "timeframe": "M1", "periods": 3
                })
                price_candles = price_res.get("candles", [])
                if not price_candles:
                    await asyncio.sleep(POLL_INTERVAL)
                    continue
                current_price = float(price_candles[-1]["c"])

                risk_pct = float(params.get("risk_per_trade", 1.0))
                rm = RiskManager(balance=balance, risk_per_trade=risk_pct)
                pip_size = 0.1
                sl_pips = sl_dist / pip_size if sl_dist > 0 else float(params.get("sl_pips", 15))
                volume = rm.calculate_lot_size(sl_pips=sl_pips)
                volume = round(max(0.01, min(volume, 1.0)), 2)

                ctx = apply_risk_adjustment(ctx, balance, risk_pct)
                if ctx.adjusted_lot > 0:
                    volume = ctx.adjusted_lot
                    _log(user_id, f"Lot adjusted: {ctx.lot_adjustment_reason}")

                if sl_dist > 0 and tp_dist > 0:
                    sl_price = round(current_price - sl_dist, 2) if signal == "BUY" else round(current_price + sl_dist, 2)
                    tp_price = round(current_price + tp_dist, 2) if signal == "BUY" else round(current_price - tp_dist, 2)
                else:
                    sl_pips_val = float(params.get("sl_pips", 15)) * pip_size
                    tp_pips_val = float(params.get("tp_pips", 30)) * pip_size
                    sl_price = round(current_price - sl_pips_val, 2) if signal == "BUY" else round(current_price + sl_pips_val, 2)
                    tp_price = round(current_price + tp_pips_val, 2) if signal == "BUY" else round(current_price - tp_pips_val, 2)

                strategy_name = params.get("strategy_name", "AutoRun")
                comment = f"PP-Auto:{strategy_name[:12]}"

                _log(user_id, f"Placing {signal} {volume}lot {asset} @ ~{current_price} SL:{sl_price} TP:{tp_price}")

                trade_res = await route_command(user_id, {
                    "action": signal,
                    "symbol": asset,
                    "volume": volume,
                    "sl": sl_price,
                    "tp": tp_price,
                    "comment": comment,
                })

                if trade_res.get("status") == "ok":
                    ticket = trade_res.get("ticket", "?")
                    _log(user_id, f"Trade placed — ticket #{ticket} | Regime: {ctx.regime} | Fit: {ctx.strategy_fit} | Lot: {volume} | H4: {h4_trend or 'N/A'}")
                    _sessions[user_id]["trades_today"] += 1

                    try:
                        from app.services.telegram_bot import notify_trade_opened
                        chat_id = _get_user_telegram_chat_id(user_id)
                        await notify_trade_opened(
                            user_id=user_id, user_chat_id=chat_id,
                            signal=signal, symbol=asset, lot=volume,
                            price=current_price, sl=sl_price, tp=tp_price,
                            regime=ctx.regime, confidence=confidence,
                            reason=result.get("reason", ""),
                        )
                    except Exception as te:
                        _log(user_id, f"Telegram notify failed: {te}")

                    try:
                        from app.core.database import SessionLocal as SL
                        from app.models.notification import Notification
                        from app.models.trading_audit import SignalAudit
                        db_j = SL()
                        notif = Notification(
                            user_id=user_id,
                            type="signal",
                            title=f"{'📈' if signal=='BUY' else '📉'} Trade placed: {signal} {asset}",
                            message=f"Lot: {volume} | {ctx.signal_reason[:100]} | Regime: {ctx.regime} ({ctx.regime_confidence}%) | Fit: {ctx.strategy_fit}",
                            read=False,
                        )
                        db_j.add(notif)

                        audit = SignalAudit(
                            user_id=user_id,
                            symbol=asset,
                            timeframe=tf,
                            signal=signal,
                            confidence=confidence,
                            reason=result.get("reason", "")[:500],
                            price_at_signal=current_price,
                            sl_price=sl_price,
                            tp_price=tp_price,
                            regime=ctx.regime,
                            regime_confidence=ctx.regime_confidence,
                            strategy_id=active_us.strategy_id,
                            strategy_name=strategy_name,
                            strategy_fit=ctx.strategy_fit,
                            lot_size=volume,
                            data_source="live",
                            is_auto=True,
                            mt5_ticket=int(ticket) if str(ticket).isdigit() else None,
                        )
                        db_j.add(audit)
                        db_j.commit()
                        db_j.close()
                    except Exception as je:
                        _log(user_id, f"Audit/notification failed: {je}")

                    _sessions[user_id]["last_trade"] = {
                        "signal": signal,
                        "asset": asset,
                        "volume": volume,
                        "price": current_price,
                        "sl": sl_price,
                        "tp": tp_price,
                        "ticket": ticket,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "strategy": strategy_name,
                    }
                    cooldown_left = COOLDOWN_AFTER
                else:
                    err = trade_res.get("message", "unknown error")
                    _log(user_id, f"Trade failed — {err}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            _log(user_id, f"Error: {e}")
            logger.exception(f"Autorun error for user {user_id}")

        await asyncio.sleep(POLL_INTERVAL)

    _log(user_id, "Autorun stopped")
    if user_id in _sessions:
        _sessions[user_id]["running"] = False


async def start(user_id: int):
    if user_id in _sessions and _sessions[user_id]["running"]:
        return {"status": "already_running"}

    if user_id not in _sessions:
        _sessions[user_id] = {
            "running": False, "task": None,
            "trades_today": 0, "last_signal": None,
            "last_trade": None, "log": [],
            "circuit_breaker": CircuitBreakerState(),
        }

    _sessions[user_id]["running"] = True
    task = asyncio.create_task(_run_loop(user_id))
    _sessions[user_id]["task"] = task
    return {"status": "started"}


async def stop(user_id: int):
    if user_id not in _sessions:
        return {"status": "not_running"}
    _sessions[user_id]["running"] = False
    task = _sessions[user_id].get("task")
    if task and not task.done():
        task.cancel()
    return {"status": "stopped"}


def save_autorun_state(user_id: int, active: bool, strategy_id: int = None):
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
            await start(user.id)
        logger.info(f"Restored autorun for user {user.id}")
    except Exception as e:
        logger.error(f"Failed to restore autorun sessions: {e}")


async def daily_circuit_breaker_reset():
    for uid, session in _sessions.items():
        cb = session.get("circuit_breaker")
        if cb:
            cb.reset_daily()
            cb.consecutive_losses = 0
            _log(uid, "Daily circuit breaker reset")
