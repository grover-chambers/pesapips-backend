from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.encryption import encrypt, decrypt
from app.models.mt5_account import MT5Account
from app.models.user import User
from app.schemas.mt5_account import MT5AccountCreate, MT5AccountOut
from app.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/mt5", tags=["MT5"])


@router.post("/connect", response_model=MT5AccountOut, status_code=201)
def connect_account(
    payload: MT5AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(MT5Account).filter(
        MT5Account.user_id == current_user.id,
        MT5Account.account_number == payload.account_number,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Account already connected")

    account = MT5Account(
        user_id=current_user.id,
        account_number=payload.account_number,
        password_encrypted=encrypt(payload.password),
        server=payload.server,
        broker_name=payload.broker_name,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/accounts", response_model=List[MT5AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(MT5Account).filter(MT5Account.user_id == current_user.id).all()


@router.delete("/disconnect/{account_id}", status_code=204)
def disconnect_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = db.query(MT5Account).filter(
        MT5Account.id == account_id,
        MT5Account.user_id == current_user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
