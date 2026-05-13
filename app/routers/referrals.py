"""
Referral program endpoints.
Each user gets a code. When a referred user upgrades, referrer gets 1 month free.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import secrets

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trading_audit import ReferralCode, ReferralUse
from app.models.notification import Notification

router = APIRouter(prefix="/referrals", tags=["Referrals"])


@router.get("/my-code")
def get_my_referral_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(ReferralCode).filter(ReferralCode.user_id == current_user.id).first()
    if existing:
        uses = db.query(ReferralUse).filter(ReferralUse.referrer_id == current_user.id).count()
        return {"code": existing.code, "uses": existing.uses, "total_referrals": uses}

    code = f"PP-{current_user.id}-{secrets.token_hex(3).upper()}"
    ref = ReferralCode(user_id=current_user.id, code=code)
    db.add(ref)
    db.commit()
    db.refresh(ref)
    return {"code": ref.code, "uses": 0, "total_referrals": 0}


@router.post("/apply")
def apply_referral_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ref_code = db.query(ReferralCode).filter(ReferralCode.code == code).first()
    if not ref_code:
        raise HTTPException(status_code=404, detail="Invalid referral code")

    if ref_code.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")

    already_used = db.query(ReferralUse).filter(ReferralUse.referred_id == current_user.id).first()
    if already_used:
        raise HTTPException(status_code=400, detail="You have already applied a referral code")

    use = ReferralUse(referrer_id=ref_code.user_id, referred_id=current_user.id, reward_months=0)
    db.add(use)
    ref_code.uses += 1

    n = Notification(
        user_id=current_user.id,
        type="system",
        title="Referral code applied!",
        message=f"You applied referral code {code}. Your referrer will be rewarded when you upgrade to a paid plan.",
    )
    db.add(n)
    db.commit()
    return {"status": "applied", "message": "Referral code applied successfully"}


@router.get("/my-referrals")
def my_referrals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    referrals = db.query(ReferralUse).filter(ReferralUse.referrer_id == current_user.id).all()
    results = []
    for ref in referrals:
        referred_user = db.query(User).filter(User.id == ref.referred_id).first()
        results.append({
            "referred_email": referred_user.email if referred_user else "Unknown",
            "referred_plan": referred_user.subscription_plan if referred_user else "unknown",
            "reward_months": ref.reward_months,
            "created_at": ref.created_at.isoformat() if ref.created_at else None,
        })
    return {"referrals": results, "total": len(results)}


@router.post("/process-upgrade-reward")
def process_upgrade_reward(
    referred_user_id: int,
    db: Session = Depends(get_db),
):
    referral_use = db.query(ReferralUse).filter(
        ReferralUse.referred_id == referred_user_id,
        ReferralUse.reward_months == 0,
    ).first()
    if not referral_use:
        return {"status": "no_reward", "message": "No pending referral reward"}

    referral_use.reward_months = 1
    referrer = db.query(User).filter(User.id == referral_use.referrer_id).first()
    if referrer:
        n = Notification(
            user_id=referrer.id,
            type="system",
            title="Referral reward earned!",
            message="Your referral upgraded to a paid plan! You've earned 1 month free on your current plan.",
        )
        db.add(n)

        if referrer.tier_trial_expires and referrer.tier_trial_expires > datetime.now(timezone.utc):
            referrer.tier_trial_expires += timedelta(days=30)
        else:
            referrer.tier_trial_expires = datetime.now(timezone.utc) + timedelta(days=30)

    db.commit()
    return {"status": "rewarded", "referrer_id": referral_use.referrer_id}
