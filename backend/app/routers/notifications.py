from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.notification import Notification, Message
from app.models.user import User
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ── NOTIFICATIONS ──────────────────────────────────────────────────────────────

@router.get("/")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifs = db.query(Notification)\
        .filter(Notification.user_id == current_user.id)\
        .order_by(Notification.created_at.desc())\
        .limit(30).all()
    return [{"id": n.id, "type": n.type, "title": n.title, "message": n.message,
             "read": n.read, "created_at": n.created_at.isoformat()} for n in notifs]

@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notif_count = db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.read == False).count()
    msg_count = db.query(Message).filter(
        or_(Message.user_id == current_user.id, Message.broadcast == True),
        Message.read == False).count()
    return {"notifications": notif_count, "messages": msg_count}

@router.patch("/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    n = db.query(Notification).filter(Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}

@router.patch("/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read == False)\
        .update({"read": True})
    db.commit()
    return {"ok": True}

# ── MESSAGES ──────────────────────────────────────────────────────────────────

@router.get("/messages")
def get_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msgs = db.query(Message)\
        .filter(or_(Message.user_id == current_user.id, Message.broadcast == True))\
        .order_by(Message.created_at.desc())\
        .limit(50).all()
    return [{"id": m.id, "subject": m.subject, "body": m.body, "from_name": m.from_name,
             "read": m.read, "broadcast": m.broadcast,
             "created_at": m.created_at.isoformat()} for m in msgs]

@router.patch("/messages/{msg_id}/read")
def mark_message_read(msg_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = db.query(Message).filter(Message.id == msg_id).first()
    if m and (m.user_id == current_user.id or m.broadcast):
        m.read = True
        db.commit()
    return {"ok": True}

@router.patch("/messages/read-all")
def mark_all_messages_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Message).filter(
        or_(Message.user_id == current_user.id, Message.broadcast == True),
        Message.read == False).update({"read": True})
    db.commit()
    return {"ok": True}

# ── HELPER (called internally by other routers) ────────────────────────────────

def create_notification(db: Session, user_id: int, type: str, title: str, message: str):
    n = Notification(user_id=user_id, type=type, title=title, message=message)
    db.add(n)
    db.commit()
    return n
