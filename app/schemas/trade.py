from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TradeOut(BaseModel):
    id: int
    symbol: str
    trade_type: str
    lot: float
    entry_price: Optional[float]
    exit_price: Optional[float]
    sl: Optional[float]
    tp: Optional[float]
    profit: float
    status: str
    strategy_name: Optional[str]
    opened_at: datetime
    closed_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DashboardSummary(BaseModel):
    balance: float
    equity: float
    daily_pnl: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    winrate: float
    max_drawdown: float
    active_strategy: Optional[str]
