from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserLogin, Token
from app.dependencies import get_current_user
from app.core.email import email_welcome, email_password_reset, send_email
from app.models.password_reset import PasswordResetToken
from datetime import datetime, timedelta, timezone
import secrets

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        email_welcome(user.email, user.email.split('@')[0])
    except Exception:
        pass

    return user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(
    email: str,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If your email is registered, you will receive a password reset link."}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
        used=False
    )
    db.add(reset)
    db.commit()

    reset_link = f"https://pesapips.vercel.app/reset-password?token={token}"
    html = f"""
    <h2>Reset your PesaPips password</h2>
    <p>Click the link below to reset your password. This link expires in 24 hours.</p>
    <p><a href="{reset_link}" class="btn">Reset Password →</a></p>
    <p>If you didn't request this, ignore this email.</p>
    """
    send_email(email, "Reset your PesaPips password", html)

    return {"message": "If your email is registered, you will receive a password reset link."}


@router.post("/reset-password")
def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.expires_at > datetime.now(timezone.utc),
        PasswordResetToken.used == False
    ).first()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.hashed_password = hash_password(new_password)
    reset.used = True
    db.commit()

    return {"message": "Password reset successful. You can now log in with your new password."}


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


class UpdateProfilePayload(BaseModel):
    display_name: str = None


class NotificationPrefsPayload(BaseModel):
    email_trades: bool = True
    email_signals: bool = True
    email_news: bool = True
    push_trades: bool = True
    push_signals: bool = True


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "display_name": current_user.display_name,
        "subscription_plan": current_user.subscription_plan or "free",
        "is_active": current_user.is_active,
        "is_admin": current_user.is_admin,
        "is_verified": current_user.is_verified,
        "points_balance": current_user.points_balance or 0,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "onboarded": current_user.onboarded or False,
        "notification_prefs": current_user.notification_prefs if hasattr(current_user, "notification_prefs") and current_user.notification_prefs else {},
    }


@router.post("/change-password")
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.patch("/me")
def update_profile(
    payload: UpdateProfilePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/notifications")
def save_notifications(
    payload: NotificationPrefsPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if hasattr(current_user, "notification_prefs"):
        import json
        current_user.notification_prefs = json.dumps(payload.model_dump())
        db.commit()
    return {"message": "Preferences saved"}


@router.post("/onboarding/complete")
def complete_onboarding(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.onboarded = True
    db.commit()
    db.refresh(current_user)
    return {"message": "Onboarding completed", "onboarded": True}
