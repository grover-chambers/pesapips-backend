from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CourseModule(Base):
    __tablename__ = "course_modules"

    id            = Column(Integer, primary_key=True, index=True)
    title         = Column(String, nullable=False)
    description   = Column(Text, nullable=True)
    track         = Column(String, default="basics")       # basics | coursework
    tier_required = Column(String, default="free")         # free | pro | elite
    order         = Column(Integer, default=0)
    is_published  = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    lessons = relationship("CourseLesson", back_populates="module", cascade="all, delete-orphan", order_by="CourseLesson.order")


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id          = Column(Integer, primary_key=True, index=True)
    module_id   = Column(Integer, ForeignKey("course_modules.id"), nullable=False)
    title       = Column(String, nullable=False)
    content     = Column(Text, nullable=True)              # markdown
    video_url   = Column(String, nullable=True)
    duration    = Column(String, nullable=True)            # e.g. "5 min"
    order       = Column(Integer, default=0)
    is_published= Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    module   = relationship("CourseModule", back_populates="lessons")
    quizzes  = relationship("CourseQuiz", back_populates="lesson", cascade="all, delete-orphan")
    progress = relationship("UserProgress", back_populates="lesson", cascade="all, delete-orphan")


class CourseQuiz(Base):
    __tablename__ = "course_quizzes"

    id             = Column(Integer, primary_key=True, index=True)
    lesson_id      = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    question       = Column(Text, nullable=False)
    options        = Column(JSON, nullable=False)           # ["A", "B", "C", "D"]
    correct_answer = Column(Integer, nullable=False)        # index into options
    explanation    = Column(Text, nullable=True)            # shown after answer
    points_awarded = Column(Integer, default=10)
    order          = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("CourseLesson", back_populates="quizzes")


class UserProgress(Base):
    __tablename__ = "user_progress"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id    = Column(Integer, ForeignKey("course_lessons.id"), nullable=False)
    completed    = Column(Boolean, default=False)
    quiz_score   = Column(Integer, nullable=True)           # points earned from quiz
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    lesson = relationship("CourseLesson", back_populates="progress")
