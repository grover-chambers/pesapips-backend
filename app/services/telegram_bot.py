import httpx
import logging
import os
from typing import Optional

logger = logging.getLogger("telegram_bot")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


async def send_telegram_message(text: str, chat_id: Optional[str] = None) -> bool:
    if not TELEGRAM_BOT_TOKEN:
        logger.debug("Telegram bot token not configured — skipping")
        return False

    cid = chat_id or TELEGRAM_CHAT_ID
    if not cid:
        logger.warning("No Telegram chat ID configured")
        return False

    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": cid,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return True
            logger.error(f"Telegram API error: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return False


def send_telegram_sync(text: str, chat_id: Optional[str] = None) -> bool:
    if not TELEGRAM_BOT_TOKEN:
        return False
    cid = chat_id or TELEGRAM_CHAT_ID
    if not cid:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {
            "chat_id": cid,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        resp = httpx.post(url, json=payload, timeout=10)
        return resp.status_code == 200
    except Exception:
        return False


async def notify_trade_opened(
    user_id: int,
    user_chat_id: Optional[str],
    signal: str,
    symbol: str,
    lot: float,
    price: float,
    sl: float,
    tp: float,
    regime: str,
    confidence: float,
    reason: str,
):
    emoji = "\U0001F7E2" if signal == "BUY" else "\U0001F534"
    msg = (
        f"{emoji} <b>Trade Opened</b>\n"
        f"<b>{signal} {symbol}</b> @ {price}\n"
        f"Lot: {lot} | SL: {sl} | TP: {tp}\n"
        f"Regime: {regime} | Confidence: {confidence:.0%}\n"
        f"Reason: {reason[:80]}\n"
        f"\U0001F4CA <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)
    try:
        from app.core.email import email_trade_opened
        from app.core.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            email_trade_opened(u.email, symbol, signal, lot, price)
        db.close()
    except Exception:
        pass


async def notify_trade_closed(
    user_id: int,
    user_chat_id: Optional[str],
    symbol: str,
    trade_type: str,
    profit: float,
    pnl_pct: float = 0,
):
    emoji = "\U0001F4C8" if profit >= 0 else "\U0001F4C9"
    result = "WIN" if profit >= 0 else "LOSS"
    sign = "+" if profit >= 0 else ""
    msg = (
        f"{emoji} <b>Trade Closed — {result}</b>\n"
        f"{trade_type} {symbol}\n"
        f"P&L: {sign}${profit:.2f} ({sign}{pnl_pct:.1f}%)\n"
        f"\U0001F4B0 <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)
    try:
        from app.core.email import email_trade_closed
        from app.core.database import SessionLocal
        from app.models.user import User
        db = SessionLocal()
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            email_trade_closed(u.email, symbol, trade_type, profit)
        db.close()
    except Exception:
        pass


async def notify_regime_change(
    user_chat_id: Optional[str],
    symbol: str,
    old_regime: str,
    new_regime: str,
    confidence: int,
):
    msg = (
        f"\u26A1 <b>Regime Change</b>\n"
        f"{symbol}: {old_regime} → {new_regime}\n"
        f"Confidence: {confidence}%\n"
        f"<i>Adjust your strategy accordingly.</i>\n"
        f"\U0001F9E0 <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)


async def notify_daily_summary(
    user_chat_id: Optional[str],
    balance: float,
    daily_pnl: float,
    trades_today: int,
    win_rate: float,
    regime: str,
):
    emoji = "\U0001F4C8" if daily_pnl >= 0 else "\U0001F4C9"
    sign = "+" if daily_pnl >= 0 else ""
    msg = (
        f"\U0001F4CB <b>Daily Summary</b>\n"
        f"Balance: ${balance:,.2f}\n"
        f"{emoji} P&L: {sign}${daily_pnl:.2f}\n"
        f"Trades: {trades_today} | Win Rate: {win_rate:.0f}%\n"
        f"Regime: {regime}\n"
        f"\U0001F3C6 <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)


async def notify_news_blackout(
    user_chat_id: Optional[str],
    event_name: str,
    currency: str,
    minutes_to: float,
):
    msg = (
        f"\U0001F4F0 <b>News Blackout Active</b>\n"
        f"{currency} — {event_name}\n"
        f"Event in {minutes_to:.0f} minutes\n"
        f"Auto-trading paused for safety.\n"
        f"\U0001F6E1 <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)


async def notify_circuit_breaker(
    user_chat_id: Optional[str],
    reason: str,
):
    msg = (
        f"\U0001F6D1 <b>Circuit Breaker Triggered</b>\n"
        f"{reason}\n"
        f"Auto-trading paused to protect your account.\n"
        f"\U0001F6E1 <i>PesaPips AI</i>"
    )
    await send_telegram_message(msg, chat_id=user_chat_id)
