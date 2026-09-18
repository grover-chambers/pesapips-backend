"""Demo contest routes — create/join contests and rank entrants by paper-trade
return. All PnL comes from closed paper trades within the contest window."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.models.contest import Contest, ContestEntry
from app.models.trading_audit import PaperTrade
from app.routers.admin import require_admin

router = APIRouter(prefix="/contests", tags=["contests"])


# ── Schemas ──────────────────────────────────────────────────────────
class ContestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ""
    start_balance: float = Field(default=10000.0, gt=0)
    start_at: datetime
    end_at: datetime
    is_active: bool = True


class ContestOut(BaseModel):
    id: int
    name: str
    description: str
    start_balance: float
    start_at: datetime
    end_at: datetime
    is_active: bool
    entrants: int = 0
    joined: bool = False

    class Config:
        from_attributes = True


class JoinOut(BaseModel):
    contest_id: int
    joined: bool
    initial_balance: float


class LeaderboardRow(BaseModel):
    rank: int
    user_id: int
    display_name: str
    email: str
    closed_trades: int
    closed_pnl: float
    return_pct: float

    class Config:
        from_attributes = True


# ── Helpers ──────────────────────────────────────────────────────────
def _contest_or_404(db: Session, contest_id: int) -> Contest:
    contest = db.get(Contest, contest_id)
    if not contest:
        raise HTTPException(status_code=404, detail="Contest not found")
    return contest


def _entrant_pnl(db: Session, contest: Contest, user_id: int) -> tuple[int, float]:
    """Sum of closed paper-trade PnL inside the contest window, plus count."""
    q = db.query(
        func.count(PaperTrade.id),
        func.coalesce(func.sum(PaperTrade.profit), 0.0),
    ).filter(
        PaperTrade.user_id == user_id,
        PaperTrade.status == "closed",
        PaperTrade.closed_at >= contest.start_at,
        PaperTrade.closed_at <= contest.end_at,
    ).first()
    return int(q[0]), float(q[1])


# ── Routes ───────────────────────────────────────────────────────────
@router.post("", response_model=ContestOut, status_code=201)
def create_contest(
    body: ContestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if body.end_at <= body.start_at:
        raise HTTPException(status_code=422, detail="end_at must be after start_at")
    contest = Contest(**body.model_dump(), created_by=current_user.id)
    db.add(contest)
    db.commit()
    db.refresh(contest)
    return contest


@router.get("", response_model=list[ContestOut])
def list_contests(
    include_finished: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Contest).order_by(Contest.start_at.desc())
    if not include_finished:
        q = q.filter(Contest.is_active.is_(True))
    contests = q.all()
    out = []
    for c in contests:
        item = ContestOut.model_validate(c)
        item.entrants = len(c.entries)
        item.joined = any(e.user_id == current_user.id for e in c.entries)
        out.append(item)
    return out


@router.get("/{contest_id}", response_model=ContestOut)
def contest_detail(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = _contest_or_404(db, contest_id)
    item = ContestOut.model_validate(c)
    item.entrants = len(c.entries)
    item.joined = any(e.user_id == current_user.id for e in c.entries)
    return item


@router.post("/{contest_id}/join", response_model=JoinOut)
def join_contest(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contest = _contest_or_404(db, contest_id)
    if not contest.is_active:
        raise HTTPException(status_code=400, detail="Contest is not open for entry")
    now = datetime.now(timezone.utc)
    if now < contest.start_at:
        raise HTTPException(status_code=400, detail="Contest has not started yet")
    if now > contest.end_at:
        raise HTTPException(status_code=400, detail="Contest has ended")

    existing = db.query(ContestEntry).filter_by(
        contest_id=contest_id, user_id=current_user.id,
    ).first()
    if existing:
        return JoinOut(contest_id=contest_id, joined=False,
                       initial_balance=existing.initial_balance)

    entry = ContestEntry(contest_id=contest_id, user_id=current_user.id,
                         initial_balance=contest.start_balance)
    db.add(entry)
    db.commit()
    return JoinOut(contest_id=contest_id, joined=True,
                   initial_balance=entry.initial_balance)


@router.get("/{contest_id}/leaderboard", response_model=list[LeaderboardRow])
def contest_leaderboard(
    contest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contest = _contest_or_404(db, contest_id)
    rows = []
    for entry in contest.entries:
        closed, pnl = _entrant_pnl(db, contest, entry.user_id)
        user = db.get(User, entry.user_id)
        if not user:
            continue
        return_pct = (pnl / entry.initial_balance * 100.0) if entry.initial_balance else 0.0
        rows.append(LeaderboardRow(
            rank=0,
            user_id=entry.user_id,
            display_name=user.display_name or user.email,
            email=user.email,
            closed_trades=closed,
            closed_pnl=round(pnl, 2),
            return_pct=round(return_pct, 2),
        ))
    rows.sort(key=lambda r: r.return_pct, reverse=True)
    for i, row in enumerate(rows, start=1):
        row.rank = i
    return rows
