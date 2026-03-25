from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    type       = Column(String(50), default="info")
    title      = Column(String(200), nullable=False)
    message    = Column(Text, nullable=False)
    read       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user       = relationship("User", back_populates="notifications")

class Message(Base):
    __tablename__ = "messages"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    subject    = Column(String(200), nullable=False)
    body       = Column(Text, nullable=False)
    from_name  = Column(String(100), default="PesaPips")
    read       = Column(Boolean, default=False)
    broadcast  = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    user       = relationship("User", back_populates="messages")
