"""
Market Regime Detector — PesaPips AI
Analyses OHLCV data to classify market conditions and recommend strategies.
"""
import pandas as pd
import numpy as np
import pandas_ta as ta
from typing import Dict, List, Any


REGIME_DESCRIPTIONS = {
    "TRENDING_UP": {
        "label": "Trending Up",
        "color": "#3dd68c",
        "icon": "▲",
        "short": "Strong uptrend in progress. Price making higher highs and higher lows.",
        "advice": "Trade long only. Look for pullbacks to EMA for entries. Avoid counter-trend shorts.",
    },
    "TRENDING_DOWN": {
        "label": "Trending Down",
        "color": "#f06b6b",
        "icon": "▼",
        "short": "Strong downtrend in progress. Price making lower highs and lower lows.",
        "advice": "Trade short only. Look for pullbacks to EMA for short entries. Avoid buying dips.",
    },
    "RANGING": {
        "label": "Ranging / Consolidating",
        "color": "#f5c842",
        "icon": "↔",
        "short": "Market is consolidating. No clear directional bias. Price bound between support and resistance.",
        "advice": "Avoid trend-following strategies. Wait for breakout or trade range extremes only.",
    },
    "VOLATILE": {
        "label": "High Volatility",
        "color": "#a78bfa",
        "icon": "⚡",
        "short": "Volatility is spiking. Large candles, unpredictable moves. Likely news-driven.",
        "advice": "Reduce position size. Widen stops. Avoid scalping. Wait for volatility to settle.",
    },
    "BREAKOUT": {
        "label": "Breakout in Progress",
        "color": "#5b9cf6",
        "icon": "◈",
        "short": "Price breaking out of consolidation with momentum. Institutional participation likely.",
        "advice": "Enter on breakout confirmation. Do NOT chase. Wait for first pullback to breakout level.",
    },
}

STRATEGY_REGIME_FIT = {
    1:  {"TRENDING_UP": 3, "TRENDING_DOWN": 3, "RANGING": 1, "VOLATILE": 1, "BREAKOUT": 2},
    2:  {"TRENDING_UP": 3, "TRENDING_DOWN": 3, "RANGING": 0, "VOLATILE": 1, "BREAKOUT": 2},
    3:  {"TRENDING_UP": 3, "TRENDING_DOWN": 2, "RANGING": 1, "VOLATILE": 1, "BREAKOUT": 2},
    4:  {"TRENDING_UP": 2, "TRENDING_DOWN": 2, "RANGING": 3, "VOLATILE": 1, "BREAKOUT": 3},
    5:  {"TRENDING_UP": 2, "TRENDING_DOWN": 2, "RANGING": 3, "VOLATILE": 2, "BREAKOUT": 3},
    6:  {"TRENDING_UP": 3, "TRENDING_DOWN": 3, "RANGING": 1, "VOLATILE": 0, "BREAKOUT": 2},
    7:  {"TRENDING_UP": 3, "TRENDING_DOWN": 2, "RANGING": 1, "VOLATILE": 1, "BREAKOUT": 2},
    8:  {"TRENDING_UP": 2, "TRENDING_DOWN": 2, "RANGING": 1, "VOLATILE": 2, "BREAKOUT": 3},
    9:  {"TRENDING_UP": 3, "TRENDING_DOWN": 1, "RANGING": 1, "VOLATILE": 1, "BREAKOUT": 2},
}

FIT_LABELS = {0: "Avoid", 1: "Poor", 2: "Fair", 3: "Ideal"}
FIT_COLORS = {0: "#f06b6b", 1: "#f0a843", 2: "#f5c842", 3: "#3dd68c"}


def detect_regime(df: pd.DataFrame, params: dict = None) -> Dict[str, Any]:
    """Full market regime analysis."""
    if len(df) < 50:
        return {"error": "Not enough candles"}

    df = df.copy()
    close = df["close"]
    high  = df["high"]
    low   = df["low"]

    # ── EMAs ─────────────────────────────────────────────────────────────────
    df["ema9"]   = ta.ema(close, length=9)
    df["ema21"]  = ta.ema(close, length=21)
    df["ema50"]  = ta.ema(close, length=50)
    df["ema200"] = ta.ema(close, length=200)

    # ── ADX — trend strength ──────────────────────────────────────────────────
    adx_df = ta.adx(high, low, close, length=14)
    if adx_df is not None:
        df["adx"] = adx_df.iloc[:, 0]
        df["dmp"] = adx_df.iloc[:, 1]
        df["dmn"] = adx_df.iloc[:, 2]
    else:
        df["adx"] = 20; df["dmp"] = 15; df["dmn"] = 15

    # ── ATR — volatility ─────────────────────────────────────────────────────
    df["atr"]     = ta.atr(high, low, close, length=14)
    df["atr_ma"]  = df["atr"].rolling(20).mean()
    df["atr_pct"] = df["atr"] / close * 100

    # ── Bollinger Bands — range detection ────────────────────────────────────
    bb = ta.bbands(close, length=20, std=2)
    if bb is not None:
        df["bb_upper"] = bb.iloc[:, 0]
        df["bb_mid"]   = bb.iloc[:, 1]
        df["bb_lower"] = bb.iloc[:, 2]
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["bb_mid"] * 100

    # ── RSI ───────────────────────────────────────────────────────────────────
    df["rsi"] = ta.rsi(close, length=14)

    df = df.dropna()
    if len(df) < 10:
        return {"error": "Not enough data after indicator calc"}

    latest  = df.iloc[-1]
    prev5   = df.iloc[-5:]
    prev20  = df.iloc[-20:]

    price    = float(latest["close"])
    adx      = float(latest["adx"])
    dmp      = float(latest["dmp"])
    dmn      = float(latest["dmn"])
    rsi      = float(latest["rsi"])
    atr      = float(latest["atr"])
    atr_ma   = float(latest["atr_ma"])
    atr_pct  = float(latest["atr_pct"])
    ema9     = float(latest["ema9"])
    ema21    = float(latest["ema21"])
    ema50    = float(latest["ema50"])
    ema200   = float(latest["ema200"])
    bb_width = float(latest.get("bb_width", 2.0))

    # ── Structure: HH/HL or LH/LL ────────────────────────────────────────────
    highs = [float(df.iloc[-i]["high"]) for i in range(1, 6)]
    lows  = [float(df.iloc[-i]["low"])  for i in range(1, 6)]
    hh = highs[0] > highs[1] > highs[2]
    hl = lows[0]  > lows[1]  > lows[2]
    lh = highs[0] < highs[1] < highs[2]
    ll = lows[0]  < lows[1]  < lows[2]
    bullish_structure = hh and hl
    bearish_structure = lh and ll

    # ── EMA alignment ────────────────────────────────────────────────────────
    ema_bull_aligned = ema9 > ema21 > ema50
    ema_bear_aligned = ema9 < ema21 < ema50
    above_200        = price > ema200
    below_200        = price < ema200

    # ── Volatility state ──────────────────────────────────────────────────────
    vol_expanding    = atr > atr_ma * 1.3
    vol_contracting  = atr < atr_ma * 0.8
    vol_spike        = atr > atr_ma * 1.8

    # ── Breakout detection ────────────────────────────────────────────────────
    recent_range     = float(prev20["high"].max()) - float(prev20["low"].min())
    price_pos        = (price - float(prev20["low"].min())) / (recent_range + 0.001)
    at_range_high    = price_pos > 0.85
    at_range_low     = price_pos < 0.15
    bb_squeeze       = bb_width < float(df["bb_width"].quantile(0.25)) if "bb_width" in df else False
    breakout_candle  = abs(float(latest["close"]) - float(latest["open"])) > atr * 1.5

    # ── REGIME CLASSIFICATION ─────────────────────────────────────────────────
    scores = {
        "TRENDING_UP":   0,
        "TRENDING_DOWN": 0,
        "RANGING":       0,
        "VOLATILE":      0,
        "BREAKOUT":      0,
    }

    # Trending up signals
    if adx > 25:           scores["TRENDING_UP"]   += 2
    if adx > 35:           scores["TRENDING_UP"]   += 1
    if dmp > dmn:          scores["TRENDING_UP"]   += 2
    if ema_bull_aligned:   scores["TRENDING_UP"]   += 2
    if bullish_structure:  scores["TRENDING_UP"]   += 2
    if above_200:          scores["TRENDING_UP"]   += 1
    if rsi > 55:           scores["TRENDING_UP"]   += 1

    # Trending down signals
    if adx > 25:           scores["TRENDING_DOWN"] += 2
    if adx > 35:           scores["TRENDING_DOWN"] += 1
    if dmn > dmp:          scores["TRENDING_DOWN"] += 2
    if ema_bear_aligned:   scores["TRENDING_DOWN"] += 2
    if bearish_structure:  scores["TRENDING_DOWN"] += 2
    if below_200:          scores["TRENDING_DOWN"] += 1
    if rsi < 45:           scores["TRENDING_DOWN"] += 1

    # Ranging signals
    if adx < 20:           scores["RANGING"]       += 3
    if adx < 15:           scores["RANGING"]       += 2
    if vol_contracting:    scores["RANGING"]       += 2
    if bb_squeeze:         scores["RANGING"]       += 2
    if not bullish_structure and not bearish_structure:
                           scores["RANGING"]       += 2

    # Volatile signals
    if vol_spike:          scores["VOLATILE"]      += 4
    if vol_expanding:      scores["VOLATILE"]      += 2
    if atr_pct > 1.5:      scores["VOLATILE"]      += 2

    # Breakout signals
    if bb_squeeze and breakout_candle:
                           scores["BREAKOUT"]      += 4
    if at_range_high or at_range_low:
                           scores["BREAKOUT"]      += 2
    if vol_expanding and (at_range_high or at_range_low):
                           scores["BREAKOUT"]      += 2

    # Resolve: trending up vs down (can't both be top)
    if scores["TRENDING_UP"] > 0 and scores["TRENDING_DOWN"] > 0:
        if dmp > dmn:
            scores["TRENDING_DOWN"] = max(0, scores["TRENDING_DOWN"] - 3)
        else:
            scores["TRENDING_UP"]   = max(0, scores["TRENDING_UP"] - 3)

    regime = max(scores, key=scores.get)
    regime_score = scores[regime]

    # Confidence = score / max_possible (roughly 11 signals max)
    confidence = min(100, int(regime_score / 11 * 100))

    # ── HISTORICAL SIMILARITY (last 500 candles) ──────────────────────────────
    similar_cases = []
    lookback = min(500, len(df) - 20)
    for i in range(20, lookback):
        row = df.iloc[-(i+1)]
        r_adx  = float(row.get("adx", 20))
        r_rsi  = float(row.get("rsi", 50))
        r_atr  = float(row.get("atr", atr))
        r_ema9 = float(row.get("ema9", 0))
        r_ema21= float(row.get("ema21", 0))
        r_close= float(row["close"])
        # Similar if ADX within 8, RSI within 10, same EMA alignment
        same_alignment = (r_ema9 > r_ema21) == (ema9 > ema21)
        if abs(r_adx - adx) < 8 and abs(r_rsi - rsi) < 10 and same_alignment:
            # What happened next?
            future = df.iloc[-(i-1)]["close"] if i > 1 else df.iloc[-1]["close"]
            moved_up = float(future) > r_close
            similar_cases.append(moved_up)
        if len(similar_cases) >= 20:
            break

    bull_pct = int(sum(similar_cases) / len(similar_cases) * 100) if similar_cases else 50
    bear_pct = 100 - bull_pct

    # ── STRATEGY RECOMMENDATIONS ──────────────────────────────────────────────
    strategy_scores = {}
    for sid, fits in STRATEGY_REGIME_FIT.items():
        fit = fits.get(regime, 1)
        strategy_scores[sid] = fit

    sorted_strats = sorted(strategy_scores.items(), key=lambda x: x[1], reverse=True)
    top_strategies = [
        {
            "strategy_id": sid,
            "fit": fit,
            "fit_label": FIT_LABELS[fit],
            "fit_color": FIT_COLORS[fit],
        }
        for sid, fit in sorted_strats
    ]

    # ── PLAIN ENGLISH ANALYSIS ────────────────────────────────────────────────
    trend_dir = "bullish" if dmp > dmn else "bearish"
    trend_str = "strong" if adx > 30 else "moderate" if adx > 20 else "weak"
    vol_state = "spiking" if vol_spike else "expanding" if vol_expanding else "contracting" if vol_contracting else "normal"
    ema_state = "fully aligned bullish" if ema_bull_aligned else "fully aligned bearish" if ema_bear_aligned else "mixed"
    struct    = "HH/HL (bullish)" if bullish_structure else "LH/LL (bearish)" if bearish_structure else "no clear structure"

    analysis_lines = [
        f"ADX is {adx:.1f} — {trend_str} trend with {trend_dir} bias (DM+:{dmp:.1f} DM-:{dmn:.1f}).",
        f"EMA alignment is {ema_state}. Price is {'above' if above_200 else 'below'} the 200 EMA.",
        f"Market structure shows {struct}.",
        f"RSI at {rsi:.1f} — {'overbought' if rsi > 70 else 'oversold' if rsi < 30 else 'neutral'}.",
        f"ATR is {atr:.1f} ({atr_pct:.2f}% of price) — volatility is {vol_state}.",
        f"Of {len(similar_cases)} similar historical setups, {bull_pct}% resolved upward and {bear_pct}% resolved downward.",
    ]

    return {
        "regime":          regime,
        "regime_label":    REGIME_DESCRIPTIONS[regime]["label"],
        "regime_color":    REGIME_DESCRIPTIONS[regime]["color"],
        "regime_icon":     REGIME_DESCRIPTIONS[regime]["icon"],
        "regime_short":    REGIME_DESCRIPTIONS[regime]["short"],
        "regime_advice":   REGIME_DESCRIPTIONS[regime]["advice"],
        "confidence":      confidence,
        "scores":          scores,
        "indicators": {
            "adx":         round(adx, 1),
            "dmp":         round(dmp, 1),
            "dmn":         round(dmn, 1),
            "rsi":         round(rsi, 1),
            "atr":         round(atr, 2),
            "atr_pct":     round(atr_pct, 3),
            "atr_vs_avg":  round(atr / atr_ma, 2),
            "ema9":        round(ema9, 2),
            "ema21":       round(ema21, 2),
            "ema50":       round(ema50, 2),
            "ema200":      round(ema200, 2),
            "bb_width":    round(bb_width, 2),
            "price":       round(price, 2),
        },
        "structure": {
            "bullish":     bullish_structure,
            "bearish":     bearish_structure,
            "above_200":   above_200,
            "ema_aligned": ema_bull_aligned or ema_bear_aligned,
            "vol_state":   vol_state,
            "price_pos":   round(price_pos * 100, 1),
        },
        "similarity": {
            "cases":       len(similar_cases),
            "bull_pct":    bull_pct,
            "bear_pct":    bear_pct,
        },
        "analysis":        analysis_lines,
        "top_strategies":  top_strategies,
    }
