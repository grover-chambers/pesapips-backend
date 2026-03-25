from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.notification import Notification, Message
from app.models.payment import Payment
from app.models.trade import Trade
from app.models.course import CourseModule, CourseLesson, UserProgress
from app.models.admin import SupportTicket, TicketNote, Announcement

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ── OVERVIEW METRICS ─────────────────────────────────────────────────────────

@router.get("/metrics")
def get_metrics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = db.query(User).count()
    plan_counts = {
        "free":  db.query(User).filter(User.subscription_plan == "free").count(),
        "pro":   db.query(User).filter(User.subscription_plan == "pro").count(),
        "elite": db.query(User).filter(User.subscription_plan == "elite").count(),
    }
    new_today    = db.query(User).filter(User.created_at >= today_start).count()
    new_this_week = db.query(User).filter(User.created_at >= week_ago).count()

    # Signups per day last 7 days
    signups_7d = []
    for i in range(6, -1, -1):
        day_start = now - timedelta(days=i)
        day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day_start + timedelta(days=1)
        count = db.query(User).filter(
            User.created_at >= day_start,
            User.created_at < day_end
        ).count()
        signups_7d.append({"date": day_start.strftime("%d %b"), "count": count})

    trades_today = db.query(Trade).filter(Trade.opened_at >= today_start).count()
    open_trades  = db.query(Trade).filter(Trade.status == "open").count()
    total_trades = db.query(Trade).count()

    # MRR estimate
    mrr = plan_counts["pro"] * 2500 + plan_counts["elite"] * 5000

    open_tickets     = db.query(SupportTicket).filter(SupportTicket.status == "open").count()
    unread_feedback  = 0
    try:
        from sqlalchemy import text
        with db.bind.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM user_feedback WHERE is_read = FALSE"))
            unread_feedback = result.scalar() or 0
    except Exception:
        pass

    # ── Platform usage metrics ───────────────────────────────────────────────
    from app.models.strategy import UserStrategy, Strategy
    from sqlalchemy import func as sqlfunc

    # Active strategies count
    active_strategies = db.query(UserStrategy).filter(UserStrategy.is_active == True).count()

    # Most used strategies
    top_strategies = db.query(
        Strategy.name,
        sqlfunc.count(UserStrategy.id).label("count")
    ).join(UserStrategy, UserStrategy.strategy_id == Strategy.id)     .group_by(Strategy.name)     .order_by(sqlfunc.count(UserStrategy.id).desc())     .limit(5).all()

    # Most watched assets
    top_assets = db.query(
        UserStrategy.asset,
        sqlfunc.count(UserStrategy.id).label("count")
    ).filter(UserStrategy.asset != None)     .group_by(UserStrategy.asset)     .order_by(sqlfunc.count(UserStrategy.id).desc())     .limit(5).all()

    # Autorun users (strategies that are active = autorun candidates)
    autorun_users = db.query(sqlfunc.count(sqlfunc.distinct(UserStrategy.user_id)))                     .filter(UserStrategy.is_active == True).scalar() or 0

    # Onboarded vs not
    onboarded_count = db.query(User).filter(User.onboarded == True).count()

    # Platinum plan count
    plan_counts["platinum"] = db.query(User).filter(User.subscription_plan == "platinum").count()

    return {
        "total_users":      total_users,
        "plan_counts":      plan_counts,
        "new_today":        new_today,
        "new_this_week":    new_this_week,
        "signups_7d":       signups_7d,
        "trades_today":     trades_today,
        "open_trades":      open_trades,
        "total_trades":     total_trades,
        "mrr_kes":          mrr,
        "open_tickets":     open_tickets,
        "unread_feedback":  unread_feedback,
        "active_strategies": active_strategies,
        "autorun_users":    autorun_users,
        "onboarded_count":  onboarded_count,
        "top_strategies":   [{"name": r.name, "count": r.count} for r in top_strategies],
        "top_assets":       [{"asset": r.asset, "count": r.count} for r in top_assets],
    }


# ── USER MANAGEMENT ───────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    search:  Optional[str] = Query(None),
    plan:    Optional[str] = Query(None),
    page:    int = Query(1, ge=1),
    limit:   int = Query(20, le=100),
    db:      Session = Depends(get_db),
    admin:   User = Depends(require_admin),
):
    q = db.query(User)
    if search:
        q = q.filter(
            (User.email.ilike(f"%{search}%")) |
            (User.display_name.ilike(f"%{search}%"))
        )
    if plan:
        q = q.filter(User.subscription_plan == plan)

    total = q.count()
    users = q.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = []
    for u in users:
        trade_count = db.query(Trade).filter(Trade.user_id == u.id).count()
        result.append({
            "id":                u.id,
            "email":             u.email,
            "display_name":      u.display_name,
            "subscription_plan": u.subscription_plan,
            "is_active":         u.is_active,
            "is_admin":          u.is_admin,
            "is_verified":       u.is_verified,
            "points_balance":    u.points_balance or 0,
            "created_at":        u.created_at.isoformat() if u.created_at else None,
            "trade_count":       trade_count,
        })

    return {"users": result, "total": total, "page": page, "pages": -(-total // limit)}


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db:      Session = Depends(get_db),
    admin:   User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    trade_count    = db.query(Trade).filter(Trade.user_id == u.id).count()
    open_trades    = db.query(Trade).filter(Trade.user_id == u.id, Trade.status == "open").count()
    completed_lessons = db.query(UserProgress).filter(
        UserProgress.user_id == u.id, UserProgress.completed == True
    ).count()

    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == u.id).order_by(
        desc(SupportTicket.created_at)
    ).limit(5).all()

    feedback = []
    try:
        from sqlalchemy import text
        with db.bind.connect() as conn:
            rows = conn.execute(text(
                "SELECT type, data, created_at FROM user_feedback WHERE user_id = :uid ORDER BY created_at DESC LIMIT 10"
            ), {"uid": user_id})
            for row in rows:
                feedback.append({"type": row[0], "data": row[1], "created_at": str(row[2])})
    except Exception:
        pass

    return {
        "id":                u.id,
        "email":             u.email,
        "display_name":      u.display_name,
        "subscription_plan": u.subscription_plan,
        "is_active":         u.is_active,
        "is_admin":          u.is_admin,
        "is_verified":       u.is_verified,
        "points_balance":    u.points_balance or 0,
        "tier_trial_expires":u.tier_trial_expires.isoformat() if u.tier_trial_expires else None,
        "created_at":        u.created_at.isoformat() if u.created_at else None,
        "trade_count":       trade_count,
        "open_trades":       open_trades,
        "completed_lessons": completed_lessons,
        "recent_tickets":    [{"id": t.id, "subject": t.subject, "status": t.status, "created_at": t.created_at.isoformat()} for t in tickets],
        "recent_feedback":   feedback,
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: dict,
    db:      Session = Depends(get_db),
    admin:   User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    allowed = {"subscription_plan", "is_active", "is_admin", "is_verified", "points_balance"}
    for k, v in payload.items():
        if k in allowed and hasattr(u, k):
            setattr(u, k, v)

    db.commit()
    db.refresh(u)
    return {"message": "User updated", "id": u.id, "plan": u.subscription_plan, "is_active": u.is_active}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    payload: dict,
    db:      Session = Depends(get_db),
    admin:   User = Depends(require_admin),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    new_pw = payload.get("new_password", "")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    from app.core.security import hash_password
    from app.core.email import email_password_reset
    u.hashed_password = hash_password(new_pw)
    db.commit()
    try:
        email_password_reset(
            to=u.email,
            name=u.display_name or u.email.split("@")[0],
            new_password=new_pw,
        )
    except Exception:
        pass
    return {"message": f"Password reset for {u.email}"}


# ── FEEDBACK INBOX ────────────────────────────────────────────────────────────

@router.get("/feedback")
def get_feedback(
    type:    Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    page:    int = Query(1, ge=1),
    limit:   int = Query(20, le=100),
    db:      Session = Depends(get_db),
    admin:   User = Depends(require_admin),
):
    try:
        from sqlalchemy import text
        conditions = ["1=1"]
        params = {"offset": (page - 1) * limit, "limit": limit}
        if type:
            conditions.append("type = :type")
            params["type"] = type
        if is_read is not None:
            conditions.append("is_read = :is_read")
            params["is_read"] = is_read

        where = " AND ".join(conditions)
        with db.bind.connect() as conn:
            total = conn.execute(text(f"SELECT COUNT(*) FROM user_feedback WHERE {where}"),
                                 {k: v for k, v in params.items() if k not in ("offset", "limit")}).scalar()
            rows = conn.execute(text(
                f"SELECT id, user_id, user_email, type, data, is_read, created_at FROM user_feedback WHERE {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            ), params)
            items = []
            for row in rows:
                items.append({
                    "id": row[0], "user_id": row[1], "user_email": row[2],
                    "type": row[3], "data": row[4], "is_read": row[5],
                    "created_at": str(row[6]),
                })
        return {"items": items, "total": total}
    except Exception as e:
        return {"items": [], "total": 0, "error": str(e)}


@router.patch("/feedback/{feedback_id}/read")
def mark_feedback_read(
    feedback_id: int,
    db:  Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from sqlalchemy import text
    with db.bind.connect() as conn:
        conn.execute(text("UPDATE user_feedback SET is_read = TRUE WHERE id = :id"), {"id": feedback_id})
        conn.commit()
    return {"message": "Marked as read"}


# ── REVIEWS ───────────────────────────────────────────────────────────────────

@router.get("/reviews")
def get_reviews(
    approved: Optional[bool] = Query(None),
    db:   Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        from sqlalchemy import text
        with db.bind.connect() as conn:
            # Ensure column exists
            try:
                conn.execute(text("ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE"))
                conn.commit()
            except Exception:
                pass

            conditions = ["type = 'review'"]
            params = {}
            if approved is not None:
                conditions.append("is_approved = :approved")
                params["approved"] = approved

            where = " AND ".join(conditions)
            rows = conn.execute(text(
                f"SELECT id, user_email, data, is_approved, created_at FROM user_feedback WHERE {where} ORDER BY created_at DESC"
            ), params)
            return [{"id": r[0], "user_email": r[1], "data": r[2], "is_approved": r[3], "created_at": str(r[4])} for r in rows]
    except Exception as e:
        return []


@router.patch("/reviews/{review_id}/approve")
def approve_review(
    review_id: int,
    payload:   dict,
    db:  Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from sqlalchemy import text
    approved = payload.get("approved", True)
    with db.bind.connect() as conn:
        conn.execute(text("UPDATE user_feedback SET is_approved = :approved WHERE id = :id"),
                     {"approved": approved, "id": review_id})
        conn.commit()
    return {"message": "Review updated"}


# ── SUPPORT TICKETS ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject:  str
    body:     str
    type:     str = "general"
    priority: str = "medium"


class NoteCreate(BaseModel):
    body: str


@router.get("/tickets")
def list_tickets(
    status:   Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    type:     Optional[str] = Query(None),
    page:     int = Query(1, ge=1),
    limit:    int = Query(20, le=100),
    db:       Session = Depends(get_db),
    admin:    User = Depends(require_admin),
):
    q = db.query(SupportTicket)
    if status:   q = q.filter(SupportTicket.status == status)
    if priority: q = q.filter(SupportTicket.priority == priority)
    if type:     q = q.filter(SupportTicket.type == type)

    total   = q.count()
    tickets = q.order_by(desc(SupportTicket.created_at)).offset((page - 1) * limit).limit(limit).all()

    result = []
    for t in tickets:
        user = db.query(User).filter(User.id == t.user_id).first()
        assignee = db.query(User).filter(User.id == t.assigned_to).first() if t.assigned_to else None
        result.append({
            "id":          t.id,
            "subject":     t.subject,
            "body":        t.body,
            "type":        t.type,
            "status":      t.status,
            "priority":    t.priority,
            "created_at":  t.created_at.isoformat() if t.created_at else None,
            "updated_at":  t.updated_at.isoformat() if t.updated_at else None,
            "note_count":  len(t.notes),
            "user_email":  user.email if user else "—",
            "user_plan":   user.subscription_plan if user else "—",
            "assigned_to": assignee.email if assignee else None,
        })

    return {"tickets": result, "total": total, "pages": -(-total // limit)}


@router.get("/tickets/{ticket_id}")
def get_ticket(
    ticket_id: int,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    user     = db.query(User).filter(User.id == t.user_id).first()
    assignee = db.query(User).filter(User.id == t.assigned_to).first() if t.assigned_to else None

    notes = []
    for n in t.notes:
        note_admin = db.query(User).filter(User.id == n.admin_id).first()
        notes.append({
            "id":         n.id,
            "body":       n.body,
            "admin":      note_admin.email if note_admin else "—",
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return {
        "id":          t.id,
        "subject":     t.subject,
        "body":        t.body,
        "type":        t.type,
        "status":      t.status,
        "priority":    t.priority,
        "created_at":  t.created_at.isoformat() if t.created_at else None,
        "user_email":  user.email if user else "—",
        "user_plan":   user.subscription_plan if user else "—",
        "user_id":     t.user_id,
        "assigned_to": assignee.email if assignee else None,
        "notes":       notes,
    }


@router.patch("/tickets/{ticket_id}")
def update_ticket(
    ticket_id: int,
    payload:   dict,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    allowed = {"status", "priority", "assigned_to", "type"}
    for k, v in payload.items():
        if k in allowed:
            setattr(t, k, v)

    db.commit()
    return {"message": "Ticket updated"}


@router.post("/tickets/{ticket_id}/notes")
def add_note(
    ticket_id: int,
    payload:   NoteCreate,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    t = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")

    note = TicketNote(ticket_id=ticket_id, admin_id=admin.id, body=payload.body)
    db.add(note)
    db.commit()

    # Email the user about the update
    try:
        user = db.query(User).filter(User.id == t.user_id).first()
        if user:
            from app.core.email import email_ticket_updated
            email_ticket_updated(
                to=user.email,
                name=user.display_name or user.email.split("@")[0],
                ticket_id=t.id,
                subject=t.subject,
                status=t.status,
                note=payload.body,
            )
    except Exception:
        pass

    return {"message": "Note added"}


# ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title:       str
    body:        str
    type:        str = "info"
    target_plan: str = "all"
    expires_at:  Optional[str] = None


@router.get("/announcements")
def list_announcements(
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    items = db.query(Announcement).order_by(desc(Announcement.created_at)).all()
    return [{
        "id": a.id, "title": a.title, "body": a.body, "type": a.type,
        "target_plan": a.target_plan, "is_active": a.is_active,
        "expires_at": a.expires_at.isoformat() if a.expires_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in items]


@router.post("/announcements")
def create_announcement(
    payload: AnnouncementCreate,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    expires = None
    if payload.expires_at:
        try:
            expires = datetime.fromisoformat(payload.expires_at)
        except Exception:
            pass

    a = Announcement(
        title=payload.title, body=payload.body, type=payload.type,
        target_plan=payload.target_plan, created_by=admin.id, expires_at=expires,
    )
    db.add(a)
    db.commit()
    db.refresh(a)

    # Email all target users in background
    try:
        from app.core.email import email_announcement
        q = db.query(User).filter(User.is_active == True)
        if payload.target_plan != "all":
            q = q.filter(User.subscription_plan == payload.target_plan)
        users = q.all()
        for u in users:
            email_announcement(u.email, payload.title, payload.body, payload.type)
    except Exception as e:
        print(f"Announcement email error: {e}")

    return {"message": "Announcement created", "id": a.id}


@router.patch("/announcements/{ann_id}")
def update_announcement(
    ann_id:  int,
    payload: dict,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    a = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.items():
        if hasattr(a, k):
            setattr(a, k, v)
    db.commit()
    return {"message": "Updated"}


@router.delete("/announcements/{ann_id}")
def delete_announcement(
    ann_id: int,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    a = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()
    return {"message": "Deleted"}


# ── PUBLIC — active announcements for current user ────────────────────────────

@router.get("/announcements/active")
def active_announcements(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    items = db.query(Announcement).filter(
        Announcement.is_active == True,
        (Announcement.expires_at == None) | (Announcement.expires_at > now),
        (Announcement.target_plan == "all") | (Announcement.target_plan == current_user.subscription_plan),
    ).order_by(desc(Announcement.created_at)).all()

    return [{
        "id": a.id, "title": a.title, "body": a.body,
        "type": a.type, "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in items]


# ── COURSE MANAGEMENT (admin views) ──────────────────────────────────────────

@router.get("/courses/stats")
def course_stats(
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    modules = db.query(CourseModule).order_by(CourseModule.track, CourseModule.order).all()
    result  = []
    for m in modules:
        published_lessons = [l for l in m.lessons if l.is_published]
        lesson_stats = []
        for l in published_lessons:
            completions = db.query(UserProgress).filter(
                UserProgress.lesson_id == l.id,
                UserProgress.completed == True,
            ).count()
            lesson_stats.append({
                "id": l.id, "title": l.title,
                "completions": completions,
                "quiz_count": len(l.quizzes),
            })
        result.append({
            "id": m.id, "title": m.title, "track": m.track,
            "tier_required": m.tier_required, "is_published": m.is_published,
            "lesson_count": len(published_lessons),
            "lessons": lesson_stats,
        })
    return result


# ── STRATEGY MANAGEMENT ───────────────────────────────────────────────────────

class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_params: dict
    is_public: bool = True


@router.get("/strategies")
def admin_list_strategies(
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    return db.query(Strategy).order_by(Strategy.id).all()


@router.post("/strategies")
def admin_create_strategy(
    payload: StrategyCreate,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = Strategy(
        name=payload.name,
        description=payload.description,
        default_params=payload.default_params,
        is_public=payload.is_public,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/strategies/{strategy_id}")
def admin_update_strategy(
    strategy_id: int,
    payload: dict,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if "name" in payload:        s.name = payload["name"]
    if "description" in payload: s.description = payload["description"]
    if "is_public" in payload:   s.is_public = payload["is_public"]
    if "default_params" in payload:
        s.default_params = payload["default_params"]
    db.commit()
    db.refresh(s)
    return s


@router.delete("/strategies/{strategy_id}")
def admin_delete_strategy(
    strategy_id: int,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}


# ── STRATEGY MANAGEMENT ───────────────────────────────────────────────────────

class StrategyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_params: dict
    is_public: bool = True


@router.get("/strategies")
def admin_list_strategies(
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    return db.query(Strategy).order_by(Strategy.id).all()


@router.post("/strategies")
def admin_create_strategy(
    payload: StrategyCreate,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = Strategy(
        name=payload.name,
        description=payload.description,
        default_params=payload.default_params,
        is_public=payload.is_public,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.patch("/strategies/{strategy_id}")
def admin_update_strategy(
    strategy_id: int,
    payload: dict,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if "name" in payload:        s.name = payload["name"]
    if "description" in payload: s.description = payload["description"]
    if "is_public" in payload:   s.is_public = payload["is_public"]
    if "default_params" in payload:
        s.default_params = payload["default_params"]
    db.commit()
    db.refresh(s)
    return s


@router.delete("/strategies/{strategy_id}")
def admin_delete_strategy(
    strategy_id: int,
    db:    Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    from app.models.strategy import Strategy
    s = db.query(Strategy).filter(Strategy.id == strategy_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Strategy not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}


# ── ADMIN MESSAGING ────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    subject: str
    body: str
    user_id: Optional[int] = None   # None = broadcast to all
    from_name: str = "PesaPips Team"

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "system"
    user_id: Optional[int] = None   # None = send to all users

@router.post("/messages/send")
def send_message(data: MessageCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if data.user_id:
        # Send to specific user
        u = db.query(User).filter(User.id == data.user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        m = Message(user_id=data.user_id, subject=data.subject, body=data.body,
                    from_name=data.from_name, broadcast=False)
        db.add(m)
        db.commit()
        return {"ok": True, "sent_to": u.email, "broadcast": False}
    else:
        # Broadcast to all users
        users = db.query(User).filter(User.is_active == True).all()
        for u in users:
            m = Message(user_id=u.id, subject=data.subject, body=data.body,
                        from_name=data.from_name, broadcast=True)
            db.add(m)
        db.commit()
        return {"ok": True, "sent_to": len(users), "broadcast": True}

@router.post("/notifications/send")
def send_notification(data: NotificationCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    if data.user_id:
        u = db.query(User).filter(User.id == data.user_id).first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        n = Notification(user_id=data.user_id, type=data.type,
                         title=data.title, message=data.message)
        db.add(n)
        db.commit()
        return {"ok": True, "sent_to": u.email}
    else:
        users = db.query(User).filter(User.is_active == True).all()
        for u in users:
            n = Notification(user_id=u.id, type=data.type,
                             title=data.title, message=data.message)
            db.add(n)
        db.commit()
        return {"ok": True, "sent_to": len(users), "broadcast": True}

@router.get("/messages/sent")
def get_sent_messages(db: Session = Depends(get_db), admin=Depends(require_admin)):
    msgs = db.query(Message).order_by(Message.created_at.desc()).limit(100).all()
    return [{"id": m.id, "subject": m.subject, "body": m.body, "from_name": m.from_name,
             "user_id": m.user_id, "broadcast": m.broadcast,
             "created_at": m.created_at.isoformat()} for m in msgs]

@router.get("/users-list")
def list_users(db: Session = Depends(get_db), admin=Depends(require_admin)):
    users = db.query(User).filter(User.is_active == True).order_by(User.created_at.desc()).all()
    return [{"id": u.id, "email": u.email, "display_name": u.display_name,
             "subscription_plan": u.subscription_plan} for u in users]


# ADMIN PAYMENTS
@router.get("/payments")
def get_payments(status: str = "pending", db: Session = Depends(get_db), admin=Depends(require_admin)):
    payments = db.query(Payment).filter(Payment.status == status)        .order_by(Payment.created_at.desc()).all()
    result = []
    for p in payments:
        u = db.query(User).filter(User.id == p.user_id).first()
        result.append({
            "id": p.id, "user_id": p.user_id,
            "email": u.email if u else "unknown",
            "plan": p.plan, "method": p.method,
            "tx_ref": p.tx_ref, "phone": p.phone,
            "amount": p.amount, "status": p.status,
            "created_at": p.created_at.isoformat(),
        })
    return result

@router.post("/payments/{payment_id}/approve")
def approve_payment(payment_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Upgrade user plan
    u = db.query(User).filter(User.id == p.user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    u.subscription_plan = p.plan
    p.status = "approved"
    p.approved_at = datetime.utcnow()

    # Notify user
    n = Notification(user_id=u.id, type="system",
        title=f"Plan upgraded to {p.plan.upper()}!",
        message=f"Your payment has been verified and your account has been upgraded to {p.plan.upper()}. Enjoy your new features!")
    db.add(n)
    db.commit()
    return {"ok": True, "plan": p.plan, "email": u.email}

@router.post("/payments/{payment_id}/reject")
def reject_payment(payment_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    p.status = "rejected"

    # Notify user
    n = Notification(user_id=p.user_id, type="system",
        title="Payment could not be verified",
        message=f"We could not verify your payment (Ref: {p.tx_ref}). Please contact support@pesapips.com with your M-Pesa confirmation SMS.")
    db.add(n)
    db.commit()
    return {"ok": True}
