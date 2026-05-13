"""
Trading Audit & Forward-Test Dashboard endpoints.
Public verified track record + user signal history.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trading_audit import SignalAudit

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.post("/record")
def record_signal(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audit = SignalAudit(
        user_id=current_user.id,
        symbol=payload.get("symbol", "XAUUSD"),
        timeframe=payload.get("timeframe", "M5"),
        signal=payload.get("signal", "HOLD"),
        confidence=payload.get("confidence", 0.0),
        reason=payload.get("reason", "")[:500],
        price_at_signal=payload.get("price_at_signal"),
        sl_price=payload.get("sl_price"),
        tp_price=payload.get("tp_price"),
        regime=payload.get("regime"),
        regime_confidence=payload.get("regime_confidence"),
        strategy_id=payload.get("strategy_id"),
        strategy_name=payload.get("strategy_name"),
        strategy_fit=payload.get("strategy_fit"),
        lot_size=payload.get("lot_size"),
        data_source=payload.get("data_source", "live"),
        is_auto=payload.get("is_auto", False),
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return {"id": audit.id, "status": "recorded"}


@router.patch("/{audit_id}/outcome")
def record_outcome(
    audit_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audit = db.query(SignalAudit).filter(
        SignalAudit.id == audit_id,
        SignalAudit.user_id == current_user.id,
    ).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit record not found")

    audit.exit_price = payload.get("exit_price")
    audit.exit_time = datetime.now(timezone.utc) if payload.get("closed") else None
    audit.pnl = payload.get("pnl")
    audit.result = payload.get("result")
    audit.pnl_points = payload.get("pnl_points")
    if payload.get("mt5_ticket"):
        audit.mt5_ticket = payload["mt5_ticket"]
    db.commit()
    return {"status": "updated"}


@router.get("/my-history")
def my_signal_history(
    symbol: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(SignalAudit).filter(SignalAudit.user_id == current_user.id)
    if symbol:
        q = q.filter(SignalAudit.symbol == symbol)
    total = q.count()
    records = q.order_by(desc(SignalAudit.created_at)).offset(offset).limit(limit).all()
    return {
        "total": total,
        "records": [{
            "id": r.id,
            "symbol": r.symbol,
            "timeframe": r.timeframe,
            "signal": r.signal,
            "confidence": r.confidence,
            "reason": r.reason,
            "price_at_signal": r.price_at_signal,
            "sl_price": r.sl_price,
            "tp_price": r.tp_price,
            "regime": r.regime,
            "strategy_name": r.strategy_name,
            "data_source": r.data_source,
            "is_auto": r.is_auto,
            "exit_price": r.exit_price,
            "pnl": r.pnl,
            "result": r.result,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in records],
    }


@router.get("/my-stats")
def my_audit_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = db.query(SignalAudit).filter(
        SignalAudit.user_id == current_user.id,
        SignalAudit.signal.in_(["BUY", "SELL"]),
    ).all()

    total = len(records)
    with_outcome = [r for r in records if r.result is not None]
    wins = [r for r in with_outcome if r.result == "win"]
    losses = [r for r in with_outcome if r.result == "loss"]
    total_pnl = sum(r.pnl for r in with_outcome if r.pnl)

    win_rate = (len(wins) / len(with_outcome) * 100) if with_outcome else 0

    by_regime = {}
    for r in with_outcome:
        reg = r.regime or "UNKNOWN"
        if reg not in by_regime:
            by_regime[reg] = {"total": 0, "wins": 0, "pnl": 0.0}
        by_regime[reg]["total"] += 1
        if r.result == "win":
            by_regime[reg]["wins"] += 1
        by_regime[reg]["pnl"] += (r.pnl or 0)

    for reg in by_regime:
        total_reg = by_regime[reg]["total"]
        by_regime[reg]["win_rate"] = round(by_regime[reg]["wins"] / total_reg * 100, 1) if total_reg else 0

    return {
        "total_signals": total,
        "signals_with_outcome": len(with_outcome),
        "win_rate": round(win_rate, 1),
        "total_pnl": round(total_pnl, 2),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "by_regime": by_regime,
    }


@router.get("/verified-track-record")
def verified_track_record(
    days: int = Query(90, le=365),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    records = db.query(SignalAudit).filter(
        SignalAudit.is_auto == True,
        SignalAudit.signal.in_(["BUY", "SELL"]),
        SignalAudit.created_at >= since,
        SignalAudit.result != None,
    ).order_by(SignalAudit.created_at.desc()).limit(500).all()

    total = len(records)
    wins = [r for r in records if r.result == "win"]
    total_pnl = sum(r.pnl for r in records if r.pnl)

    return {
        "period_days": days,
        "total_trades": total,
        "winning_trades": len(wins),
        "win_rate": round(len(wins) / total * 100, 1) if total else 0,
        "total_pnl": round(total_pnl, 2),
        "is_verified": total > 0,
        "trades": [{
            "symbol": r.symbol,
            "signal": r.signal,
            "confidence": r.confidence,
            "regime": r.regime,
            "result": r.result,
            "pnl": r.pnl,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in records[:100]],
    }
