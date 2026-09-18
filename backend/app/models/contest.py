"""Demo contest models — private-tool feature for running local trading
competitions on paper trades (no real money, no broker involved)."""
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text,
    UniqueConstraint, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Contest(Base):
    __tablename__ = "contests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    start_balance = Column(Float, default=10000.0)  # virtual starting balance per entrant
    start_at = Column(DateTime(timezone=True), nullable=False)
    end_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)       # admin toggles off to end a contest
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entries = relationship("ContestEntry", back_populates="contest",
                           cascade="all, delete-orphan")


class ContestEntry(Base):
    __tablename__ = "contest_entries"
    __table_args__ = (UniqueConstraint("contest_id", "user_id", name="uq_contest_user"),)

    id = Column(Integer, primary_key=True, index=True)
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    initial_balance = Column(Float, nullable=False)  # snapshot at join time
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    contest = relationship("Contest", back_populates="entries")
