from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class StrategyOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    default_params: dict
    is_public: bool

    model_config = {"from_attributes": True}


class UserStrategyCreate(BaseModel):
    strategy_id: int
    asset: str = "XAUUSD"
    timeframe: str = "M5"
    custom_params: Optional[dict] = None


class UserStrategyUpdate(BaseModel):
    custom_params: dict
    asset: Optional[str] = None
    timeframe: Optional[str] = None


class UserStrategyOut(BaseModel):
    id: int
    strategy_id: int
    asset: str
    timeframe: str
    custom_params: dict
    is_active: bool
    backtest_result: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}
