import pandas as pd
from app.services.signal_engine import SignalEngine
from app.services.risk_manager import RiskManager


def run_backtest(df: pd.DataFrame, params: dict) -> dict:
    """
    Efficient backtester — calculates indicators once, then iterates candles.
    Uses ATR-based SL/TP from the signal engine result.
    """
    engine = SignalEngine(params)

    # Calculate all indicators once upfront
    df_ind = engine.calculate_indicators(df).dropna().copy()
    if df_ind.empty or len(df_ind) < 10:
        return _empty_result()

    balance         = 10000.0
    initial_balance = balance
    risk_per_trade  = float(params.get("risk_per_trade", 1.0))
    pip_size        = 0.1  # XAUUSD

    cooldown_candles = 3
    cooldown_left    = 0
    trades           = []
    open_trade       = None
    rows             = df_ind.reset_index(drop=False)

    for i in range(3, len(rows)):
        candle = rows.iloc[i]
        price  = float(candle["close"])
        high   = float(candle["high"])
        low    = float(candle["low"])

        # Manage open trade using high/low for realistic SL/TP fills
        if open_trade:
            t = open_trade
            if t["type"] == "BUY":
                hit_tp = high >= t["tp"]
                hit_sl = low  <= t["sl"]
            else:
                hit_tp = low  <= t["tp"]
                hit_sl = high >= t["sl"]

            if hit_tp or hit_sl:
                exit_price = t["tp"] if hit_tp else t["sl"]
                pnl = t["lot"] * (
                    (exit_price - t["entry"]) if t["type"] == "BUY"
                    else (t["entry"] - exit_price)
                ) * 100
                balance += pnl
                trades.append({
                    "type":   t["type"],
                    "entry":  t["entry"],
                    "exit":   exit_price,
                    "pnl":    round(pnl, 2),
                    "result": "win" if pnl > 0 else "loss",
                })
                open_trade    = None
                cooldown_left = cooldown_candles
            continue

        if cooldown_left > 0:
            cooldown_left -= 1
            continue

        # Signal on pre-calculated indicator slice
        window = df_ind.iloc[:i + 1]
        result = engine.generate_signal(window)
        signal = result.get("signal", "HOLD")

        if signal not in ("BUY", "SELL"):
            continue

        atr_sl = float(result.get("sl", 0))
        atr_tp = float(result.get("tp", 0))

        if atr_sl <= 0:
            atr_sl = float(params.get("sl_pips", 15)) * pip_size
            atr_tp = float(params.get("tp_pips", 30)) * pip_size

        atr_sl = max(atr_sl, price * 0.0005)
        atr_tp = max(atr_tp, atr_sl * 1.5)

        rm  = RiskManager(balance=balance, risk_per_trade=risk_per_trade)
        lot = rm.calculate_lot_size(sl_pips=atr_sl / pip_size)

        open_trade = {
            "type":  signal,
            "entry": price,
            "lot":   lot,
            "sl":    price - atr_sl if signal == "BUY" else price + atr_sl,
            "tp":    price + atr_tp if signal == "BUY" else price - atr_tp,
        }

    # Close any open trade at last candle
    if open_trade:
        last_price = float(rows.iloc[-1]["close"])
        pnl = open_trade["lot"] * (
            (last_price - open_trade["entry"]) if open_trade["type"] == "BUY"
            else (open_trade["entry"] - last_price)
        ) * 100
        balance += pnl
        trades.append({
            "type":   open_trade["type"],
            "entry":  open_trade["entry"],
            "exit":   last_price,
            "pnl":    round(pnl, 2),
            "result": "win" if pnl > 0 else "loss",
        })

    return _compute_stats(trades, initial_balance, balance)


def _compute_stats(trades, initial_balance, balance):
    total  = len(trades)
    wins   = [t for t in trades if t["result"] == "win"]
    losses = [t for t in trades if t["result"] == "loss"]

    total_pnl     = sum(t["pnl"] for t in trades)
    winrate       = round(len(wins) / total * 100, 2) if total > 0 else 0.0
    gross_profit  = sum(t["pnl"] for t in wins)            if wins   else 0.0
    gross_loss    = abs(sum(t["pnl"] for t in losses))     if losses else 1.0
    profit_factor = round(gross_profit / gross_loss, 2)    if gross_loss > 0 else 0.0

    running = initial_balance
    peak    = initial_balance
    max_dd  = 0.0
    for t in trades:
        running += t["pnl"]
        peak    = max(peak, running)
        dd      = (peak - running) / peak * 100
        max_dd  = max(max_dd, dd)

    return {
        "asset":            "XAUUSD",
        "total_trades":     total,
        "winning_trades":   len(wins),
        "losing_trades":    len(losses),
        "winrate_pct":      winrate,
        "total_pnl":        round(total_pnl, 2),
        "profit_factor":    profit_factor,
        "max_drawdown_pct": round(max_dd, 2),
        "final_balance":    round(balance, 2),
        "return_pct":       round((balance - initial_balance) / initial_balance * 100, 2),
    }


def _empty_result():
    return {
        "asset": "XAUUSD",
        "total_trades": 0, "winning_trades": 0, "losing_trades": 0,
        "winrate_pct": 0.0, "total_pnl": 0, "profit_factor": 0.0,
        "max_drawdown_pct": 0.0, "final_balance": 10000.0, "return_pct": 0.0,
    }
