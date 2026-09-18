from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MT5AccountCreate(BaseModel):
    account_number: str
    password: str
    server: str
    broker_name: Optional[str] = None


class MT5AccountOut(BaseModel):
    id: int
    account_number: str
    server: str
    broker_name: Optional[str]
    is_active: bool
    is_connected: bool
    created_at: datetime

    model_config = {"from_attributes": True}
