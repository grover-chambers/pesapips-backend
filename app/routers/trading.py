from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.mt5_account import MT5Account
from app.models.strategy import UserStrategy
from app.models.trade import Trade
from app.dependencies import get_current_user
from app.mt5_bridge.socket_client import mt5 as mt5_bridge, MT5Bridge
from app.routers.ws_bridge import manager
from datetime import datetime

router = APIRouter(prefix="/trading", tags=["Trading"])

# ── Candle cache — serves last known data when MT5 is offline (weekends) ──────
_candle_cache: dict = {}  # key: "symbol_timeframe" → {"candles": [...], "ts": time}

# Load seed cache from file if exists
import json as _json, os as _os
_seed_path = _os.path.join(_os.path.dirname(__file__), "..", "candle_cache_seed.json")
if _os.path.exists(_seed_path):
    try:
        with open(_seed_path) as _f:
            _candle_cache.update(_json.load(_f))
        print(f"[candle cache] Loaded {len(_candle_cache)} pairs from seed")
    except Exception as _e:
        print(f"[candle cache] Seed load failed: {_e}")



class TradeRequest(BaseModel):
    symbol: str
    volume: float = 0.01
    sl: float = 0.0
    tp: float = 0.0
    comment: str = "PesaPips"

class CloseRequest(BaseModel):
    ticket: int

# ── STATUS ────────────────────────────────────────────────────────────────────

@router.get("/status")
def trading_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ws_connected   = manager.is_connected(current_user.id)
    file_connected = mt5_bridge.is_connected()
    connected      = ws_connected or file_connected
    account = db.query(MT5Account).filter(
        MT5Account.user_id == current_user.id,
        MT5Account.is_active == True
    ).first()
    return {
        "agent_connected": connected,
        "ws_connected":    ws_connected,
        "file_connected":  file_connected,
        "has_account": account is not None,
        "account_number": account.account_number if account else None,
        "broker": account.broker_name if account else None,
    }

# ── BALANCE ───────────────────────────────────────────────────────────────────

async def route_command(user_id: int, command: dict) -> dict:
    """Route command to WS agent or file bridge."""
    if manager.is_connected(user_id):
        return await manager.send_command(user_id, command)
    elif mt5_bridge.is_connected():
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, mt5_bridge._send, command)
    return {"status": "error", "message": "MT5 not connected. Run PesaPips agent or attach EA."}

@router.get("/balance")
async def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "BALANCE"})
    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result["message"])
    return result

# ── POSITIONS ─────────────────────────────────────────────────────────────────

@router.get("/positions")
async def get_positions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "POSITIONS"})
    if result.get("status") == "error":
        return {"positions": [], "agent_connected": False, "message": result["message"]}
    return result

# ── HISTORY ───────────────────────────────────────────────────────────────────

@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "HISTORY"})
    if result.get("status") == "error":
        return {"deals": [], "agent_connected": False, "message": result["message"]}
    return result

# ── BUY ───────────────────────────────────────────────────────────────────────

@router.post("/buy")
async def open_buy(
    req: TradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {
        "action": "BUY", "symbol": req.symbol, "volume": req.volume,
        "sl": req.sl, "tp": req.tp, "comment": req.comment
    })
    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result["message"])
    return result

# ── SELL ──────────────────────────────────────────────────────────────────────

@router.post("/sell")
async def open_sell(
    req: TradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {
        "action": "SELL", "symbol": req.symbol, "volume": req.volume,
        "sl": req.sl, "tp": req.tp, "comment": req.comment
    })
    if result.get("status") == "error":
        raise HTTPException(status_code=503, detail=result["message"])
    return result

# ── CLOSE ─────────────────────────────────────────────────────────────────────

@router.post("/close/{ticket}")
async def close_trade(
    ticket: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "CLOSE", "ticket": str(ticket)})
    return result

# ── CLOSE ALL ─────────────────────────────────────────────────────────────────

@router.post("/close-all")
async def close_all_trades(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "CLOSE_ALL"})
    return result


@router.get("/candles/{symbol}")
async def get_candles(
    symbol: str,
    timeframe: str = "M5",
    periods: int = 80,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import time as _time
    cache_key = f"{symbol}_{timeframe}"

    result = await route_command(current_user.id, {
        "action": "CANDLES",
        "symbol": symbol,
        "timeframe": timeframe,
        "periods": periods
    })

    if result.get("status") == "error" or not result.get("candles"):
        # Serve cached candles if available
        cached = _candle_cache.get(cache_key)
        if cached:
            return {"status": "ok", "candles": cached["candles"],
                    "source": "cache", "symbol": symbol, "timeframe": timeframe,
                    "cached_at": cached["ts"], "market_closed": True}
        return {"status": "error", "candles": [], "source": "mt5",
                "message": result.get("message", "No data"), "market_closed": True}

    # Format candles for frontend
    candles = [{"time": c["t"], "open": c["o"], "high": c["h"],
                "low": c["l"], "close": c["c"], "volume": c["v"]}
               for c in result.get("candles", [])]

    # Save to cache
    _candle_cache[cache_key] = {"candles": candles, "ts": int(_time.time())}

    return {"status": "ok", "candles": candles, "source": "mt5",
            "symbol": symbol, "timeframe": timeframe, "market_closed": False}


@router.get("/watch")
async def get_market_watch(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await route_command(current_user.id, {"action": "WATCH"})
    if result.get("status") == "error":
        return {"status": "error", "assets": [], "message": result["message"]}
    return result

# ── START/STOP (legacy compatibility) ─────────────────────────────────────────

@router.post("/start/{user_strategy_id}")
async def start_trading(
    user_strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    us = db.query(UserStrategy).filter(
        UserStrategy.id == user_strategy_id,
        UserStrategy.user_id == current_user.id
    ).first()
    if not us:
        raise HTTPException(status_code=404, detail="Strategy not found")

    # Deactivate all other strategies first
    db.query(UserStrategy).filter(
        UserStrategy.user_id == current_user.id,
        UserStrategy.id != user_strategy_id
    ).update({"is_active": False})
    us.is_active = True
    db.commit()

    connected = manager.is_connected(current_user.id) or mt5_bridge.is_connected()
    if not connected:
        return {"status": "strategy_activated", "agent_connected": False,
                "message": "Strategy activated. Connect the PesaPips agent to start live trading."}

    balance = await route_command(current_user.id, {"action": "BALANCE"})
    return {"status": "active", "agent_connected": True, "balance": balance}

@router.post("/stop/{user_strategy_id}")
def stop_trading(
    user_strategy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    us = db.query(UserStrategy).filter(
        UserStrategy.id == user_strategy_id,
        UserStrategy.user_id == current_user.id
    ).first()
    if not us:
        raise HTTPException(status_code=404, detail="Strategy not found")

    us.is_active = False
    db.commit()
    return {"status": "stopped"}


# ── Autorun endpoints ─────────────────────────────────────────────────────────
@router.post("/autorun/start")
async def autorun_start(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services import autorun_engine
    # Verify user has an active strategy
    from app.models.strategy import UserStrategy
    active = db.query(UserStrategy).filter(
        UserStrategy.user_id == current_user.id,
        UserStrategy.is_active == True
    ).first()
    if not active:
        return {"status": "error", "message": "No active strategy. Activate a strategy first."}
    result = await autorun_engine.start(current_user.id)
    # Persist autorun state
    if result.get("status") != "error":
        current_user.autorun_active = True
        current_user.autorun_strategy_id = active.strategy_id
        db.commit()
    return result

@router.post("/autorun/stop")
async def autorun_stop(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services import autorun_engine
    result = await autorun_engine.stop(current_user.id)
    current_user.autorun_active = False
    db.commit()
    return result

@router.get("/autorun/status")
async def autorun_status(current_user: User = Depends(get_current_user)):
    from app.services import autorun_engine
    return autorun_engine.get_status(current_user.id)


@router.get("/system/stats")
async def system_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Real system stats for user settings page."""
    import psutil, time
    from app.mt5_bridge.socket_client import mt5 as mt5_bridge

    # Backend health
    cpu    = psutil.cpu_percent(interval=0.1)
    mem    = psutil.virtual_memory()
    disk   = psutil.disk_usage("/")

    # MT5 bridge status
    mt5_connected = mt5_bridge.is_connected()
    mt5_info = {}
    if mt5_connected:
        try:
            bal = mt5_bridge._send({"action": "BALANCE"})
            mt5_info = {
                "server":  bal.get("server", ""),
                "login":   bal.get("login", ""),
                "balance": bal.get("balance", 0),
            }
        except:
            pass

    # User's strategies
    from app.models.strategy import UserStrategy
    total_strats  = db.query(UserStrategy).filter(UserStrategy.user_id == current_user.id).count()
    active_strats = db.query(UserStrategy).filter(
        UserStrategy.user_id == current_user.id,
        UserStrategy.is_active == True
    ).count()

    return {
        "backend": {
            "status":    "online",
            "cpu_pct":   round(cpu, 1),
            "mem_pct":   round(mem.percent, 1),
            "mem_used":  f"{mem.used // (1024**3):.1f}GB",
            "mem_total": f"{mem.total // (1024**3):.1f}GB",
            "disk_pct":  round(disk.percent, 1),
        },
        "mt5": {
            "connected": mt5_connected,
            **mt5_info,
        },
        "strategies": {
            "total":  total_strats,
            "active": active_strats,
        },
        "plan": current_user.subscription_plan,
    }
