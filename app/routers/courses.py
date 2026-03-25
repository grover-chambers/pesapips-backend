from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.course import CourseModule, CourseLesson, CourseQuiz, UserProgress

router = APIRouter(prefix="/courses", tags=["Courses"])

TIER_ORDER = {"free": 0, "pro": 1, "elite": 2}


def user_tier_level(user: User) -> int:
    plan = (user.subscription_plan or "free").lower()
    return TIER_ORDER.get(plan, 0)


def can_access(user: User, tier_required: str) -> bool:
    return user_tier_level(user) >= TIER_ORDER.get(tier_required, 0)


# ── SCHEMAS ──────────────────────────────────────────────────────────────────

class QuizOut(BaseModel):
    id: int
    question: str
    options: list
    points_awarded: int
    order: int
    model_config = {"from_attributes": True}


class LessonOut(BaseModel):
    id: int
    module_id: int
    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[str] = None
    order: int
    is_published: bool
    quiz_count: int = 0
    completed: bool = False
    quiz_score: Optional[int] = None
    model_config = {"from_attributes": True}


class ModuleOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    track: str
    tier_required: str
    order: int
    is_published: bool
    lesson_count: int = 0
    completed_count: int = 0
    locked: bool = False
    model_config = {"from_attributes": True}


class QuizSubmit(BaseModel):
    lesson_id: int
    quiz_id: int
    answer: int


class RedeemPoints(BaseModel):
    points: int
    target_tier: str


# ── ADMIN SCHEMAS ─────────────────────────────────────────────────────────────

class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    track: str = "basics"
    tier_required: str = "free"
    order: int = 0
    is_published: bool = False


class LessonCreate(BaseModel):
    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[str] = None
    order: int = 0
    is_published: bool = False


class QuizCreate(BaseModel):
    question: str
    options: list
    correct_answer: int
    explanation: Optional[str] = None
    points_awarded: int = 10
    order: int = 0


# ── USER ENDPOINTS ────────────────────────────────────────────────────────────

@router.get("/")
def list_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    modules = db.query(CourseModule).filter(
        CourseModule.is_published == True
    ).order_by(CourseModule.track, CourseModule.order).all()

    # Get user progress counts
    completed_lessons = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.completed == True,
    ).all()
    completed_ids = {p.lesson_id for p in completed_lessons}

    result = []
    for m in modules:
        published_lessons = [l for l in m.lessons if l.is_published]
        completed_in_module = sum(1 for l in published_lessons if l.id in completed_ids)
        result.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "track": m.track,
            "tier_required": m.tier_required,
            "order": m.order,
            "is_published": m.is_published,
            "lesson_count": len(published_lessons),
            "completed_count": completed_in_module,
            "locked": not can_access(current_user, m.tier_required),
        })
    return result


@router.get("/{module_id}/lessons")
def list_lessons(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    if not can_access(current_user, module.tier_required):
        raise HTTPException(status_code=403, detail=f"This module requires {module.tier_required} plan")

    lessons = db.query(CourseLesson).filter(
        CourseLesson.module_id == module_id,
        CourseLesson.is_published == True,
    ).order_by(CourseLesson.order).all()

    progress_map = {}
    for p in db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.lesson_id.in_([l.id for l in lessons]),
    ).all():
        progress_map[p.lesson_id] = p

    result = []
    for l in lessons:
        p = progress_map.get(l.id)
        result.append({
            "id": l.id,
            "module_id": l.module_id,
            "title": l.title,
            "content": l.content,
            "video_url": l.video_url,
            "duration": l.duration,
            "order": l.order,
            "is_published": l.is_published,
            "quiz_count": len(l.quizzes),
            "completed": p.completed if p else False,
            "quiz_score": p.quiz_score if p else None,
        })
    return result


@router.get("/{module_id}/lessons/{lesson_id}/quizzes")
def get_lesson_quizzes(
    module_id: int,
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    module = db.query(CourseModule).filter(CourseModule.id == lesson.module_id).first()
    if not can_access(current_user, module.tier_required):
        raise HTTPException(status_code=403, detail="Access denied")

    quizzes = db.query(CourseQuiz).filter(
        CourseQuiz.lesson_id == lesson_id
    ).order_by(CourseQuiz.order).all()

    # Don't send correct_answer to frontend
    return [{
        "id": q.id,
        "question": q.question,
        "options": q.options,
        "points_awarded": q.points_awarded,
        "order": q.order,
    } for q in quizzes]


@router.post("/complete/{lesson_id}")
def mark_complete(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    existing = db.query(UserProgress).filter(
        and_(UserProgress.user_id == current_user.id, UserProgress.lesson_id == lesson_id)
    ).first()

    if existing and existing.completed:
        return {"message": "Already completed", "points_earned": 0}

    if existing:
        existing.completed = True
        existing.completed_at = datetime.now(timezone.utc)
    else:
        existing = UserProgress(
            user_id=current_user.id,
            lesson_id=lesson_id,
            completed=True,
            completed_at=datetime.now(timezone.utc),
        )
        db.add(existing)

    # Award 5 points for completing a lesson
    current_user.points_balance = (current_user.points_balance or 0) + 5
    db.commit()

    return {"message": "Lesson completed", "points_earned": 5, "total_points": current_user.points_balance}


@router.post("/quiz/submit")
def submit_quiz(
    payload: QuizSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quiz = db.query(CourseQuiz).filter(CourseQuiz.id == payload.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    correct = payload.answer == quiz.correct_answer
    points_earned = quiz.points_awarded if correct else 0

    if correct:
        current_user.points_balance = (current_user.points_balance or 0) + points_earned
        db.commit()

    return {
        "correct": correct,
        "correct_answer": quiz.correct_answer,
        "explanation": quiz.explanation,
        "points_earned": points_earned,
        "total_points": current_user.points_balance,
    }


@router.get("/progress/summary")
def progress_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_lessons = db.query(CourseLesson).filter(CourseLesson.is_published == True).count()
    completed = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.completed == True,
    ).count()

    # Check if trial is still active
    trial_active = False
    trial_expires = None
    if current_user.tier_trial_expires:
        trial_active = current_user.tier_trial_expires > datetime.now(timezone.utc)
        trial_expires = current_user.tier_trial_expires

    return {
        "total_lessons": total_lessons,
        "completed_lessons": completed,
        "progress_pct": round(completed / total_lessons * 100, 1) if total_lessons > 0 else 0,
        "points_balance": current_user.points_balance or 0,
        "trial_active": trial_active,
        "trial_expires": trial_expires,
        "current_plan": current_user.subscription_plan or "free",
    }


@router.post("/redeem")
def redeem_points(
    payload: RedeemPoints,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    REDEMPTION_COSTS = {"pro": 100, "elite": 200}
    TRIAL_DAYS = {"pro": 7, "elite": 3}

    cost = REDEMPTION_COSTS.get(payload.target_tier)
    if not cost:
        raise HTTPException(status_code=400, detail="Invalid tier")

    if (current_user.points_balance or 0) < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough points. Need {cost}, have {current_user.points_balance or 0}"
        )

    current_user.points_balance -= cost
    days = TRIAL_DAYS[payload.target_tier]
    current_user.tier_trial_expires = datetime.now(timezone.utc) + timedelta(days=days)
    db.commit()

    return {
        "message": f"{days}-day {payload.target_tier} trial activated",
        "trial_expires": current_user.tier_trial_expires,
        "points_remaining": current_user.points_balance,
    }


# ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────

def require_admin(current_user: User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/admin/modules")
def admin_list_modules(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    modules = db.query(CourseModule).order_by(CourseModule.track, CourseModule.order).all()
    return [{
        "id": m.id, "title": m.title, "description": m.description,
        "track": m.track, "tier_required": m.tier_required,
        "order": m.order, "is_published": m.is_published,
        "lesson_count": len(m.lessons),
    } for m in modules]


@router.post("/admin/modules")
def admin_create_module(
    payload: ModuleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    m = CourseModule(**payload.model_dump())
    db.add(m); db.commit(); db.refresh(m)
    return m


@router.patch("/admin/modules/{module_id}")
def admin_update_module(
    module_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    m = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not m: raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(m, k): setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m


@router.delete("/admin/modules/{module_id}")
def admin_delete_module(
    module_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    m = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not m: raise HTTPException(status_code=404, detail="Not found")
    db.delete(m); db.commit()
    return {"deleted": True}


@router.post("/admin/modules/{module_id}/lessons")
def admin_create_lesson(
    module_id: int,
    payload: LessonCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    l = CourseLesson(module_id=module_id, **payload.model_dump())
    db.add(l); db.commit(); db.refresh(l)
    return l


@router.patch("/admin/lessons/{lesson_id}")
def admin_update_lesson(
    lesson_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    l = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not l: raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(l, k): setattr(l, k, v)
    db.commit(); db.refresh(l)
    return l


@router.delete("/admin/lessons/{lesson_id}")
def admin_delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    l = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not l: raise HTTPException(status_code=404, detail="Not found")
    db.delete(l); db.commit()
    return {"deleted": True}


@router.post("/admin/lessons/{lesson_id}/quizzes")
def admin_create_quiz(
    lesson_id: int,
    payload: QuizCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = CourseQuiz(lesson_id=lesson_id, **payload.model_dump())
    db.add(q); db.commit(); db.refresh(q)
    return q


@router.patch("/admin/quizzes/{quiz_id}")
def admin_update_quiz(
    quiz_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(CourseQuiz).filter(CourseQuiz.id == quiz_id).first()
    if not q: raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(q, k): setattr(q, k, v)
    db.commit(); db.refresh(q)
    return q


@router.delete("/admin/quizzes/{quiz_id}")
def admin_delete_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(CourseQuiz).filter(CourseQuiz.id == quiz_id).first()
    if not q: raise HTTPException(status_code=404, detail="Not found")
    db.delete(q); db.commit()
    return {"deleted": True}
