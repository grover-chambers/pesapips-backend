from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.signal_engine import run_signal
from app.services.market_data import get_market_data
from app.mt5_bridge.socket_client import mt5 as mt5_bridge
from app.services.backtester import run_backtest
from app.models.user import User
from app.models.strategy import UserStrategy
from app.dependencies import get_current_user
from app.core.database import get_db
from pydantic import BaseModel
from typing import Optional


def get_candles(symbol: str, timeframe: str, periods: int = 200):
    """Get candles from MT5 if connected, else fallback to Yahoo."""
    if mt5_bridge.is_connected():
        try:
            result = mt5_bridge._send({"action": "CANDLES", "symbol": symbol,
                                       "timeframe": timeframe, "periods": periods})
            if result.get("status") == "ok" and result.get("candles"):
                import pandas as pd
                df = pd.DataFrame(result["candles"])
                df["time"] = pd.to_datetime(df["t"], unit="s")
                df = df.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
                return df.set_index("time")
        except:
            pass
    return get_market_data(symbol=symbol, timeframe=timeframe, periods=periods)

router = APIRouter(prefix="/signal", tags=["Signal"])


class SignalRequest(BaseModel):
    asset: str = "XAUUSD"
    timeframe: str = "M5"
    params: Optional[dict] = None
    strategy_id: Optional[int] = None

    class Config:
        extra = "allow"


DEFAULT_PARAMS = {
    "ema_fast": 9, "ema_mid": 21, "ema_slow": 50,
    "rsi_period": 14, "rsi_buy": 30, "rsi_sell": 70,
    "macd_fast": 12, "macd_slow": 26, "macd_signal": 9,
    "risk_per_trade": 1.0, "sl_pips": 15, "tp_pips": 30,
}


@router.post("/run")
def run_signal_now(
    payload: SignalRequest,
    current_user: User = Depends(get_current_user),
):
    params = payload.params or DEFAULT_PARAMS
    df = get_candles(symbol=payload.asset, timeframe=payload.timeframe, periods=500)
    result = run_signal(df, params)
    latest_price = round(float(df.iloc[-1]["close"]), 2) if not df.empty else 0
    return {
        "asset":        payload.asset,
        "timeframe":    payload.timeframe,
        "latest_price": latest_price,
        **result,
    }


@router.post("/backtest")
def backtest(
    payload: SignalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    params = payload.params or DEFAULT_PARAMS
    periods = getattr(payload, "periods", None) or 500
    # Try MT5 first for real broker data
    df = None
    if mt5_bridge.is_connected():
        try:
            result_mt5 = mt5_bridge._send({"action": "CANDLES", "symbol": payload.asset,
                                           "timeframe": payload.timeframe, "periods": periods})
            if result_mt5.get("status") == "ok" and result_mt5.get("candles"):
                import pandas as pd
                candles = result_mt5["candles"]
                df = pd.DataFrame(candles)
                df["time"] = pd.to_datetime(df["t"], unit="s")
                df = df.rename(columns={"o":"open","h":"high","l":"low","c":"close","v":"volume"})
                df = df.set_index("time")
        except Exception as e:
            df = None
    if df is None or df.empty:
        df = get_candles(symbol=payload.asset, timeframe=payload.timeframe, periods=periods)
    result = run_backtest(df, params)

    # Save result to UserStrategy — try by strategy_id first, then by strategy_name
    strategy_id   = getattr(payload, "strategy_id", None)
    strategy_name = params.get("strategy_name")
    target_us     = None

    try:
        if strategy_id:
            target_us = db.query(UserStrategy).filter(
                UserStrategy.id == strategy_id,
                UserStrategy.user_id == current_user.id
            ).first()

        if not target_us and strategy_name:
            all_us = db.query(UserStrategy).filter(
                UserStrategy.user_id == current_user.id
            ).all()
            for us in all_us:
                cp = us.custom_params or {}
                if cp.get("strategy_name") == strategy_name:
                    target_us = us
                    break

        if not target_us and strategy_name:
            # Create a new UserStrategy entry to store the default result
            target_us = UserStrategy(
                user_id    = current_user.id,
                strategy_id= 1,
                asset      = payload.asset,
                timeframe  = payload.timeframe,
                custom_params = {
                    "strategy_name": strategy_name,
                    "indicators": params.get("indicators", ["EMA","RSI","MACD"]),
                    **{k: v for k, v in params.items() if k not in ["strategy_name"]}
                },
                is_active = False,
            )
            db.add(target_us)
            db.flush()

        if target_us:
            target_us.backtest_result = {
                **result,
                "asset": payload.asset,
                "timeframe": payload.timeframe,
            }
            db.commit()
    except Exception as e:
        print(f"Backtest save error: {e}")
        db.rollback()

    return {"asset": payload.asset, "params": params, **result}


@router.get("/indicators")
def list_indicators(current_user: User = Depends(get_current_user)):
    from app.services.signal_engine import get_available_indicators, DEFAULT_PARAMS
    return {
        "indicators": get_available_indicators(),
        "default_params": DEFAULT_PARAMS,
    }


# ── MARKET INTEL ─────────────────────────────────────────────────────────────
@router.post("/market-intel")
def market_intel(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.market_regime import detect_regime
    from app.models.strategy import Strategy

    symbol    = request.get("symbol", "XAUUSD")
    timeframe = request.get("timeframe", "H1")
    periods   = int(request.get("periods", 500))

    # Tier gating
    plan = current_user.subscription_plan
    tier_order = {"free": 0, "pro": 1, "elite": 2, "platinum": 3}
    user_tier  = tier_order.get(plan, 0)

    df = get_candles(symbol, timeframe, periods)
    if df is None or df.empty:
        return {"error": "No market data available"}

    regime = detect_regime(df)
    if "error" in regime:
        return regime

    # Tier gate fields
    if user_tier < 1:  # free — label only
        return {
            "regime":       regime["regime"],
            "regime_label": regime["regime_label"],
            "regime_color": regime["regime_color"],
            "regime_icon":  regime["regime_icon"],
            "regime_short": regime["regime_short"],
            "confidence":   regime["confidence"],
            "tier_limited": True,
            "upgrade_msg":  "Upgrade to Pro to see strategy recommendations and full analysis.",
        }

    # Enrich with strategy names
    strategies = {s.id: s for s in db.query(Strategy).all()}
    for ts in regime["top_strategies"]:
        sid = ts["strategy_id"]
        if sid in strategies:
            s = strategies[sid]
            ts["name"]           = s.name
            ts["timeframe"]      = s.default_params.get("timeframe", "H1")
            ts["tier_required"]  = s.default_params.get("tier_required", "free")
            ts["can_use"]        = tier_order.get(s.default_params.get("tier_required", "free"), 0) <= user_tier

    if user_tier < 2:  # pro — no similarity, no full analysis
        regime.pop("similarity", None)
        regime["analysis"] = regime["analysis"][:3]
        regime["tier_limited"] = True
        regime["upgrade_msg"] = "Upgrade to Elite to see historical similarity analysis."

    if user_tier < 3:  # not platinum — no auto-switching
        regime["auto_switch"] = False
    else:
        regime["auto_switch"] = True

    regime["plan"] = plan
    return regime
