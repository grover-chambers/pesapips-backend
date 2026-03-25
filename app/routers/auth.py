from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserLogin, Token
from app.dependencies import get_current_user
from app.core.email import send_welcome_email
from app.core.email import email_welcome, email_password_reset
from app.models.password_reset import PasswordResetToken
import secrets
from datetime import datetime, timedelta
from app.core.email import email_welcome, email_password_reset, send_email

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
        print(f"Welcome email sent to {user.email}")
    except Exception as e:
        print(f"Welcome email failed: {e}")

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
    """Request a password reset email"""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If your email is registered, you will receive a password reset link."}

    # Generate reset token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=24)

    # Store token
    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    used=False
    )
    db.add(reset)
    db.commit()

    # Send email with reset link
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
    """Reset password using a valid token"""
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.expires_at > datetime.utcnow(),
        PasswordResetToken.used == False
    ).first()

    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # Update password
    user.hashed_password = hash_password(new_password)
    reset.used = True
    db.commit()

    email_password_reset(user.email, user.display_name or user.email, new_password)

    return {"message": "Password reset successful. You can now log in with your new password."}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":                current_user.id,
        "email":             current_user.email,
        "display_name":      current_user.display_name if hasattr(current_user, "display_name") else None,
        "subscription_plan": current_user.subscription_plan if hasattr(current_user, "subscription_plan") and current_user.subscription_plan else "free",
        "is_active":         current_user.is_active if hasattr(current_user, "is_active") else True,
        "is_admin":          current_user.is_admin if hasattr(current_user, "is_admin") else False,
        "is_verified":       current_user.is_verified if hasattr(current_user, "is_verified") else False,
        "points_balance":    current_user.points_balance if hasattr(current_user, "points_balance") and current_user.points_balance is not None else 0,
        "created_at":        current_user.created_at.isoformat() if hasattr(current_user, "created_at") and current_user.created_at else None,
        "onboarded":         current_user.onboarded if hasattr(current_user, "onboarded") else False,
    }
class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(
    payload: ChangePasswordPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.security import verify_password, hash_password
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.patch("/me")
def update_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed = {"display_name"}
    for k, v in payload.items():
        if k in allowed and hasattr(current_user, k):
            setattr(current_user, k, v)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/notifications")
def save_notifications(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Store notification prefs on user — add column if needed
    if hasattr(current_user, "notification_prefs"):
        current_user.notification_prefs = payload
        db.commit()
    return {"message": "Preferences saved"}


