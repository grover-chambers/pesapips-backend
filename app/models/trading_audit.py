from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SignalAudit(Base):
    __tablename__ = "signal_audit"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    timeframe = Column(String(10), nullable=False)
    signal = Column(String(10), nullable=False)
    confidence = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    price_at_signal = Column(Float, nullable=True)
    sl_price = Column(Float, nullable=True)
    tp_price = Column(Float, nullable=True)
    regime = Column(String(30), nullable=True)
    regime_confidence = Column(Integer, nullable=True)
    strategy_id = Column(Integer, nullable=True)
    strategy_name = Column(String(100), nullable=True)
    strategy_fit = Column(String(20), nullable=True)
    lot_size = Column(Float, nullable=True)
    data_source = Column(String(20), default="live")
    is_auto = Column(Boolean, default=False)
    mt5_ticket = Column(Integer, nullable=True)
    exit_price = Column(Float, nullable=True)
    exit_time = Column(DateTime(timezone=True), nullable=True)
    pnl = Column(Float, nullable=True)
    result = Column(String(10), nullable=True)
    pnl_points = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_signal_audit_user_time", "user_id", "created_at"),
        Index("ix_signal_audit_symbol", "symbol", "created_at"),
    )


class ReferralCode(Base):
    __tablename__ = "referral_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    code = Column(String(20), nullable=False, unique=True, index=True)
    uses = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReferralUse(Base):
    __tablename__ = "referral_uses"

    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    reward_months = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaperTrade(Base):
    __tablename__ = "paper_trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    trade_type = Column(String(10), nullable=False)
    lot = Column(Float, default=0.01)
    entry_price = Column(Float, nullable=False)
    sl = Column(Float, nullable=True)
    tp = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    profit = Column(Float, default=0.0)
    status = Column(String, default="open")
    strategy_name = Column(String(100), nullable=True)
    signal_audit_id = Column(Integer, ForeignKey("signal_audit.id"), nullable=True)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)
