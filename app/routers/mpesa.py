"""
M-Pesa / Flutterwave payment + pricing endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.payment import Payment
from app.models.notification import Notification
from app.services.mpesa import initiate_mpesa_payment, verify_payment, get_pricing

router = APIRouter(prefix="/mpesa", tags=["M-Pesa"])


class MpesaPayPayload(BaseModel):
    plan: str
    billing: str = "monthly"
    phone: str


@router.post("/initiate")
async def initiate_payment(
    payload: MpesaPayPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.plan not in ("pro", "elite", "platinum"):
        raise HTTPException(status_code=400, detail="Invalid plan")

    result = await initiate_mpesa_payment(
        email=current_user.email,
        phone=payload.phone,
        plan=payload.plan,
        billing=payload.billing,
    )

    if result.get("status") == "ok":
        p = Payment(
            user_id=current_user.id,
            plan=payload.plan,
            method="mpesa_auto",
            tx_ref=result["tx_ref"],
            phone=payload.phone,
            amount=result["amount"],
            status="pending",
        )
        db.add(p)

        n = Notification(
            user_id=current_user.id,
            type="system",
            title="M-Pesa payment initiated",
            message=f"Complete the M-Pesa payment of KSh {result['amount']} for {payload.plan.upper()} plan. You'll be upgraded automatically once payment is verified.",
        )
        db.add(n)
        db.commit()

    return result


@router.get("/verify/{tx_ref}")
async def verify_tx(
    tx_ref: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success, data = await verify_payment(tx_ref)

    if success:
        payment = db.query(Payment).filter(Payment.tx_ref == tx_ref).first()
        if payment and payment.status != "approved":
            payment.status = "approved"
            from datetime import datetime, timezone
            payment.approved_at = datetime.now(timezone.utc)

            user = db.query(User).filter(User.id == payment.user_id).first()
            if user:
                user.subscription_plan = payment.plan

                if data.get("billing") == "annual":
                    from datetime import timedelta
                    user.tier_trial_expires = datetime.now(timezone.utc) + timedelta(days=365)

                n = Notification(
                    user_id=user.id,
                    type="system",
                    title=f"Plan upgraded to {payment.plan.upper()}!",
                    message="Your M-Pesa payment was verified automatically. Enjoy your new features!",
                )
                db.add(n)

                try:
                    from app.routers.referrals import process_upgrade_reward
                    process_upgrade_reward(user.id, db)
                except Exception:
                    pass

            db.commit()
            return {"status": "approved", "plan": payment.plan, "auto_upgraded": True}

        return {"status": "already_approved", "plan": payment.plan if payment else None}

    return {"status": "failed", "message": data.get("message", "Verification failed")}


@router.get("/pricing")
def pricing():
    return get_pricing()
