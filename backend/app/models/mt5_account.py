from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MT5Account(Base):
    __tablename__ = "mt5_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_number = Column(String, nullable=False)
    password_encrypted = Column(String, nullable=False)
    server = Column(String, nullable=False)
    broker_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_connected = Column(Boolean, default=False)
    last_balance = Column(Float, nullable=True)   # last known account balance
    last_equity  = Column(Float, nullable=True)   # last known account equity
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="mt5_accounts")
