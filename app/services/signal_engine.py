import pandas as pd
import pandas_ta as ta
import numpy as np

AVAILABLE_INDICATORS = {
    "EMA":       {"params": ["ema_fast", "ema_mid", "ema_slow"], "desc": "EMA trend filter + pullback entry"},
    "RSI":       {"params": ["rsi_period", "rsi_buy", "rsi_sell"], "desc": "RSI momentum timing"},
    "MACD":      {"params": ["macd_fast", "macd_slow", "macd_signal"], "desc": "MACD trend confirmation"},
    "BOLLINGER": {"params": ["bb_period", "bb_std"], "desc": "Bollinger Bands volatility + mean reversion"},
    "STOCH":     {"params": ["stoch_k", "stoch_d", "stoch_buy", "stoch_sell"], "desc": "Stochastic Oscillator"},
    "ATR":       {"params": ["atr_period"], "desc": "ATR volatility filter"},
    "CCI":       {"params": ["cci_period", "cci_buy", "cci_sell"], "desc": "Commodity Channel Index"},
    "VOLUME":    {"params": ["volume_breakout_mult", "volume_pullback_mult"], "desc": "Volume analysis — breakout + contraction"},
}

DEFAULT_PARAMS = {
    "ema_fast": 9, "ema_mid": 21, "ema_slow": 50, "ema_filter": 200,
    "rsi_period": 14, "rsi_buy": 35, "rsi_sell": 65,
    "macd_fast": 12, "macd_slow": 26, "macd_signal": 9,
    "bb_period": 20, "bb_std": 2.0,
    "stoch_k": 14, "stoch_d": 3, "stoch_buy": 25, "stoch_sell": 75,
    "atr_period": 14,
    "cci_period": 20, "cci_buy": -100, "cci_sell": 100,
    "risk_per_trade": 1.0, "sl_pips": 15, "tp_pips": 30,
    "volume_breakout_mult": 2.0, "volume_pullback_mult": 0.7, "base_candles": 5,
}


class SignalEngine:
    def __init__(self, params: dict):
        p = {**DEFAULT_PARAMS, **params}
        self.p            = p
        self.ema_fast     = int(p.get("ema_fast", 9))
        self.ema_mid      = int(p.get("ema_mid", 21))
        self.ema_slow     = int(p.get("ema_slow", 50))
        self.ema_filter   = int(p.get("ema_filter", 200))
        self.rsi_period   = int(p.get("rsi_period", 14))
        self.rsi_buy      = float(p.get("rsi_buy", 35))
        self.rsi_sell     = float(p.get("rsi_sell", 65))
        self.macd_fast    = int(p.get("macd_fast", 12))
        self.macd_slow    = int(p.get("macd_slow", 26))
        self.macd_signal  = int(p.get("macd_signal", 9))
        self.bb_period    = int(p.get("bb_period", 20))
        self.bb_std       = float(p.get("bb_std", 2.0))
        self.stoch_k      = int(p.get("stoch_k", 14))
        self.stoch_d      = int(p.get("stoch_d", 3))
        self.stoch_buy    = float(p.get("stoch_buy", 25))
        self.stoch_sell   = float(p.get("stoch_sell", 75))
        self.atr_period   = int(p.get("atr_period", 14))
        self.cci_period   = int(p.get("cci_period", 20))
        self.cci_buy      = float(p.get("cci_buy", -100))
        self.cci_sell     = float(p.get("cci_sell", 100))

        raw = p.get("indicators", ["EMA", "RSI", "MACD"])
        if isinstance(raw, str):
            raw = raw.split(",")
        self.active = [i.strip().upper() for i in raw]

        self.vol_break_mult   = float(p.get("volume_breakout_mult", 2.0))
        self.vol_pull_mult    = float(p.get("volume_pullback_mult", 0.7))
        self.base_candles     = int(p.get("base_candles", 5))
        self.use_golden_cross = bool(p.get("use_golden_cross", False))

        self.min_candles = max(
            self.ema_slow, self.ema_filter, self.macd_slow, self.bb_period, 50
        ) + 30

    # ─────────────────────────────────────────────────────────────────────────
    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        if len(df) < self.min_candles:
            return pd.DataFrame()
        df = df.copy()

        # EMA stack + 200 filter
        if "EMA" in self.active:
            df[f"ema{self.ema_fast}"]    = ta.ema(df["close"], length=self.ema_fast)
            df[f"ema{self.ema_mid}"]     = ta.ema(df["close"], length=self.ema_mid)
            df[f"ema{self.ema_slow}"]    = ta.ema(df["close"], length=self.ema_slow)
            df[f"ema{self.ema_filter}"]  = ta.ema(df["close"], length=self.ema_filter)

        if "RSI" in self.active:
            df["rsi"] = ta.rsi(df["close"], length=self.rsi_period)

        if "MACD" in self.active:
            macd = ta.macd(df["close"], fast=self.macd_fast,
                           slow=self.macd_slow, signal=self.macd_signal)
            if macd is not None:
                mc = f"MACD_{self.macd_fast}_{self.macd_slow}_{self.macd_signal}"
                ms = f"MACDs_{self.macd_fast}_{self.macd_slow}_{self.macd_signal}"
                mh = f"MACDh_{self.macd_fast}_{self.macd_slow}_{self.macd_signal}"
                if mc in macd.columns:
                    df["macd"]             = macd[mc]
                    df["macd_signal_line"] = macd[ms]
                    df["macd_hist"]        = macd[mh] if mh in macd.columns else \
                                             df["macd"] - df["macd_signal_line"]

        if "BOLLINGER" in self.active:
            bb = ta.bbands(df["close"], length=self.bb_period, std=self.bb_std)
            if bb is not None:
                bbu = [c for c in bb.columns if c.startswith("BBU_")]
                bbl = [c for c in bb.columns if c.startswith("BBL_")]
                bbm = [c for c in bb.columns if c.startswith("BBM_")]
                bbw = [c for c in bb.columns if c.startswith("BBB_")]
                if bbu:
                    df["bb_upper"] = bb[bbu[0]]
                    df["bb_lower"] = bb[bbl[0]]
                    df["bb_mid"]   = bb[bbm[0]]
                    df["bb_width"] = bb[bbw[0]] if bbw else \
                                     (df["bb_upper"] - df["bb_lower"]) / df["bb_mid"]

        if "STOCH" in self.active:
            stoch = ta.stoch(df["high"], df["low"], df["close"],
                             k=self.stoch_k, d=self.stoch_d)
            if stoch is not None:
                sk_col = f"STOCHk_{self.stoch_k}_{self.stoch_d}_3"
                sd_col = f"STOCHd_{self.stoch_k}_{self.stoch_d}_3"
                if sk_col in stoch.columns:
                    df["stoch_k_val"] = stoch[sk_col]
                    df["stoch_d_val"] = stoch[sd_col]

        # ATR always computed
        # ── VOLUME ANALYSIS ───────────────────────────────────────────────────
        if "VOLUME" in self.active:
            df["vol_ma"]       = df["volume"].rolling(20).mean()
            df["vol_ratio"]    = df["volume"] / (df["vol_ma"] + 1)
            df["vol_contract"] = df["vol_ratio"] < self.vol_pull_mult
            df["vol_expand"]   = df["vol_ratio"] > self.vol_break_mult
            df["vol_base_low"] = df["volume"].rolling(self.base_candles).min()
            df["vol_base_avg"] = df["volume"].rolling(self.base_candles).mean()

        df["atr"] = ta.atr(df["high"], df["low"], df["close"], length=self.atr_period)

        if "CCI" in self.active:
            df["cci"] = ta.cci(df["high"], df["low"], df["close"],
                               length=self.cci_period)

        # ADX
        adx_data = ta.adx(df["high"], df["low"], df["close"], length=14)
        if adx_data is not None and "ADX_14" in adx_data.columns:
            df["adx"] = adx_data["ADX_14"]

        # Swing structure
        lb = int(self.p.get("swing_lookback", 10))
        df["swing_high"] = df["high"].rolling(lb).max()
        df["swing_low"]  = df["low"].rolling(lb).min()

        # Candle properties
        df["candle_bull"] = df["close"] > df["open"]
        df["candle_bear"] = df["close"] < df["open"]
        df["body_size"]   = abs(df["close"] - df["open"])
        df["candle_range"] = df["high"] - df["low"]
        df["wick_ratio"]  = df["body_size"] / (df["candle_range"] + 0.0001)
        df["avg_body"]    = df["body_size"].rolling(10).mean()
        df["avg_range"]   = df["candle_range"].rolling(10).mean()

        # ── SMC: Fair Value Gap detection ─────────────────────────────────────
        # Bullish FVG: candle[i-2].high < candle[i].low (gap between them)
        # Bearish FVG: candle[i-2].low > candle[i].high
        df["fvg_bull"] = df["low"] > df["high"].shift(2)
        df["fvg_bear"] = df["high"] < df["low"].shift(2)
        df["fvg_bull_top"]    = df["low"]         # top of bullish FVG zone
        df["fvg_bull_bottom"] = df["high"].shift(2)  # bottom of bullish FVG zone
        df["fvg_bear_top"]    = df["low"].shift(2)
        df["fvg_bear_bottom"] = df["high"]

        # ── SMC: Order Block detection ────────────────────────────────────────
        # Bullish OB: last bearish candle before a 3+ candle bullish impulse
        # We mark it simply: bearish candle followed by 2 bullish candles
        avg_b = df["body_size"].rolling(20).mean()
        strong_bull_imp = df["candle_bull"] & (df["body_size"] > avg_b * 1.5)
        strong_bear_imp = df["candle_bear"] & (df["body_size"] > avg_b * 1.5)
        df["ob_bull"] = (
            df["candle_bear"] &
            strong_bull_imp.shift(-1).fillna(False) &
            strong_bull_imp.shift(-2).fillna(False)
        )
        df["ob_bear"] = (
            df["candle_bull"] &
            strong_bear_imp.shift(-1).fillna(False) &
            strong_bear_imp.shift(-2).fillna(False)
        )
        df["ob_bull_high"] = df["high"]   # OB zone = the OB candle range
        df["ob_bull_low"]  = df["low"]
        df["ob_bear_high"] = df["high"]
        df["ob_bear_low"]  = df["low"]

        return df

    # ─────────────────────────────────────────────────────────────────────────
    def _is_trending(self, df: pd.DataFrame) -> bool:
        if "adx" in df.columns:
            return float(df.iloc[-1].get("adx", 0)) > 20
        return True

    def _atr_sl_tp(self, df: pd.DataFrame) -> tuple:
        atr = float(df.iloc[-1].get("atr", 0)) if "atr" in df.columns else 0
        tf  = self.p.get("timeframe", "M5")
        if tf in ("H4", "D1"):
            sl_mult, tp_mult = 2.0, 5.0
        elif tf in ("H1",):
            sl_mult, tp_mult = 1.5, 3.5
        elif tf in ("M1",):
            sl_mult, tp_mult = 1.0, 2.0
        else:
            sl_mult, tp_mult = 1.2, 2.8
        if atr > 0:
            return round(atr * sl_mult, 2), round(atr * tp_mult, 2)
        return float(self.p.get("sl_pips", 15)), float(self.p.get("tp_pips", 30))

    # ─────────────────────────────────────────────────────────────────────────
    def _detect_rsi_divergence(self, df: pd.DataFrame, lookback: int = 5) -> str:
        """Detect RSI divergence. Returns 'bull', 'bear', or 'none'."""
        if "rsi" not in df.columns or len(df) < lookback + 2:
            return "none"
        recent = df.iloc[-(lookback+1):]
        # Bearish divergence: price HH but RSI LH
        price_hh = recent["close"].iloc[-1] > recent["close"].iloc[:-1].max()
        rsi_lh   = recent["rsi"].iloc[-1]   < recent["rsi"].iloc[:-1].max()
        if price_hh and rsi_lh:
            return "bear"
        # Bullish divergence: price LL but RSI HL
        price_ll = recent["close"].iloc[-1] < recent["close"].iloc[:-1].min()
        rsi_hl   = recent["rsi"].iloc[-1]   > recent["rsi"].iloc[:-1].min()
        if price_ll and rsi_hl:
            return "bull"
        return "none"

    def _detect_hh_hl(self, df: pd.DataFrame, lookback: int = 10) -> str:
        """Detect HH/HL (uptrend) or LH/LL (downtrend) structure."""
        if len(df) < lookback * 2:
            return "none"
        highs = df["high"].rolling(lookback).max()
        lows  = df["low"].rolling(lookback).min()
        if len(highs) < 3:
            return "none"
        # Compare last two pivot highs and lows
        hh = float(highs.iloc[-1]) > float(highs.iloc[-lookback-1])
        hl = float(lows.iloc[-1])  > float(lows.iloc[-lookback-1])
        lh = float(highs.iloc[-1]) < float(highs.iloc[-lookback-1])
        ll = float(lows.iloc[-1])  < float(lows.iloc[-lookback-1])
        if hh and hl:
            return "bull"
        if lh and ll:
            return "bear"
        return "none"

    def _detect_inside_bar(self, df: pd.DataFrame) -> str:
        """Detect inside bar pattern."""
        if len(df) < 3:
            return "none"
        mother = df.iloc[-2]  # mother candle
        inside = df.iloc[-1]  # inside candle
        is_inside = (float(inside["high"]) < float(mother["high"]) and
                     float(inside["low"])  > float(mother["low"]))
        if not is_inside:
            return "none"
        # Direction = trend direction (use EMA if available)
        ef = f"ema{self.ema_slow}"
        if ef in df.columns:
            price = float(df.iloc[-1]["close"])
            ema   = float(df.iloc[-1][ef])
            return "bull" if price > ema else "bear"
        return "bull" if float(inside["close"]) > float(inside["open"]) else "bear"

    def _detect_liquidity_sweep(self, df: pd.DataFrame, lookback: int = 20) -> str:
        """Detect liquidity sweep: price spikes above swing high then closes below it."""
        if len(df) < lookback + 2:
            return "none"
        recent = df.iloc[-(lookback+2):-1]  # exclude last candle
        last   = df.iloc[-1]
        swing_h = float(recent["high"].max())
        swing_l = float(recent["low"].min())
        price   = float(last["close"])
        # Bearish sweep: spike above swing high, close back below = sell
        if float(last["high"]) > swing_h and price < swing_h and last["candle_bear"]:
            return "bear"
        # Bullish sweep: spike below swing low, close back above = buy
        if float(last["low"]) < swing_l and price > swing_l and last["candle_bull"]:
            return "bull"
        return "none"

    def _detect_fvg_retest(self, df: pd.DataFrame, lookback: int = 10) -> str:
        """Check if current price is retesting a recent FVG zone."""
        if len(df) < lookback + 3 or "fvg_bull" not in df.columns:
            return "none"
        price  = float(df.iloc[-1]["close"])
        recent = df.iloc[-(lookback+3):-2]
        # Look for bullish FVG zones price is now entering from above
        for idx in range(len(recent)):
            if recent.iloc[idx]["fvg_bull"]:
                top    = float(recent.iloc[idx]["fvg_bull_top"])
                bottom = float(recent.iloc[idx]["fvg_bull_bottom"])
                if bottom <= price <= top:
                    return "bull"
        # Bearish FVG retest
        for idx in range(len(recent)):
            if recent.iloc[idx]["fvg_bear"]:
                top    = float(recent.iloc[idx]["fvg_bear_top"])
                bottom = float(recent.iloc[idx]["fvg_bear_bottom"])
                if bottom <= price <= top:
                    return "bear"
        return "none"

    def _detect_order_block_retest(self, df: pd.DataFrame, lookback: int = 20) -> str:
        """Check if price is retesting a recent order block."""
        if len(df) < lookback + 3 or "ob_bull" not in df.columns:
            return "none"
        price  = float(df.iloc[-1]["close"])
        recent = df.iloc[-(lookback+3):-3]  # exclude recent candles
        for idx in range(len(recent)):
            if recent.iloc[idx]["ob_bull"]:
                ob_high = float(recent.iloc[idx]["ob_bull_high"])
                ob_low  = float(recent.iloc[idx]["ob_bull_low"])
                if ob_low <= price <= ob_high:
                    return "bull"
            if recent.iloc[idx]["ob_bear"]:
                ob_high = float(recent.iloc[idx]["ob_bear_high"])
                ob_low  = float(recent.iloc[idx]["ob_bear_low"])
                if ob_low <= price <= ob_high:
                    return "bear"
        return "none"

    # ─────────────────────────────────────────────────────────────────────────
    def generate_signal(self, df: pd.DataFrame) -> dict:
        df = self.calculate_indicators(df)
        if df.empty:
            return {"signal": "HOLD", "reason": "Not enough candles",
                    "confidence": 0.0, "sl": 0, "tp": 0}
        df = df.dropna(subset=["close"])
        if len(df) < 3:
            return {"signal": "HOLD", "reason": "Not enough data",
                    "confidence": 0.0, "sl": 0, "tp": 0}

        latest = df.iloc[-1]
        prev   = df.iloc[-2]
        prev2  = df.iloc[-3]
        price  = float(latest["close"])

        buy_signals  = []
        sell_signals = []
        reasons_buy  = []
        reasons_sell = []
        weights_buy  = []
        weights_sell = []

        trending = self._is_trending(df)
        sl, tp   = self._atr_sl_tp(df)

        # ── 200 EMA permission gate (used by all EMA strategies) ──────────────
        e200_col = f"ema{self.ema_filter}"
        ema200   = float(latest[e200_col]) if e200_col in df.columns and \
                   not pd.isna(latest[e200_col]) else None
        above_200 = (ema200 is None) or (price > ema200 * 0.998)
        below_200 = (ema200 is None) or (price < ema200 * 1.002)

        # ═════════════════════════════════════════════════════════════════════
        # EMA BLOCK
        # ═════════════════════════════════════════════════════════════════════
        if "EMA" in self.active:
            ef   = f"ema{self.ema_fast}"
            em   = f"ema{self.ema_mid}"
            es   = f"ema{self.ema_slow}"
            has_emas = all(c in df.columns for c in [ef, em, es])

            if has_emas:
                ema9  = float(latest[ef])
                ema21 = float(latest[em])
                ema50 = float(latest[es])
                p_ema9  = float(prev[ef])
                p_ema21 = float(prev[em])

                ema_bull_stack = ema9 > ema21 > ema50
                ema_bear_stack = ema9 < ema21 < ema50

                # ── EMA CROSS (clean signal) ──────────────────────────────────
                # 9 EMA crosses above 21 EMA = fresh signal, not just continuation
                cross_up   = p_ema9 <= p_ema21 and ema9 > ema21
                cross_down = p_ema9 >= p_ema21 and ema9 < ema21

                if cross_up and above_200:
                    buy_signals.append(1)
                    weights_buy.append(2.0)
                    reasons_buy.append("EMA 9/21 cross up")
                if cross_down and below_200:
                    sell_signals.append(1)
                    weights_sell.append(2.0)
                    reasons_sell.append("EMA 9/21 cross down")

                # ── 21 EMA PULLBACK (price returns to 21 after being above it) ─
                # Key condition: price was ABOVE 21 EMA for 3+ candles, now at it
                lookback_n = min(5, len(df)-1)
                above_count = sum(1 for i in range(1, lookback_n)
                    if float(df.iloc[-(i+2)]["close"]) > float(df.iloc[-(i+2)][em]))
                below_count = sum(1 for i in range(1, lookback_n)
                    if float(df.iloc[-(i+2)]["close"]) < float(df.iloc[-(i+2)][em]))
                was_above_21 = above_count >= 2
                was_below_21 = below_count >= 2

                touching_21_bull = (
                    above_200 and ema_bull_stack and was_above_21 and
                    abs(price - ema21) / ema21 < 0.004 and
                    latest["candle_bull"] and
                    latest["body_size"] > latest["avg_body"] * 0.5
                )
                touching_21_bear = (
                    below_200 and ema_bear_stack and was_below_21 and
                    abs(price - ema21) / ema21 < 0.004 and
                    latest["candle_bear"] and
                    latest["body_size"] > latest["avg_body"] * 0.5
                )

                if touching_21_bull:
                    buy_signals.append(1)
                    weights_buy.append(2.0)
                    reasons_buy.append("21 EMA pullback bounce")
                if touching_21_bear:
                    sell_signals.append(1)
                    weights_sell.append(2.0)
                    reasons_sell.append("21 EMA pullback rejection")

                # ── 50 EMA DEEP PULLBACK ──────────────────────────────────────
                touching_50_bull = (
                    above_200 and
                    abs(price - ema50) / ema50 < 0.005 and
                    latest["candle_bull"] and price > ema50
                )
                touching_50_bear = (
                    below_200 and
                    abs(price - ema50) / ema50 < 0.005 and
                    latest["candle_bear"] and price < ema50
                )

                if touching_50_bull:
                    buy_signals.append(1)
                    weights_buy.append(1.5)
                    reasons_buy.append("50 EMA deep pullback")
                if touching_50_bear:
                    sell_signals.append(1)
                    weights_sell.append(1.5)
                    reasons_sell.append("50 EMA deep pullback bear")

                # ── INSIDE BAR BREAKOUT ───────────────────────────────────────
                if self.p.get("use_inside_bar"):
                    ib = self._detect_inside_bar(df)
                    if ib == "bull" and above_200:
                        buy_signals.append(1)
                        weights_buy.append(2.0)
                        reasons_buy.append("Inside bar breakout bull")
                    elif ib == "bear" and below_200:
                        sell_signals.append(1)
                        weights_sell.append(2.0)
                        reasons_sell.append("Inside bar breakout bear")

                # ── HH/HL STRUCTURE ───────────────────────────────────────────
                if self.p.get("use_structure"):
                    struct = self._detect_hh_hl(df, int(self.p.get("swing_lookback", 10)))
                    if struct == "bull" and above_200:
                        buy_signals.append(1)
                        weights_buy.append(1.5)
                        reasons_buy.append("HH/HL bull structure")
                    elif struct == "bear" and below_200:
                        sell_signals.append(1)
                        weights_sell.append(1.5)
                        reasons_sell.append("LH/LL bear structure")

                # ── SMC: ORDER BLOCK RETEST ───────────────────────────────────
                if self.p.get("use_order_block"):
                    ob = self._detect_order_block_retest(df, int(self.p.get("ob_lookback", 20)))
                    if ob == "bull" and above_200:
                        buy_signals.append(1)
                        weights_buy.append(2.0)
                        reasons_buy.append("SMC Order Block retest bull")
                    elif ob == "bear" and below_200:
                        sell_signals.append(1)
                        weights_sell.append(2.0)
                        reasons_sell.append("SMC Order Block retest bear")

                # ── SMC: LIQUIDITY SWEEP ──────────────────────────────────────
                if self.p.get("use_liquidity_sweep"):
                    sweep = self._detect_liquidity_sweep(df, int(self.p.get("sweep_lookback", 20)))
                    if sweep == "bull":
                        buy_signals.append(1)
                        weights_buy.append(2.5)
                        reasons_buy.append("SMC Liquidity sweep bull")
                    elif sweep == "bear":
                        sell_signals.append(1)
                        weights_sell.append(2.5)
                        reasons_sell.append("SMC Liquidity sweep bear")

                # ── SMC: FVG RETEST ───────────────────────────────────────────
                if self.p.get("use_fvg"):
                    fvg = self._detect_fvg_retest(df, int(self.p.get("fvg_lookback", 10)))
                    if fvg == "bull":
                        buy_signals.append(1)
                        weights_buy.append(2.0)
                        reasons_buy.append("SMC FVG retest bull")
                    elif fvg == "bear":
                        sell_signals.append(1)
                        weights_sell.append(2.0)
                        reasons_sell.append("SMC FVG retest bear")

        # ═════════════════════════════════════════════════════════════════════
        # RSI BLOCK
        # ═════════════════════════════════════════════════════════════════════
        if "RSI" in self.active and "rsi" in df.columns:
            rsi      = float(latest["rsi"])
            rsi_prev = float(prev["rsi"])

            # Divergence check
            if self.p.get("use_divergence"):
                div = self._detect_rsi_divergence(df, int(self.p.get("lookback", 5)))
                if div == "bull":
                    buy_signals.append(1)
                    weights_buy.append(2.5)
                    reasons_buy.append(f"RSI bullish divergence ({rsi:.0f})")
                elif div == "bear":
                    sell_signals.append(1)
                    weights_sell.append(2.5)
                    reasons_sell.append(f"RSI bearish divergence ({rsi:.0f})")

            # Oversold bounce
            if rsi < self.rsi_buy and rsi > rsi_prev:
                buy_signals.append(1)
                weights_buy.append(1.5)
                reasons_buy.append(f"RSI oversold bounce ({rsi:.0f})")
            elif rsi < self.rsi_buy:
                buy_signals.append(1)
                weights_buy.append(0.8)
                reasons_buy.append(f"RSI oversold ({rsi:.0f})")

            # Overbought fade
            if rsi > self.rsi_sell and rsi < rsi_prev:
                sell_signals.append(1)
                weights_sell.append(1.5)
                reasons_sell.append(f"RSI overbought fade ({rsi:.0f})")
            elif rsi > self.rsi_sell:
                sell_signals.append(1)
                weights_sell.append(0.8)
                reasons_sell.append(f"RSI overbought ({rsi:.0f})")

            # 50 cross
            if float(prev["rsi"]) < 50 <= rsi:
                buy_signals.append(1)
                weights_buy.append(0.7)
                reasons_buy.append("RSI crossed 50↑")
            if float(prev["rsi"]) > 50 >= rsi:
                sell_signals.append(1)
                weights_sell.append(0.7)
                reasons_sell.append("RSI crossed 50↓")

        # ═════════════════════════════════════════════════════════════════════
        # MACD BLOCK
        # ═════════════════════════════════════════════════════════════════════
        if "MACD" in self.active and "macd" in df.columns:
            macd_line   = float(latest["macd"])
            macd_sig    = float(latest["macd_signal_line"])
            macd_h      = float(latest.get("macd_hist", macd_line - macd_sig))
            prev_macd_h = float(prev.get("macd_hist", 0))

            cross_up   = float(prev["macd"]) < float(prev["macd_signal_line"]) and macd_line >= macd_sig
            cross_down = float(prev["macd"]) > float(prev["macd_signal_line"]) and macd_line <= macd_sig

            if cross_up:
                buy_signals.append(1)
                weights_buy.append(2.0)
                reasons_buy.append("MACD crossover↑")
            elif macd_h > 0 and macd_h > prev_macd_h and macd_line > 0:
                buy_signals.append(1)
                weights_buy.append(1.0)
                reasons_buy.append("MACD histogram building")

            if cross_down:
                sell_signals.append(1)
                weights_sell.append(2.0)
                reasons_sell.append("MACD crossover↓")
            elif macd_h < 0 and macd_h < prev_macd_h and macd_line < 0:
                sell_signals.append(1)
                weights_sell.append(1.0)
                reasons_sell.append("MACD histogram building bear")

        # ═════════════════════════════════════════════════════════════════════
        # BOLLINGER BLOCK
        # ═════════════════════════════════════════════════════════════════════
        if "BOLLINGER" in self.active and "bb_lower" in df.columns:
            bb_upper = float(latest["bb_upper"])
            bb_lower = float(latest["bb_lower"])
            bb_mid   = float(latest["bb_mid"])
            bb_width = float(latest.get("bb_width", (bb_upper - bb_lower) / bb_mid))
            prev_bb_width = float(prev.get("bb_width", bb_width))
            bb_expanding = bb_width > prev_bb_width * 1.02

            at_lower = price <= bb_lower * 1.002
            at_upper = price >= bb_upper * 0.998
            prev_at_lower = float(prev["close"]) <= float(prev["bb_lower"]) * 1.003
            prev_at_upper = float(prev["close"]) >= float(prev["bb_upper"]) * 0.997

            # Double touch (higher conviction) or single strong touch
            if at_lower and latest["candle_bull"] and latest["body_size"] > latest["avg_body"] * 0.7:
                w = 2.0 if prev_at_lower else 1.2
                buy_signals.append(1); weights_buy.append(w)
                reasons_buy.append("BB lower bounce" + (" confirmed" if prev_at_lower else ""))
            if at_upper and latest["candle_bear"] and latest["body_size"] > latest["avg_body"] * 0.7:
                w = 2.0 if prev_at_upper else 1.2
                sell_signals.append(1); weights_sell.append(w)
                reasons_sell.append("BB upper rejection" + (" confirmed" if prev_at_upper else ""))

            # Squeeze breakout — require bands were actually tight before expanding
            if "bb_width" in df.columns and len(df) >= 25:
                bb_w_avg = float(df["bb_width"].iloc[-25:].mean())
                squeezed_count = sum(1 for i in range(3, 9)
                    if i < len(df) and float(df["bb_width"].iloc[-i]) < bb_w_avg * 0.85)
                real_squeeze = squeezed_count >= 3
            else:
                real_squeeze = False
            if real_squeeze and bb_expanding and price > bb_mid and latest["candle_bull"] and                latest["body_size"] > latest["avg_body"] * 1.5:
                buy_signals.append(1); weights_buy.append(1.8)
                reasons_buy.append("BB squeeze breakout up")
            if real_squeeze and bb_expanding and price < bb_mid and latest["candle_bear"] and                latest["body_size"] > latest["avg_body"] * 1.5:
                sell_signals.append(1); weights_sell.append(1.8)
                reasons_sell.append("BB squeeze breakout down")

        # ═════════════════════════════════════════════════════════════════════
        # ═════════════════════════════════════════════════════════════════════
        # ═════════════════════════════════════════════════════════════════════
        # VOLUME ANALYSIS BLOCK
        # "Volume confirms participation" (Images 7, 8, 19)
        # High volume breakout → low volume pullback → entry
        # ═════════════════════════════════════════════════════════════════════
        if "VOLUME" in self.active and "vol_ratio" in df.columns:
            vol_ratio      = float(latest["vol_ratio"])
            prev_vol_ratio = float(prev["vol_ratio"])
            vol_contracting = vol_ratio < self.vol_pull_mult
            vol_expanding   = vol_ratio > self.vol_break_mult

            # Check for prior high-volume breakout (in last 3-8 candles)
            prior_breakout = False
            for i in range(2, min(9, len(df))):
                if float(df.iloc[-i]["vol_ratio"]) > self.vol_break_mult:
                    prior_breakout = True
                    break

            # Volume breakout entry: prior high vol, now contracting = pullback entry
            if prior_breakout and vol_contracting and latest["candle_bull"] and above_200:
                buy_signals.append(1)
                weights_buy.append(2.0)
                reasons_buy.append(f"Volume breakout pullback (vol:{vol_ratio:.1f}x avg)")

            if prior_breakout and vol_contracting and latest["candle_bear"] and below_200:
                sell_signals.append(1)
                weights_sell.append(2.0)
                reasons_sell.append(f"Volume breakdown pullback (vol:{vol_ratio:.1f}x avg)")

            # Volume expansion confirms existing signals (boost weights)
            if vol_expanding and buy_signals:
                weights_buy = [w * 1.2 for w in weights_buy]
                reasons_buy.append(f"Volume expanding ({vol_ratio:.1f}x)")
            if vol_expanding and sell_signals:
                weights_sell = [w * 1.2 for w in weights_sell]
                reasons_sell.append(f"Volume expanding ({vol_ratio:.1f}x)")

            # Skip signal if volume spikes on pullback (weak setup)
            if vol_expanding and not prior_breakout:
                # Random volume spike — reduce confidence
                weights_buy  = [w * 0.7 for w in weights_buy]
                weights_sell = [w * 0.7 for w in weights_sell]

        # ═════════════════════════════════════════════════════════════════════
        # GOLDEN CROSS BLOCK
        # 50 EMA crosses above 200 EMA = long-term bull signal
        # "Hold as long as price stays above 50 EMA" (Image 17)
        # ═════════════════════════════════════════════════════════════════════
        if self.use_golden_cross and "EMA" in self.active:
            ef50  = f"ema{self.ema_fast}"   # mapped to 50 for golden cross
            ef200 = f"ema{self.ema_filter}"  # 200
            if ef50 in df.columns and ef200 in df.columns:
                ema50_now  = float(latest[ef50])
                ema200_now = float(latest[ef200])
                ema50_prev = float(prev[ef50])
                ema200_prev = float(prev[ef200])

                # Golden cross: 50 crosses above 200
                golden_cross = ema50_prev <= ema200_prev and ema50_now > ema200_now
                # Death cross: 50 crosses below 200
                death_cross  = ema50_prev >= ema200_prev and ema50_now < ema200_now

                # Price pulls back to 50 EMA in golden cross regime
                in_golden_regime = ema50_now > ema200_now
                in_death_regime  = ema50_now < ema200_now
                at_50_ema = abs(price - ema50_now) / ema50_now < 0.005

                if golden_cross:
                    buy_signals.append(1)
                    weights_buy.append(3.0)
                    reasons_buy.append("Golden Cross — 50 EMA crossed above 200 EMA")

                elif in_golden_regime and at_50_ema and latest["candle_bull"]:
                    buy_signals.append(1)
                    weights_buy.append(2.0)
                    reasons_buy.append("Golden Cross regime — pullback to 50 EMA")

                if death_cross:
                    sell_signals.append(1)
                    weights_sell.append(3.0)
                    reasons_sell.append("Death Cross — 50 EMA crossed below 200 EMA")

                elif in_death_regime and at_50_ema and latest["candle_bear"]:
                    sell_signals.append(1)
                    weights_sell.append(2.0)
                    reasons_sell.append("Death Cross regime — pullback to 50 EMA")

        # ═════════════════════════════════════════════════════════════════════
        # CANDLE CONFIRMATION BOOST
        # ═════════════════════════════════════════════════════════════════════
        strong_bull = latest["candle_bull"] and latest["body_size"] > latest["avg_body"] * 1.2
        strong_bear = latest["candle_bear"] and latest["body_size"] > latest["avg_body"] * 1.2

        if strong_bull and buy_signals:
            weights_buy  = [w * 1.1 for w in weights_buy]
            reasons_buy.append("strong bull candle")
        if strong_bear and sell_signals:
            weights_sell = [w * 1.1 for w in weights_sell]
            reasons_sell.append("strong bear candle")

        # ═════════════════════════════════════════════════════════════════════
        # CONFLUENCE SCORING
        # ═════════════════════════════════════════════════════════════════════
        n_active   = max(len(self.active), 1)
        total_buy  = sum(weights_buy)  if weights_buy  else 0.0
        total_sell = sum(weights_sell) if weights_sell else 0.0
        max_weight = n_active * 2.0
        conf_buy   = min(total_buy  / max_weight, 1.0)
        conf_sell  = min(total_sell / max_weight, 1.0)

        base_threshold = 0.28 if n_active <= 2 else 0.36
        threshold = base_threshold if trending else base_threshold + 0.12

        if conf_buy >= threshold and conf_buy > conf_sell:
            return {"signal": "BUY",  "reason": " + ".join(reasons_buy),
                    "confidence": round(conf_buy, 2), "sl": sl, "tp": tp,
                    "indicators_hit": len(buy_signals), "trending": trending}

        if conf_sell >= threshold and conf_sell > conf_buy:
            return {"signal": "SELL", "reason": " + ".join(reasons_sell),
                    "confidence": round(conf_sell, 2), "sl": sl, "tp": tp,
                    "indicators_hit": len(sell_signals), "trending": trending}

        return {"signal": "HOLD",
                "reason": f"No confluence (buy={conf_buy:.2f} sell={conf_sell:.2f})",
                "confidence": 0.0, "sl": sl, "tp": tp,
                "indicators_hit": 0, "trending": trending}


def run_signal(df: pd.DataFrame, params: dict) -> dict:
    return SignalEngine(params).generate_signal(df)


def get_available_indicators() -> dict:
    return AVAILABLE_INDICATORS
