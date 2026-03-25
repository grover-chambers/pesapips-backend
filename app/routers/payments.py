from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.payment import Payment

router = APIRouter(prefix="/payments", tags=["payments"])

class PaymentSubmit(BaseModel):
    plan: str
    method: str
    tx_ref: str
    phone: Optional[str] = None
    amount: int

@router.post("/submit")
def submit_payment(data: PaymentSubmit, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    if data.plan not in ["pro", "elite", "platinum"]:
        raise HTTPException(status_code=400, detail="Invalid plan")

    # Check for duplicate tx_ref
    existing = db.query(Payment).filter(Payment.tx_ref == data.tx_ref).first()
    if existing:
        raise HTTPException(status_code=400, detail="Transaction reference already submitted")

    # Save payment
    p = Payment(user_id=current_user.id, plan=data.plan, method=data.method,
                tx_ref=data.tx_ref, phone=data.phone, amount=data.amount)
    db.add(p)

    # Notify admin
    admin = db.query(User).filter(User.is_admin == True).first()
    if admin:
        n = Notification(user_id=admin.id, type="system",
            title=f"New payment: {data.plan.upper()} — {data.method.upper()}",
            message=f"{current_user.email} | Ref: {data.tx_ref} | KSh {data.amount} | Phone: {data.phone or 'N/A'}")
        db.add(n)

    # Notify user
    n2 = Notification(user_id=current_user.id, type="system",
        title="Payment received - pending verification",
        message=f"Your {data.plan.upper()} plan payment via {data.method.upper()} is under review. We will upgrade your account within 1 hour. Ref: {data.tx_ref}")
    db.add(n2)
    db.commit()

    return {"ok": True}
