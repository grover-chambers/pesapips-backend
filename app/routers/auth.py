from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserLogin, Token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
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


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


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


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id":                current_user.id,
        "email":             current_user.email,
        "display_name":      getattr(current_user, "display_name", None),
        "subscription_plan": getattr(current_user, "subscription_plan", "free"),
        "is_active":         getattr(current_user, "is_active", True),
        "is_admin":          getattr(current_user, "is_admin", False),
        "is_verified":       getattr(current_user, "is_verified", False),
        "points_balance":    getattr(current_user, "points_balance", 0),
        "created_at":        current_user.created_at.isoformat() if hasattr(current_user, "created_at") and current_user.created_at else None,
        "onboarded":         getattr(current_user, "onboarded", False),
    }
def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.onboarded = True
    db.commit()
    return {"status": "ok", "onboarded": True}
