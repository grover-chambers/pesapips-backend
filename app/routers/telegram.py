"""
Telegram bot integration endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/telegram", tags=["Telegram"])


class TelegramSetupPayload(BaseModel):
    chat_id: str


@router.post("/setup")
def setup_telegram(
    payload: TelegramSetupPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json
    prefs_str = current_user.notification_prefs or "{}"
    prefs = json.loads(prefs_str) if isinstance(prefs_str, str) else prefs_str
    prefs["telegram_chat_id"] = payload.chat_id
    current_user.notification_prefs = json.dumps(prefs)
    db.commit()
    return {"status": "ok", "message": "Telegram chat ID saved"}


@router.post("/test")
async def test_telegram(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json
    prefs_str = current_user.notification_prefs or "{}"
    prefs = json.loads(prefs_str) if isinstance(prefs_str, str) else prefs_str
    chat_id = prefs.get("telegram_chat_id", "")

    if not chat_id:
        raise HTTPException(status_code=400, detail="No Telegram chat ID configured. Use /telegram/setup first.")

    from app.services.telegram_bot import send_telegram_message
    success = await send_telegram_message(
        "🧪 <b>Test Message from PesaPips</b>\n\nYour Telegram notifications are working correctly! "
        "You will receive trade alerts, regime changes, and daily summaries here.\n\n🤖 <i>PesaPips AI</i>",
        chat_id=chat_id,
    )

    if success:
        return {"status": "ok", "message": "Test message sent to your Telegram"}
    raise HTTPException(status_code=503, detail="Failed to send Telegram message. Check your bot token and chat ID.")


@router.get("/status")
def telegram_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json, os
    prefs_str = current_user.notification_prefs or "{}"
    prefs = json.loads(prefs_str) if isinstance(prefs_str, str) else prefs_str
    chat_id = prefs.get("telegram_chat_id", "")

    return {
        "configured": bool(chat_id),
        "chat_id_set": bool(chat_id),
        "bot_token_set": bool(os.getenv("TELEGRAM_BOT_TOKEN", "")),
    }
