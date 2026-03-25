import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
import yfinance as yf


# Map our symbols to Yahoo Finance tickers
# Assets that fail in batch download and need individual fetch
INDIVIDUAL_FETCH = {"XAUUSD", "XAGUSD", "BTCUSD", "USDKES", "DXY", "EURUSD", "AUDUSD", "NASDAQ", "DOW"}

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


def get_market_data(
    symbol: str = "XAUUSD",
    timeframe: str = "M5",
    periods: int = 200,
) -> Optional[pd.DataFrame]:
    """
    Fetches real OHLCV data from Yahoo Finance.
    Falls back to synthetic data if Yahoo is unreachable.
    """
    try:
        ticker = YAHOO_MAP.get(symbol, symbol)
        yf_period, yf_interval = TIMEFRAME_MAP.get(timeframe, ("5d", "5m"))

        df = yf.download(
            ticker,
            period=yf_period,
            interval=yf_interval,
            progress=False,
            auto_adjust=True,
        )

        if df is None or df.empty:
            return _synthetic(periods=periods)

        # Flatten multi-index columns if present
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        # Normalise column names
        df.columns = [c.lower() for c in df.columns]
        df = df.rename(columns={"vol": "volume"})

        # Ensure required columns
        required = ["open", "high", "low", "close"]
        for col in required:
            if col not in df.columns:
                return _synthetic(periods=periods)

        if "volume" not in df.columns:
            df["volume"] = 0

        # Keep only what we need, drop NaN rows
        df = df[["open", "high", "low", "close", "volume"]].dropna()

        # Return last N periods
        return df.tail(periods)

    except Exception as e:
        print(f"[market_data] yfinance failed for {symbol}: {e}")
        return _synthetic(periods=periods)


def get_current_price(symbol: str) -> Optional[float]:
    """Returns the latest price for a symbol."""
    try:
        ticker = YAHOO_MAP.get(symbol, symbol)
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = getattr(info, "last_price", None)
        if price:
            return float(price)
        # Fallback — get last close from 1d data
        df = yf.download(ticker, period="1d", interval="1m", progress=False, auto_adjust=True)
        if df is not None and not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df.columns = [c.lower() for c in df.columns]
            return float(df["close"].iloc[-1])
    except Exception as e:
        print(f"[market_data] price fetch failed for {symbol}: {e}")
    return None


def get_market_watch() -> list:
    """
    Fetches real-time price + change data for all tracked assets.
    Returns list of dicts ready for the market watch component.
    """
    assets = [
        {"symbol": "XAUUSD", "name": "Gold",        "decimals": 2},
        {"symbol": "XAGUSD", "name": "Silver",      "decimals": 3},
        {"symbol": "EURUSD", "name": "EUR/USD",     "decimals": 4},
        {"symbol": "GBPUSD", "name": "GBP/USD",     "decimals": 4},
        {"symbol": "USDJPY", "name": "USD/JPY",     "decimals": 3},
        {"symbol": "BTCUSD", "name": "Bitcoin",     "decimals": 2},
        {"symbol": "ETHUSD", "name": "Ethereum",    "decimals": 2},
        {"symbol": "USDCHF", "name": "USD/CHF",     "decimals": 4},
        {"symbol": "AUDUSD", "name": "AUD/USD",     "decimals": 4},
        {"symbol": "OIL",    "name": "WTI Oil",     "decimals": 2},
        {"symbol": "NASDAQ", "name": "NASDAQ",      "decimals": 2},
        {"symbol": "DOW",    "name": "Dow Jones",   "decimals": 2},
        {"symbol": "SPX",    "name": "S&P 500",     "decimals": 2},
        {"symbol": "DXY",    "name": "DXY Index",   "decimals": 3},
        {"symbol": "USDKES", "name": "USD/KES",     "decimals": 2},
    ]

    results = []
    tickers = [YAHOO_MAP.get(a["symbol"], a["symbol"]) for a in assets]

    try:
        # Batch download all at once — much faster than one by one
        raw = yf.download(
            tickers,
            period="2d",
            interval="5m",
            progress=False,
            auto_adjust=True,
            group_by="ticker",
        )

        for asset in assets:
            ticker = YAHOO_MAP.get(asset["symbol"])
            try:
                if asset["symbol"] in INDIVIDUAL_FETCH:
                    # These fail in batch — always fetch individually
                    df = yf.download(ticker, period="2d", interval="5m",
                                     progress=False, auto_adjust=True)
                elif len(tickers) > 1:
                    try:
                        df = raw[ticker].copy()
                    except (KeyError, TypeError):
                        df = yf.download(ticker, period="2d", interval="5m",
                                         progress=False, auto_adjust=True)
                else:
                    df = raw.copy()

                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.get_level_values(0)
                df.columns = [c.lower() for c in df.columns]
                df = df.dropna(subset=["close"])

                if df.empty:
                    raise ValueError("empty")

                latest  = float(df["close"].iloc[-1])
                prev    = float(df["close"].iloc[-2]) if len(df) > 1 else latest
                open24  = float(df["close"].iloc[0])
                chg_pct = ((latest - open24) / open24 * 100) if open24 else 0
                chg_abs = latest - open24

                # Sparkline — last 20 closes
                sparkline = df["close"].tail(20).tolist()

                results.append({
                    "symbol":    asset["symbol"],
                    "name":      asset["name"],
                    "price":     round(latest, asset["decimals"]),
                    "change_pct": round(chg_pct, 3),
                    "change_abs": round(chg_abs, asset["decimals"]),
                    "sparkline": [round(float(p), asset["decimals"]) for p in sparkline],
                    "decimals":  asset["decimals"],
                })

            except Exception as e:
                print(f"[market_watch] {asset['symbol']} failed: {e}")
                results.append({
                    "symbol":    asset["symbol"],
                    "name":      asset["name"],
                    "price":     0.0,
                    "change_pct": 0.0,
                    "change_abs": 0.0,
                    "sparkline": [],
                    "decimals":  asset["decimals"],
                })

    except Exception as e:
        print(f"[market_watch] batch download failed: {e}")
        for asset in assets:
            results.append({
                "symbol": asset["symbol"], "name": asset["name"],
                "price": 0.0, "change_pct": 0.0, "change_abs": 0.0,
                "sparkline": [], "decimals": asset["decimals"],
            })

    return results


def _synthetic(
    periods: int = 200,
    base_price: float = 2340.0,
) -> pd.DataFrame:
    """Fallback synthetic OHLCV when Yahoo Finance is unreachable."""
    np.random.seed(42)
    dates = [datetime.now() - timedelta(minutes=5 * i) for i in range(periods, 0, -1)]
    prices = [base_price]
    for _ in range(periods - 1):
        prices.append(round(prices[-1] + np.random.normal(0, 0.5), 2))

    data = []
    for i, (date, close) in enumerate(zip(dates, prices)):
        high   = round(close + abs(np.random.normal(0, 0.3)), 2)
        low    = round(close - abs(np.random.normal(0, 0.3)), 2)
        open_  = prices[i - 1] if i > 0 else close
        volume = int(np.random.uniform(100, 1000))
        data.append({"time": date, "open": open_, "high": high, "low": low, "close": close, "volume": volume})

    df = pd.DataFrame(data)
    df.set_index("time", inplace=True)
    return df
