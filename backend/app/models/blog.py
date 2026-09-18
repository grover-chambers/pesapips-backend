from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class BlogPost(Base):
    __tablename__ = "blog_posts"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    title        = Column(String(300), nullable=False)
    slug         = Column(String(320), unique=True, nullable=False, index=True)
    excerpt      = Column(String(500), nullable=True)
    content      = Column(Text, nullable=False)
    category     = Column(String(100), default="General")
    cover_image  = Column(String(500), nullable=True)
    status       = Column(String(20), default="pending")  # pending|published|rejected|draft
    admin_note   = Column(Text, nullable=True)
    is_featured  = Column(Boolean, default=False)
    seo_title    = Column(String(300), nullable=True)
    seo_desc     = Column(String(500), nullable=True)
    views        = Column(Integer, default=0)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    published_at = Column(DateTime(timezone=True), nullable=True)
    author       = relationship("User", back_populates="blog_posts")
