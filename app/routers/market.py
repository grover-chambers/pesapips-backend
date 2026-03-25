from fastapi import APIRouter, Depends, Query
from app.services.calendar_scraper import scrape_forex_factory, get_news_with_fallback
from app.services.signal_engine import run_signal
from app.services.market_data import get_market_data, get_market_watch
from app.models.user import User
from app.dependencies import get_current_user
import time

router = APIRouter(prefix="/market", tags=["Market"])

_calendar_cache   = {"data": [], "fetched_at": 0}
_news_cache       = {"data": [], "fetched_at": 0}
_marketwatch_cache = {"data": [], "fetched_at": 0}


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
    """
    Returns real-time prices + sparklines for all tracked assets from Yahoo Finance.
    Cached for 60 seconds.
    """
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
    periods: int   = Query(60),
    current_user: User = Depends(get_current_user),
):
    df = get_market_data(symbol=symbol, timeframe=timeframe, periods=periods)
    if df is None or df.empty:
        return {"symbol": symbol, "candles": [], "source": "none"}

    source = "yahoo_finance"
    candles = []
    for ts, row in df.iterrows():
        candles.append({
            "time":   ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            "open":   round(float(row["open"]),  5),
            "high":   round(float(row["high"]),  5),
            "low":    round(float(row["low"]),   5),
            "close":  round(float(row["close"]), 5),
            "volume": int(row["volume"]),
        })
    return {"symbol": symbol, "timeframe": timeframe, "candles": candles, "source": source}
