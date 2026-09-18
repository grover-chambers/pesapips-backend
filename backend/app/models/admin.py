from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject     = Column(String, nullable=False)
    body        = Column(Text, nullable=False)
    type        = Column(String, default="general")   # general | bug | feature | billing
    status      = Column(String, default="open")      # open | in_progress | resolved | closed
    priority    = Column(String, default="medium")    # low | medium | high | critical
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    notes = relationship("TicketNote", back_populates="ticket", cascade="all, delete-orphan")


class TicketNote(Base):
    __tablename__ = "ticket_notes"

    id         = Column(Integer, primary_key=True, index=True)
    ticket_id  = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    admin_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    body       = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("SupportTicket", back_populates="notes")


class Announcement(Base):
    __tablename__ = "announcements"

    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String, nullable=False)
    body         = Column(Text, nullable=False)
    type         = Column(String, default="info")     # info | warning | success | critical
    target_plan  = Column(String, default="all")      # all | free | pro | elite
    is_active    = Column(Boolean, default=True)
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at   = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
