from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.strategy import UserStrategy
from app.schemas.trade import TradeOut, DashboardSummary
from app.dependencies import get_current_user
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trades = db.query(Trade).filter(Trade.user_id == current_user.id).all()

    total = len(trades)
    wins = [t for t in trades if t.profit > 0]
    losses = [t for t in trades if t.profit <= 0]
    daily_pnl = sum(t.profit for t in trades)
    winrate = (len(wins) / total * 100) if total > 0 else 0.0

    active_strategy = db.query(UserStrategy).filter(
        UserStrategy.user_id == current_user.id,
        UserStrategy.is_active == True,
    ).first()

    return DashboardSummary(
        balance=0.0,
        equity=0.0,
        daily_pnl=round(daily_pnl, 2),
        total_trades=total,
        winning_trades=len(wins),
        losing_trades=len(losses),
        winrate=round(winrate, 2),
        max_drawdown=0.0,
        active_strategy=active_strategy.strategy.name if active_strategy else None,
    )


@router.get("/trades", response_model=List[TradeOut])
def get_trades(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id)
        .order_by(Trade.opened_at.desc())
        .limit(limit)
        .all()
    )


class FeedbackPayload(BaseModel):
    type: str  # bug | feature | review
    page: Optional[str] = None
    what_happened: Optional[str] = None
    steps: Optional[str] = None
    expected: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    problem: Optional[str] = None
    solution: Optional[str] = None
    priority: Optional[str] = None
    reviewer_name: Optional[str] = None
    plan: Optional[str] = None
    rating: Optional[str] = None
    body: Optional[str] = None
    trading_since: Optional[str] = None

    class Config:
        extra = "allow"


@router.post("/feedback")
def submit_feedback(
    payload: FeedbackPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Store as a JSON record — we'll build the admin inbox UI to read these
    from app.core.database import engine
    from sqlalchemy import text, inspect
    
    # Create feedback table if it doesn't exist
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_feedback (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                user_email VARCHAR,
                type VARCHAR,
                data JSONB,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            INSERT INTO user_feedback (user_id, user_email, type, data)
            VALUES (:uid, :email, :type, :data::jsonb)
        """), {
            "uid": current_user.id,
            "email": current_user.email,
            "type": payload.type,
            "data": __import__("json").dumps(payload.model_dump()),
        })
        conn.commit()
    
    return {"message": "Feedback submitted", "type": payload.type}


class TicketCreate(BaseModel):
    subject: str
    body: str
    type: str = "general"
    priority: str = "medium"


@router.post("/tickets")
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.admin import SupportTicket
    from app.core.email import email_ticket_received

    ticket = SupportTicket(
        user_id=current_user.id,
        subject=payload.subject,
        body=payload.body,
        type=payload.type,
        priority=payload.priority,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Email confirmation to user
    email_ticket_received(
        to=current_user.email,
        name=current_user.display_name or current_user.email.split("@")[0],
        ticket_id=ticket.id,
        subject=ticket.subject,
    )

    return {"message": "Ticket created", "id": ticket.id}


@router.get("/tickets/mine")
def my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.admin import SupportTicket
    from sqlalchemy import desc
    tickets = db.query(SupportTicket).filter(
        SupportTicket.user_id == current_user.id
    ).order_by(desc(SupportTicket.created_at)).all()

    return [{
        "id": t.id, "subject": t.subject, "type": t.type,
        "status": t.status, "priority": t.priority,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "note_count": len(t.notes),
    } for t in tickets]
