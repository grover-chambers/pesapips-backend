import pandas as pd
from app.services.signal_engine import SignalEngine
from app.services.risk_manager import RiskManager


SPREAD_PIPS = {
    "XAUUSD": 30,
    "XAGUSD": 3,
    "EURUSD": 1.5,
    "GBPUSD": 2,
    "USDJPY": 1.5,
    "DEFAULT": 2,
}

COMMISSION_PER_LOT = 7.0
SLIPPAGE_PIPS = 2


def run_backtest(df: pd.DataFrame, params: dict) -> dict:
    """
    Realistic backtester with spread, slippage, and commission.
    Calculates indicators once, then iterates candles.
    """
    engine = SignalEngine(params)

    df_ind = engine.calculate_indicators(df).dropna().copy()
    if df_ind.empty or len(df_ind) < 10:
        return _empty_result()

    balance = 10000.0
    initial_balance = balance
    risk_per_trade = float(params.get("risk_per_trade", 1.0))
    pip_size = float(params.get("pip_size", 0.1))

    symbol = params.get("symbol", "XAUUSD")
    spread_pips = SPREAD_PIPS.get(symbol, SPREAD_PIPS["DEFAULT"])
    spread_cost = spread_pips * pip_size

    cooldown_candles = 3
    cooldown_left = 0
    trades = []
    open_trade = None
    rows = df_ind.reset_index(drop=False)

    for i in range(3, len(rows)):
        candle = rows.iloc[i]
        price = float(candle["close"])
        high = float(candle["high"])
        low = float(candle["low"])

        if open_trade:
            t = open_trade

            if t["type"] == "BUY":
                hit_tp = high >= t["tp"]
                hit_sl = low <= t["sl"]
                slippage_on_exit = SLIPPAGE_PIPS * pip_size if hit_sl else 0
            else:
                hit_tp = low <= t["tp"]
                hit_sl = high >= t["sl"]
                slippage_on_exit = SLIPPAGE_PIPS * pip_size if hit_sl else 0

            if hit_tp or hit_sl:
                exit_price = t["tp"] if hit_tp else t["sl"]
                if hit_sl:
                    if t["type"] == "BUY":
                        exit_price = round(exit_price - slippage_on_exit, 2)
                    else:
                        exit_price = round(exit_price + slippage_on_exit, 2)

                if t["type"] == "BUY":
                    raw_pnl_points = exit_price - t["entry"]
                else:
                    raw_pnl_points = t["entry"] - exit_price

                total_cost_points = spread_cost + (SLIPPAGE_PIPS * pip_size)
                net_pnl_points = raw_pnl_points - total_cost_points

                pnl = t["lot"] * net_pnl_points * 100
                commission = t["lot"] * COMMISSION_PER_LOT * 2
                pnl -= commission

                balance += pnl
                trades.append({
                    "type": t["type"],
                    "entry": t["entry"],
                    "exit": exit_price,
                    "pnl": round(pnl, 2),
                    "commission": round(commission, 2),
                    "spread_cost": round(total_cost_points * t["lot"] * 100, 2),
                    "slippage": round(slippage_on_exit * t["lot"] * 100, 2) if slippage_on_exit else 0,
                    "result": "win" if pnl > 0 else "loss",
                })
                open_trade = None
                cooldown_left = cooldown_candles
                continue

        if cooldown_left > 0:
            cooldown_left -= 1
            continue

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

        entry_price = price
        if signal == "BUY":
            entry_price = round(price + spread_cost / 2, 2)
        else:
            entry_price = round(price - spread_cost / 2, 2)

        rm = RiskManager(balance=balance, risk_per_trade=risk_per_trade)
        lot = rm.calculate_lot_size(sl_pips=atr_sl / pip_size)

        sl = entry_price - atr_sl if signal == "BUY" else entry_price + atr_sl
        tp = entry_price + atr_tp if signal == "BUY" else entry_price - atr_tp

        open_trade = {
            "type": signal,
            "entry": entry_price,
            "lot": lot,
            "sl": sl,
            "tp": tp,
        }

    if open_trade:
        last_price = float(rows.iloc[-1]["close"])
        if open_trade["type"] == "BUY":
            raw_pnl_points = last_price - open_trade["entry"]
        else:
            raw_pnl_points = open_trade["entry"] - last_price

        total_cost_points = spread_cost + (SLIPPAGE_PIPS * pip_size)
        net_pnl_points = raw_pnl_points - total_cost_points
        pnl = open_trade["lot"] * net_pnl_points * 100
        commission = open_trade["lot"] * COMMISSION_PER_LOT * 2
        pnl -= commission
        balance += pnl
        trades.append({
            "type": open_trade["type"],
            "entry": open_trade["entry"],
            "exit": last_price,
            "pnl": round(pnl, 2),
            "commission": round(commission, 2),
            "spread_cost": round(total_cost_points * open_trade["lot"] * 100, 2),
            "result": "win" if pnl > 0 else "loss",
        })

    return _compute_stats(trades, initial_balance, balance)


def _compute_stats(trades, initial_balance, balance):
    total = len(trades)
    wins = [t for t in trades if t["result"] == "win"]
    losses = [t for t in trades if t["result"] == "loss"]

    total_pnl = sum(t["pnl"] for t in trades)
    winrate = round(len(wins) / total * 100, 2) if total > 0 else 0.0
    gross_profit = sum(t["pnl"] for t in wins) if wins else 0.0
    gross_loss = abs(sum(t["pnl"] for t in losses)) if losses else 1.0
    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else 0.0

    total_commission = sum(t.get("commission", 0) for t in trades)
    total_spread = sum(t.get("spread_cost", 0) for t in trades)
    total_slippage = sum(t.get("slippage", 0) for t in trades)

    running = initial_balance
    peak = initial_balance
    max_dd = 0.0
    for t in trades:
        running += t["pnl"]
        peak = max(peak, running)
        dd = (peak - running) / peak * 100
        max_dd = max(max_dd, dd)

    avg_win = round(sum(t["pnl"] for t in wins) / len(wins), 2) if wins else 0
    avg_loss = round(sum(t["pnl"] for t in losses) / len(losses), 2) if losses else 0
    rr_ratio = round(abs(avg_win / avg_loss), 2) if avg_loss != 0 else 0

    return {
        "asset": "XAUUSD",
        "total_trades": total,
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "winrate_pct": winrate,
        "total_pnl": round(total_pnl, 2),
        "profit_factor": profit_factor,
        "max_drawdown_pct": round(max_dd, 2),
        "final_balance": round(balance, 2),
        "return_pct": round((balance - initial_balance) / initial_balance * 100, 2),
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "risk_reward_ratio": rr_ratio,
        "costs": {
            "total_commission": round(total_commission, 2),
            "total_spread": round(total_spread, 2),
            "total_slippage": round(total_slippage, 2),
        },
        "realistic": True,
    }


def _empty_result():
    return {
        "asset": "XAUUSD",
        "total_trades": 0, "winning_trades": 0, "losing_trades": 0,
        "winrate_pct": 0.0, "total_pnl": 0, "profit_factor": 0.0,
        "max_drawdown_pct": 0.0, "final_balance": 10000.0, "return_pct": 0.0,
        "avg_win": 0, "avg_loss": 0, "risk_reward_ratio": 0,
        "costs": {"total_commission": 0, "total_spread": 0, "total_slippage": 0},
        "realistic": True,
    }
