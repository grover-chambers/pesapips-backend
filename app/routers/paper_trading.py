"""
Paper trading / demo mode endpoints.
Run the signal engine without real MT5, track hypothetical P&L.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, timezone
import pandas as pd

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.trading_audit import PaperTrade, SignalAudit
from app.models.strategy import UserStrategy
from app.services.signal_engine import run_signal, check_h4_trend
from app.services.market_data import get_market_data, is_synthetic_data
from app.services.market_regime import detect_regime

router = APIRouter(prefix="/paper-trading", tags=["Paper Trading"])


@router.post("/open")
def open_paper_trade(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    symbol = payload.get("symbol", "XAUUSD")
    timeframe = payload.get("timeframe", "M5")
    params = payload.get("params", {})
    strategy_name = payload.get("strategy_name", "Paper")

    df = get_market_data(symbol=symbol, timeframe=timeframe, periods=500, allow_synthetic=True)
    if df is None or df.empty:
        raise HTTPException(status_code=503, detail="No market data available")

    if is_synthetic_data(df):
        raise HTTPException(status_code=503, detail="Cannot paper-trade on synthetic data — no real market data available")

    result = run_signal(df, params)
    signal = result.get("signal", "HOLD")

    if signal not in ("BUY", "SELL"):
        return {"signal": signal, "reason": result.get("reason", ""), "trade_opened": False}

    price = float(df["close"].iloc[-1])
    sl_dist = result.get("sl", 0)
    tp_dist = result.get("tp", 0)

    if signal == "BUY":
        sl = round(price - sl_dist, 2) if sl_dist > 0 else round(price * 0.99, 2)
        tp = round(price + tp_dist, 2) if tp_dist > 0 else round(price * 1.02, 2)
    else:
        sl = round(price + sl_dist, 2) if sl_dist > 0 else round(price * 1.01, 2)
        tp = round(price - tp_dist, 2) if tp_dist > 0 else round(price * 0.98, 2)

    trade = PaperTrade(
        user_id=current_user.id,
        symbol=symbol,
        trade_type=signal,
        lot=0.01,
        entry_price=price,
        sl=sl,
        tp=tp,
        current_price=price,
        profit=0.0,
        status="open",
        strategy_name=strategy_name,
    )
    db.add(trade)

    audit = SignalAudit(
        user_id=current_user.id,
        symbol=symbol,
        timeframe=timeframe,
        signal=signal,
        confidence=result.get("confidence", 0),
        reason=result.get("reason", "")[:500],
        price_at_signal=price,
        sl_price=sl,
        tp_price=tp,
        data_source="paper",
        is_auto=False,
        strategy_name=strategy_name,
    )
    db.add(audit)
    db.flush()
    trade.signal_audit_id = audit.id
    db.commit()
    db.refresh(trade)

    return {
        "trade_opened": True,
        "id": trade.id,
        "signal": signal,
        "symbol": symbol,
        "entry_price": price,
        "sl": sl,
        "tp": tp,
        "lot": 0.01,
        "confidence": result.get("confidence", 0),
        "reason": result.get("reason", ""),
    }


@router.post("/close/{trade_id}")
def close_paper_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = db.query(PaperTrade).filter(
        PaperTrade.id == trade_id,
        PaperTrade.user_id == current_user.id,
        PaperTrade.status == "open",
    ).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Open paper trade not found")

    df = get_market_data(symbol=trade.symbol, timeframe="M1", periods=5, allow_synthetic=True)
    current_price = float(df["close"].iloc[-1]) if df is not None and not df.empty else trade.entry_price

    if trade.trade_type == "BUY":
        profit = (current_price - trade.entry_price) * trade.lot * 100
        pnl_points = current_price - trade.entry_price
        hit_tp = current_price >= trade.tp if trade.tp else False
        hit_sl = current_price <= trade.sl if trade.sl else False
    else:
        profit = (trade.entry_price - current_price) * trade.lot * 100
        pnl_points = trade.entry_price - current_price
        hit_tp = current_price <= trade.tp if trade.tp else False
        hit_sl = current_price >= trade.sl if trade.sl else False

    result = "win" if profit >= 0 else "loss"

    trade.current_price = current_price
    trade.profit = round(profit, 2)
    trade.status = "closed"
    trade.closed_at = datetime.now(timezone.utc)

    if trade.signal_audit_id:
        audit = db.query(SignalAudit).filter(SignalAudit.id == trade.signal_audit_id).first()
        if audit:
            audit.exit_price = current_price
            audit.exit_time = datetime.now(timezone.utc)
            audit.pnl = round(profit, 2)
            audit.result = result
            audit.pnl_points = round(pnl_points, 2)

    db.commit()
    return {
        "id": trade.id,
        "exit_price": current_price,
        "profit": round(profit, 2),
        "result": result,
        "hit_tp": hit_tp,
        "hit_sl": hit_sl,
    }


@router.get("/positions")
def get_paper_positions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    open_trades = db.query(PaperTrade).filter(
        PaperTrade.user_id == current_user.id,
        PaperTrade.status == "open",
    ).order_by(desc(PaperTrade.opened_at)).all()

    results = []
    for t in open_trades:
        df = get_market_data(symbol=t.symbol, timeframe="M1", periods=5, allow_synthetic=True)
        current_price = float(df["close"].iloc[-1]) if df is not None and not df.empty else t.current_price

        if t.trade_type == "BUY":
            unrealized = (current_price - t.entry_price) * t.lot * 100
        else:
            unrealized = (t.entry_price - current_price) * t.lot * 100

        t.current_price = current_price
        t.profit = round(unrealized, 2)

        results.append({
            "id": t.id,
            "symbol": t.symbol,
            "trade_type": t.trade_type,
            "lot": t.lot,
            "entry_price": t.entry_price,
            "current_price": current_price,
            "sl": t.sl,
            "tp": t.tp,
            "profit": round(unrealized, 2),
            "strategy_name": t.strategy_name,
            "opened_at": t.opened_at.isoformat() if t.opened_at else None,
        })

    return {"positions": results}


@router.get("/history")
def paper_trade_history(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trades = db.query(PaperTrade).filter(
        PaperTrade.user_id == current_user.id,
        PaperTrade.status == "closed",
    ).order_by(desc(PaperTrade.closed_at)).limit(limit).all()

    return {"trades": [{
        "id": t.id,
        "symbol": t.symbol,
        "trade_type": t.trade_type,
        "entry_price": t.entry_price,
        "current_price": t.current_price,
        "profit": t.profit,
        "result": "win" if t.profit >= 0 else "loss",
        "strategy_name": t.strategy_name,
        "opened_at": t.opened_at.isoformat() if t.opened_at else None,
        "closed_at": t.closed_at.isoformat() if t.closed_at else None,
    } for t in trades]}


@router.get("/stats")
def paper_trading_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trades = db.query(PaperTrade).filter(
        PaperTrade.user_id == current_user.id,
        PaperTrade.status == "closed",
    ).all()

    total = len(trades)
    wins = [t for t in trades if t.profit and t.profit >= 0]
    losses = [t for t in trades if t.profit and t.profit < 0]
    total_pnl = sum(t.profit for t in trades if t.profit)
    win_rate = round(len(wins) / total * 100, 1) if total else 0

    open_count = db.query(PaperTrade).filter(
        PaperTrade.user_id == current_user.id,
        PaperTrade.status == "open",
    ).count()

    return {
        "total_closed": total,
        "open_positions": open_count,
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate": win_rate,
        "total_pnl": round(total_pnl, 2),
        "mode": "paper",
    }
