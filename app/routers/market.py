from fastapi import APIRouter, Depends, Query
from app.services.calendar_scraper import scrape_forex_factory, get_news_with_fallback
from app.services.signal_engine import run_signal
from app.services.market_data import get_market_data, get_market_watch
from app.models.user import User
from app.dependencies import get_current_user
from datetime import datetime, timezone
import pandas as pd
import time

router = APIRouter(prefix="/market", tags=["Market"])

_calendar_cache    = {"data": [], "fetched_at": 0}
_news_cache        = {"data": [], "fetched_at": 0}
_marketwatch_cache = {"data": [], "fetched_at": 0}


def _is_market_closed() -> bool:
    """Forex market closed: Saturday all day, Sunday all day, Friday after 22:00 UTC."""
    now     = datetime.now(timezone.utc)
    weekday = now.weekday()  # 0=Mon … 6=Sun
    hour    = now.hour
    return (
        weekday == 5 or                    # Saturday
        weekday == 6 or                    # Sunday
        (weekday == 4 and hour >= 22)      # Friday after 22:00 UTC
    )


@router.get("/calendar")
def get_calendar(
    force: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    now = time.time()
    if force or now - _calendar_cache["fetched_at"] > 900:
        _calendar_cache["data"] = scrape_forex_factory()
        _calendar_cache["fetched_at"] = now
    return {
        "events": _calendar_cache["data"],
        "count":  len(_calendar_cache["data"]),
        "source": "forexfactory.com",
    }


@router.get("/news")
def get_news(
    force: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    now = time.time()
    if force or now - _news_cache["fetched_at"] > 600:
        _news_cache["data"] = get_news_with_fallback()
        _news_cache["fetched_at"] = now
    return {
        "articles": _news_cache["data"],
        "count":    len(_news_cache["data"]),
        "source":   "rss",
    }


@router.get("/watch")
def market_watch_prices(
    force: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    now = time.time()
    if force or now - _marketwatch_cache["fetched_at"] > 30:
        _marketwatch_cache["data"] = get_market_watch()
        _marketwatch_cache["fetched_at"] = now
    return {
        "assets":    _marketwatch_cache["data"],
        "count":     len(_marketwatch_cache["data"]),
        "source":    "yahoo_finance",
        "cached_at": int(_marketwatch_cache["fetched_at"]),
    }


@router.get("/scan")
def market_scan(current_user: User = Depends(get_current_user)):
    """AI signal scan for all assets."""
    params = {
        "ema_fast": 9, "ema_mid": 21, "ema_slow": 50,
        "rsi_period": 14, "rsi_buy": 30, "rsi_sell": 70,
        "macd_fast": 12, "macd_slow": 26, "macd_signal": 9,
    }
    assets = [
        "XAUUSD","XAGUSD","EURUSD","GBPUSD","USDJPY",
        "BTCUSD","ETHUSD","USDCHF","AUDUSD",
        "OIL","NASDAQ","DOW","SPX","DXY","USDKES",
    ]
    results = []
    for symbol in assets:
        df  = get_market_data(symbol=symbol, timeframe="M5", periods=200)
        sig = run_signal(df, params)
        latest = float(df.iloc[-1]["close"]) if df is not None and not df.empty else 0
        prev   = float(df.iloc[-2]["close"]) if df is not None and len(df) > 1 else latest
        chg    = ((latest - prev) / prev * 100) if prev else 0
        results.append({
            "symbol":     symbol,
            "price":      round(latest, 5),
            "change_pct": round(chg, 4),
            "signal":     sig["signal"],
            "confidence": sig["confidence"],
            "reason":     sig["reason"],
        })
    results.sort(key=lambda x: (x["signal"] == "HOLD", -x["confidence"]))
    return {"assets": results}


@router.get("/candles/{symbol}")
def get_candles(
    symbol: str,
    timeframe: str = Query("M5"),
    periods:   int = Query(80),
    current_user: User = Depends(get_current_user),
):
    """
    Returns OHLCV candles. Tries MT5 first, falls back to Yahoo Finance.
    Always returns market_closed and cached_at so the frontend can show
    accurate status instead of stale 'last data' warnings.
    """
    from app.routers.signal import get_candles as _get_candles

    market_closed = _is_market_closed()
    now_ts        = int(datetime.now(timezone.utc).timestamp())

    df = _get_candles(symbol=symbol, timeframe=timeframe, periods=periods)

    if df is None or df.empty:
        return {
            "symbol":        symbol,
            "timeframe":     timeframe,
            "candles":       [],
            "source":        "none",
            "market_closed": market_closed,
            "cached_at":     now_ts,
        }

    candles = []
    for ts, row in df.iterrows():
        try:
            unix = int(pd.Timestamp(ts).timestamp())
        except Exception:
            unix = now_ts
        candles.append({
            "time":   unix,
            "open":   round(float(row["open"]),  5),
            "high":   round(float(row["high"]),  5),
            "low":    round(float(row["low"]),   5),
            "close":  round(float(row["close"]), 5),
            "volume": int(row.get("volume", 0)),
        })

    last_ts = candles[-1]["time"] if candles else now_ts

    return {
        "symbol":        symbol,
        "timeframe":     timeframe,
        "candles":       candles,
        "source":        "mt5" if _is_mt5_source(df) else "yahoo_finance",
        "market_closed": market_closed,
        "cached_at":     last_ts,
    }


def _is_mt5_source(df) -> bool:
    """Check if df came from MT5 by looking at index timezone awareness."""
    try:
        return df.index.tzinfo is not None
    except Exception:
        return False
