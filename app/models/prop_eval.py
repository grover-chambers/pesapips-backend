"""
Prop-firm evaluation tracking.

The "rule book" for passing an evaluation (FTMO, FundedNext, custom) and
the status snapshots pushed by the local prop-eval agent.

The rule book is enforced in CODE by app/services/prop_eval_engine.py — the
LLM proposes trades, the rule book decides whether they may be placed.
"""
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from app.core.database import Base


class PropEvalSettings(Base):
    __tablename__ = "prop_eval_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Which prop firm's rules this book models
    provider = Column(String(20), default="ftmo")  # ftmo | fundednext | custom
    phase = Column(Integer, default=1)             # 1 or 2

    # ── The rule book ────────────────────────────────────────────────
    account_size = Column(Float, default=100000.0)
    profit_target_pct = Column(Float, default=10.0)     # current phase target
    max_daily_loss_pct = Column(Float, default=2.0)     # stop trading for the day at this
    max_total_drawdown_pct = Column(Float, default=5.0) # breach = eval failed
    min_trading_days = Column(Integer, default=5)       # must trade at least this many days
    risk_per_trade_pct = Column(Float, default=0.5)     # risk per trade (% of balance)
    max_open_trades = Column(Integer, default=2)
    max_consecutive_losses = Column(Integer, default=3)

    # Instrument universe (list of MT5 symbols, e.g. ["XAUUSD","EURUSD","US30"])
    instruments = Column(JSON, default=list)

    # ── Behaviour ───────────────────────────────────────────────────
    auto_execute = Column(Boolean, default=False)   # True: place orders automatically
    stop_on_daily_loss = Column(Boolean, default=True)  # hard stop after daily loss hit
    news_guard_enabled = Column(Boolean, default=True)  # avoid trading around news
    hold_over_weekend = Column(Boolean, default=False)  # close positions before weekend

    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "phase": self.phase,
            "account_size": self.account_size,
            "profit_target_pct": self.profit_target_pct,
            "max_daily_loss_pct": self.max_daily_loss_pct,
            "max_total_drawdown_pct": self.max_total_drawdown_pct,
            "min_trading_days": self.min_trading_days,
            "risk_per_trade_pct": self.risk_per_trade_pct,
            "max_open_trades": self.max_open_trades,
            "max_consecutive_losses": self.max_consecutive_losses,
            "instruments": self.instruments or [],
            "auto_execute": self.auto_execute,
            "stop_on_daily_loss": self.stop_on_daily_loss,
            "news_guard_enabled": self.news_guard_enabled,
            "hold_over_weekend": self.hold_over_weekend,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class PropEvalSnapshot(Base):
    """Latest progress snapshot pushed by the local agent (one row per push)."""
    __tablename__ = "prop_eval_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Account state
    balance = Column(Float, nullable=True)
    equity = Column(Float, nullable=True)
    peak_balance = Column(Float, nullable=True)
    day_start_balance = Column(Float, nullable=True)
    open_trades = Column(Integer, default=0)

    # Derived risk state
    daily_loss_pct = Column(Float, nullable=True)
    drawdown_pct = Column(Float, nullable=True)
    profit_pct = Column(Float, nullable=True)
    trading_days_logged = Column(Integer, default=0)

    # Verdict
    phase = Column(Integer, default=1)
    status = Column(String(20), default="running")  # running | blocked | passed | failed
    reason = Column(String(200), nullable=True)

    last_error = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "balance": self.balance,
            "equity": self.equity,
            "peak_balance": self.peak_balance,
            "day_start_balance": self.day_start_balance,
            "open_trades": self.open_trades,
            "daily_loss_pct": self.daily_loss_pct,
            "drawdown_pct": self.drawdown_pct,
            "profit_pct": self.profit_pct,
            "trading_days_logged": self.trading_days_logged,
            "phase": self.phase,
            "status": self.status,
            "reason": self.reason,
            "last_error": self.last_error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
