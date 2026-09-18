"""
Prop-firm evaluation: rule book CRUD + progress snapshots.

The rule book lives here (editable from the frontend Settings page); the
local prop-eval agent pulls it, enforces it in code (prop_eval_engine.py),
and pushes progress snapshots back through POST /prop-eval/status.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.prop_eval import PropEvalSettings, PropEvalSnapshot
from app.services import prop_eval_engine as engine

router = APIRouter(prefix="/prop-eval", tags=["prop-eval"])


# ── Provider presets for the Settings page dropdown ─────────────────
@router.get("/presets")
def get_presets():
    presets = {}
    for name, p in engine.PROVIDER_PRESETS.items():
        presets[name] = {**p, "phase_2_profit_target_pct": 5.0}
    return presets


# ── Rule book ───────────────────────────────────────────────────────
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(PropEvalSettings).filter(PropEvalSettings.user_id == current_user.id).first()
    if not row:
        # Return the provider default without persisting anything
        return {"user_id": current_user.id, **engine.PROVIDER_PRESETS["ftmo"], "provider": "ftmo", "phase": 1,
                "auto_execute": False, "stop_on_daily_loss": True, "news_guard_enabled": True,
                "hold_over_weekend": False, "notes": None}
    return row.to_dict()


@router.put("/settings")
def upsert_settings(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok, errors = engine.validate_settings(payload)
    if not ok:
        raise HTTPException(status_code=422, detail={"errors": errors})

    row = db.query(PropEvalSettings).filter(PropEvalSettings.user_id == current_user.id).first()
    if not row:
        row = PropEvalSettings(user_id=current_user.id)

    for field in (
        "provider", "phase", "account_size", "profit_target_pct", "max_daily_loss_pct",
        "max_total_drawdown_pct", "min_trading_days", "risk_per_trade_pct",
        "max_open_trades", "max_consecutive_losses", "instruments", "auto_execute",
        "stop_on_daily_loss", "news_guard_enabled", "hold_over_weekend", "notes",
    ):
        if field in payload:
            setattr(row, field, payload[field])

    db.add(row)
    db.commit()
    db.refresh(row)
    return row.to_dict()


# ── Progress snapshots ──────────────────────────────────────────────
@router.get("/status")
def get_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(PropEvalSnapshot).filter(
        PropEvalSnapshot.user_id == current_user.id
    ).order_by(PropEvalSnapshot.created_at.desc()).first()
    if not row:
        return {"user_id": current_user.id, "status": "unknown", "reason": "No agent activity yet"}
    return row.to_dict()


@router.post("/status")
def push_status(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Called by the local prop-eval agent (with the user's JWT)."""
    snapshot = PropEvalSnapshot(
        user_id=current_user.id,
        balance=payload.get("balance"),
        equity=payload.get("equity"),
        peak_balance=payload.get("peak_balance"),
        day_start_balance=payload.get("day_start_balance"),
        open_trades=payload.get("open_trades", 0),
        daily_loss_pct=payload.get("daily_loss_pct"),
        drawdown_pct=payload.get("drawdown_pct"),
        profit_pct=payload.get("profit_pct"),
        trading_days_logged=payload.get("trading_days_logged", 0),
        phase=payload.get("phase", 1),
        status=payload.get("status", "running"),
        reason=payload.get("reason"),
        last_error=payload.get("last_error"),
    )
    db.add(snapshot)
    db.commit()
    return {"ok": True}


# ── Convenience: run the rule book against a client-supplied state ──
@router.post("/evaluate")
def evaluate_state(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dry-run the rule book against arbitrary account state (used by the
    Settings page to preview 'what would happen at $X balance')."""
    settings_row = db.query(PropEvalSettings).filter(PropEvalSettings.user_id == current_user.id).first()
    settings_dict = settings_row.to_dict() if settings_row else {
        "provider": "ftmo", "phase": 1, **engine.PROVIDER_PRESETS["ftmo"]
    }
    book = engine.rulebook_from_settings(settings_dict)
    acct = engine.AccountState(
        balance=float(payload.get("balance") or 0),
        equity=float(payload.get("equity") or payload.get("balance") or 0),
        peak_balance=float(payload.get("peak_balance") or 0),
        day_start_balance=float(payload.get("day_start_balance") or 0),
        open_trades=int(payload.get("open_trades") or 0),
        trading_days_logged=int(payload.get("trading_days_logged") or 0),
        consecutive_losses=int(payload.get("consecutive_losses") or 0),
    )
    verdict = engine.evaluate(book, acct)
    return {
        **verdict.to_dict(),
        "target_balance": round(book.target_balance, 2),
        "drawdown_floor": round(book.drawdown_floor(acct.peak_balance or acct.balance), 2),
        "daily_loss_limit": round(book.daily_loss_limit(acct.day_start_balance or acct.balance), 2),
    }
