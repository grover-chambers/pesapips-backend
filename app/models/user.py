from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    subscription_plan = Column(String, default="free")
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    is_admin           = Column(Boolean, default=False)
    display_name       = Column(String, nullable=True)
    points_balance     = Column(Integer, default=0)
    tier_trial_expires = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    onboarded          = Column(Boolean, default=False)
    autorun_active      = Column(Boolean, default=False)
    autorun_strategy_id = Column(Integer, nullable=True)

    mt5_accounts = relationship("MT5Account", back_populates="user", cascade="all, delete")
    user_strategies = relationship("UserStrategy", back_populates="user", cascade="all, delete")
    trades = relationship("Trade", back_populates="user", cascade="all, delete")
    performance_logs = relationship("PerformanceLog", back_populates="user", cascade="all, delete")
    notifications    = relationship("Notification", back_populates="user", cascade="all, delete")
    messages         = relationship("Message", back_populates="user", cascade="all, delete")
    payments          = relationship("Payment", back_populates="user", cascade="all, delete")
    blog_posts        = relationship("BlogPost", back_populates="author", cascade="all, delete")
