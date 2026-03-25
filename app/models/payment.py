from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Payment(Base):
    __tablename__ = "payments"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan       = Column(String(50), nullable=False)
    method     = Column(String(50), nullable=False)
    tx_ref     = Column(String(200), nullable=False)
    phone      = Column(String(50), nullable=True)
    amount     = Column(Integer, nullable=False)
    status     = Column(String(50), default="pending")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at= Column(DateTime, nullable=True)
    user       = relationship("User", back_populates="payments")
