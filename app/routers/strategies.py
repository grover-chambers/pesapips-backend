from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.strategy import Strategy, UserStrategy
from app.models.user import User
from app.schemas.strategy import StrategyOut, UserStrategyCreate, UserStrategyUpdate, UserStrategyOut
from app.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/strategies", tags=["Strategies"])


@router.get("/", response_model=List[StrategyOut])
def list_strategies(db: Session = Depends(get_db)):
    return db.query(Strategy).filter(Strategy.is_public == True).all()


@router.post("/apply", response_model=UserStrategyOut, status_code=201)
def apply_strategy(
    payload: UserStrategyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    strategy = db.query(Strategy).filter(Strategy.id == payload.strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    params = payload.custom_params or strategy.default_params

    user_strategy = UserStrategy(
        user_id=current_user.id,
        strategy_id=payload.strategy_id,
        custom_params=params,
        asset=payload.asset,
        timeframe=payload.timeframe,
    )
    db.add(user_strategy)
    db.commit()
    db.refresh(user_strategy)
    return user_strategy


@router.put("/update/{user_strategy_id}", response_model=UserStrategyOut)
def update_strategy(
    user_strategy_id: int,
    payload: UserStrategyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    us = db.query(UserStrategy).filter(
        UserStrategy.id == user_strategy_id,
        UserStrategy.user_id == current_user.id,
    ).first()
    if not us:
        raise HTTPException(status_code=404, detail="User strategy not found")

    us.custom_params = payload.custom_params
    if payload.asset:
        us.asset = payload.asset
    if payload.timeframe:
        us.timeframe = payload.timeframe
    db.commit()
    db.refresh(us)
    return us


@router.get("/mine", response_model=List[UserStrategyOut])
def my_strategies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(UserStrategy).filter(UserStrategy.user_id == current_user.id).all()


@router.patch("/{strategy_id}")
def update_strategy(
    strategy_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    us = db.query(UserStrategy).filter(
        UserStrategy.id == strategy_id,
        UserStrategy.user_id == current_user.id,
    ).first()
    if not us:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if "custom_params" in payload:
        us.custom_params = payload["custom_params"]
    db.commit()
    db.refresh(us)
    return us
