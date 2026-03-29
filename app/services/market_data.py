import os
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

TWELVE_KEY = os.getenv("TWELVE_DATA_KEY", "")

# Twelve Data symbol map
TWELVE_MAP = {
    "XAUUSD": "XAU/USD",
    "XAGUSD": "XAG/USD",
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
    "USDJPY": "USD/JPY",
    "USDCHF": "USD/CHF",
    "AUDUSD": "AUD/USD",
    "USDCAD": "USD/CAD",
    "NZDUSD": "NZD/USD",
    "BTCUSD": "BTC/USD",
    "ETHUSD": "ETH/USD",
    "OIL":    "WTI/USD",
    "NASDAQ": "IXIC",
    "DOW":    "DJI",
    "SPX":    "SPX",
    "DXY":    "DXY",
    "USDKES": "USD/KES",
}

# Twelve Data interval map
TWELVE_INTERVAL_MAP = {
    "M1":  "1min",
    "M5":  "5min",
    "M15": "15min",
    "M30": "30min",
    "H1":  "1h",
    "H4":  "4h",
    "D1":  "1day",
}

YAHOO_MAP = {
    "XAUUSD": "GC=F",
    "XAGUSD": "SI=F",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "USDJPY=X",
    "BTCUSD": "BTC-USD",
    "ETHUSD": "ETH-USD",
    "USDCHF": "USDCHF=X",
    "AUDUSD": "AUDUSD=X",
    "USDCAD": "USDCAD=X",
    "NZDUSD": "NZDUSD=X",
    "OIL":    "CL=F",
    "NASDAQ": "^IXIC",
    "DOW":    "^DJI",
    "SPX":    "^GSPC",
    "DXY":    "DX-Y.NYB",
    "USDKES": "KES=X",
}

TIMEFRAME_MAP = {
    "M1":  ("1d",  "1m"),
    "M5":  ("5d",  "5m"),
    "M15": ("5d",  "15m"),
    "M30": ("1mo", "30m"),
    "H1":  ("1mo", "1h"),
    "H4":  ("3mo", "1h"),
    "D1":  ("1y",  "1d"),
}


# ── Twelve Data ───────────────────────────────────────────────────────────────

def _twelve_candles(symbol: str, timeframe: str, periods: int) -> Optional[pd.DataFrame]:
    """Fetch OHLCV from Twelve Data. Returns DataFrame or None."""
    if not TWELVE_KEY:
        return None
    td_sym      = TWELVE_MAP.get(symbol)
    td_interval = TWELVE_INTERVAL_MAP.get(timeframe, "5min")
    if not td_sym:
        return None
    try:
        url = "https://api.twelvedata.com/time_series"
        params = {
            "symbol":       td_sym,
            "interval":     td_interval,
            "outputsize":   min(periods, 5000),
            "apikey":       TWELVE_KEY,
            "format":       "JSON",
            "order":        "ASC",
        }
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
        if data.get("status") == "error" or "values" not in data:
            print(f"[twelve] {symbol} error: {data.get('message','unknown')}")
            return None
        rows = data["values"]
        if not rows:
            return None
        df = pd.DataFrame(rows)
        df["datetime"] = pd.to_datetime(df["datetime"])
        df = df.set_index("datetime").sort_index()
        df = df.rename(columns={"open":"open","high":"high","low":"low","close":"close","volume":"volume"})
        for col in ["open","high","low","close"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        if "volume" not in df.columns:
            df["volume"] = 0
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0)
        df = df[["open","high","low","close","volume"]].dropna(subset=["open","close"])
        return df.tail(periods)
    except Exception as e:
        print(f"[twelve] candles failed for {symbol}: {e}")
        return None


def _twelve_price(symbol: str) -> Optional[float]:
    """Fetch latest price from Twelve Data."""
    if not TWELVE_KEY:
        return None
    td_sym = TWELVE_MAP.get(symbol)
    if not td_sym:
        return None
    try:
        url = "https://api.twelvedata.com/price"
        r = requests.get(url, params={"symbol": td_sym, "apikey": TWELVE_KEY}, timeout=6)
        data = r.json()
        price = data.get("price")
        return float(price) if price else None
    except Exception as e:
        print(f"[twelve] price failed for {symbol}: {e}")
        return None


def _twelve_batch_prices(symbols: list) -> dict:
    """Fetch multiple prices in one Twelve Data call."""
    if not TWELVE_KEY:
        return {}
    td_syms = [TWELVE_MAP.get(s) for s in symbols if TWELVE_MAP.get(s)]
    sym_map  = {TWELVE_MAP[s]: s for s in symbols if TWELVE_MAP.get(s)}
    if not td_syms:
        return {}
    try:
        url = "https://api.twelvedata.com/price"
        r = requests.get(url, params={
            "symbol": ",".join(td_syms),
            "apikey": TWELVE_KEY,
        }, timeout=10)
        data = r.json()
        result = {}
        for td_sym, our_sym in sym_map.items():
            entry = data.get(td_sym, {})
            price = entry.get("price") if isinstance(entry, dict) else None
            if price:
                result[our_sym] = float(price)
        return result
    except Exception as e:
        print(f"[twelve] batch prices failed: {e}")
        return {}


# ── Yahoo fallback ────────────────────────────────────────────────────────────

def _yahoo_candles(symbol: str, timeframe: str, periods: int) -> Optional[pd.DataFrame]:
    try:
        ticker = YAHOO_MAP.get(symbol, symbol)
        yf_period, yf_interval = TIMEFRAME_MAP.get(timeframe, ("5d", "5m"))
        df = yf.download(ticker, period=yf_period, interval=yf_interval,
                         progress=False, auto_adjust=True)
        if df is None or df.empty:
            return None
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)
        df.columns = [c.lower() for c in df.columns]
        df = df.rename(columns={"vol": "volume"})
        for col in ["open","high","low","close"]:
            if col not in df.columns:
                return None
        if "volume" not in df.columns:
            df["volume"] = 0
        df = df[["open","high","low","close","volume"]].dropna()
        if timeframe == "H4":
            df = df.resample("4h").agg({
                "open": "first", "high": "max",
                "low": "min", "close": "last", "volume": "sum"
            }).dropna()
        return df.tail(periods)
    except Exception as e:
        print(f"[yahoo] candles failed for {symbol}: {e}")
        return None


# ── Public API ────────────────────────────────────────────────────────────────

def get_market_data(
    symbol: str = "XAUUSD",
    timeframe: str = "M5",
    periods: int = 200,
) -> Optional[pd.DataFrame]:
    """Twelve Data first, synthetic last resort. Yahoo removed — unreliable."""
    df = _twelve_candles(symbol, timeframe, periods)
    if df is not None and not df.empty:
        return df
    print(f"[market_data] Twelve Data failed for {symbol}, using synthetic")
    return _synthetic(periods=periods)


def get_current_price(symbol: str) -> Optional[float]:
    return _twelve_price(symbol)


def get_market_watch() -> list:
    assets = [
        {"symbol": "XAUUSD", "name": "Gold",      "decimals": 2},
        {"symbol": "XAGUSD", "name": "Silver",    "decimals": 3},
        {"symbol": "EURUSD", "name": "EUR/USD",   "decimals": 4},
        {"symbol": "GBPUSD", "name": "GBP/USD",   "decimals": 4},
        {"symbol": "USDJPY", "name": "USD/JPY",   "decimals": 3},
        {"symbol": "BTCUSD", "name": "Bitcoin",   "decimals": 2},
        {"symbol": "ETHUSD", "name": "Ethereum",  "decimals": 2},
        {"symbol": "USDCHF", "name": "USD/CHF",   "decimals": 4},
        {"symbol": "AUDUSD", "name": "AUD/USD",   "decimals": 4},
        {"symbol": "OIL",    "name": "WTI Oil",   "decimals": 2},
        {"symbol": "NASDAQ", "name": "NASDAQ",    "decimals": 2},
        {"symbol": "DOW",    "name": "Dow Jones", "decimals": 2},
        {"symbol": "SPX",    "name": "S&P 500",   "decimals": 2},
        {"symbol": "DXY",    "name": "DXY Index", "decimals": 3},
        {"symbol": "USDKES", "name": "USD/KES",   "decimals": 2},
    ]

    symbols = [a["symbol"] for a in assets]

    # Batch fetch from Twelve Data — one API call for all prices
    twelve_prices = _twelve_batch_prices(symbols)

    results = []
    for asset in assets:
        sym = asset["symbol"]
        try:
            price = twelve_prices.get(sym)

            if not price:
                raise ValueError(f"No Twelve Data price for {sym}")
            else:
                # Get sparkline from Twelve Data candles (last 20 x 5min)
                spark_df = _twelve_candles(sym, "M5", 20)
                if spark_df is not None and not spark_df.empty:
                    sparkline = spark_df["close"].tolist()
                    open24    = float(spark_df["close"].iloc[0])
                else:
                    sparkline = [price]
                    open24    = price
                chg_pct = ((price - open24) / open24 * 100) if open24 else 0
                chg_abs = price - open24

            results.append({
                "symbol":     sym,
                "name":       asset["name"],
                "price":      round(price, asset["decimals"]),
                "change_pct": round(chg_pct, 3),
                "change_abs": round(chg_abs, asset["decimals"]),
                "sparkline":  [round(float(p), asset["decimals"]) for p in sparkline],
                "decimals":   asset["decimals"],
            })
        except Exception as e:
            print(f"[market_watch] {sym} failed: {e}")
            results.append({
                "symbol": sym, "name": asset["name"],
                "price": 0.0, "change_pct": 0.0, "change_abs": 0.0,
                "sparkline": [], "decimals": asset["decimals"],
            })

    return results


def _synthetic(periods: int = 200, base_price: float = 2340.0) -> pd.DataFrame:
    np.random.seed(42)
    dates = [datetime.now() - timedelta(minutes=5 * i) for i in range(periods, 0, -1)]
    prices = [base_price]
    for _ in range(periods - 1):
        prices.append(round(prices[-1] + np.random.normal(0, 0.5), 2))
    data = []
    for i, (date, close) in enumerate(zip(dates, prices)):
        high  = round(close + abs(np.random.normal(0, 0.3)), 2)
        low   = round(close - abs(np.random.normal(0, 0.3)), 2)
        open_ = prices[i - 1] if i > 0 else close
        data.append({"time": date, "open": open_, "high": high,
                     "low": low, "close": close, "volume": 100})
    df = pd.DataFrame(data)
    df.set_index("time", inplace=True)
    return df
