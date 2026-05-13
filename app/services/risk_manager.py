from typing import Optional, Tuple
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field


@dataclass
class CircuitBreakerState:
    daily_loss_pct: float = 0.0
    max_daily_loss_pct: float = 6.0
    max_drawdown_pct: float = 10.0
    consecutive_losses: int = 0
    max_consecutive_losses: int = 3
    trades_today: int = 0
    last_trade_time: Optional[datetime] = None
    last_reset_date: str = ""
    starting_balance: float = 0.0
    peak_balance: float = 0.0
    current_balance: float = 0.0
    pause_until: Optional[datetime] = None
    pause_reason: str = ""
    trade_history: list = field(default_factory=list)

    def reset_daily(self):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if today != self.last_reset_date:
            self.trades_today = 0
            self.daily_loss_pct = 0.0
            self.last_reset_date = today

    def update_balance(self, balance: float):
        if self.starting_balance == 0:
            self.starting_balance = balance
        self.current_balance = balance
        self.peak_balance = max(self.peak_balance, balance)
        self.reset_daily()

    def record_trade_result(self, profit: float):
        self.trades_today += 1
        self.last_trade_time = datetime.now(timezone.utc)
        self.trade_history.append({
            "profit": profit,
            "time": datetime.now(timezone.utc).isoformat(),
        })
        self.trade_history = self.trade_history[-50:]

        if self.starting_balance > 0:
            self.daily_loss_pct += (profit / self.starting_balance * 100) if profit < 0 else 0

        if profit < 0:
            self.consecutive_losses += 1
        else:
            self.consecutive_losses = 0

    def is_paused(self) -> Tuple[bool, str]:
        now = datetime.now(timezone.utc)
        if self.pause_until and now < self.pause_until:
            remaining = (self.pause_until - now).total_seconds() / 60
            return True, f"Circuit breaker active: {self.pause_reason} ({remaining:.0f} min remaining)"

        if self.daily_loss_pct <= -self.max_daily_loss_pct:
            return True, f"Daily loss limit reached ({self.daily_loss_pct:.1f}% / -{self.max_daily_loss_pct}%)"

        if self.peak_balance > 0:
            current_dd = (self.peak_balance - self.current_balance) / self.peak_balance * 100
            if current_dd >= self.max_drawdown_pct:
                return True, f"Max drawdown reached ({current_dd:.1f}% / {self.max_drawdown_pct}%)"

        if self.consecutive_losses >= self.max_consecutive_losses:
            return True, f"{self.consecutive_losses} consecutive losses — pausing (max: {self.max_consecutive_losses})"

        return False, ""

    def activate_cooldown(self, minutes: int, reason: str):
        self.pause_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
        self.pause_reason = reason

    def to_dict(self) -> dict:
        is_paused, reason = self.is_paused()
        return {
            "daily_loss_pct": round(self.daily_loss_pct, 2),
            "max_daily_loss_pct": self.max_daily_loss_pct,
            "max_drawdown_pct": self.max_drawdown_pct,
            "consecutive_losses": self.consecutive_losses,
            "trades_today": self.trades_today,
            "peak_balance": self.peak_balance,
            "current_balance": self.current_balance,
            "is_paused": is_paused,
            "pause_reason": reason,
        }


class RiskManager:
    """
    Calculates lot size based on account balance and risk settings.
    Enforces max drawdown, daily loss limit, and consecutive loss circuit breakers.
    """

    def __init__(
        self,
        balance: float,
        risk_per_trade: float = 1.0,
        max_drawdown_pct: float = 10.0,
        max_open_trades: int = 3,
        pip_value: float = 1.0,
        max_daily_loss_pct: float = 6.0,
        max_consecutive_losses: int = 3,
    ):
        self.balance = balance
        self.risk_per_trade = risk_per_trade
        self.max_drawdown_pct = max_drawdown_pct
        self.max_open_trades = max_open_trades
        self.pip_value = pip_value
        self.max_daily_loss_pct = max_daily_loss_pct
        self.max_consecutive_losses = max_consecutive_losses

    def calculate_lot_size(self, sl_pips: int) -> float:
        if sl_pips <= 0:
            return 0.01
        risk_amount = self.balance * (self.risk_per_trade / 100)
        pip_value_per_lot = self.pip_value * 100
        raw_lot = risk_amount / (sl_pips * pip_value_per_lot)
        lot = round(max(0.01, min(5.0, raw_lot)), 2)
        return lot

    def can_open_trade(self, open_trades_count: int, current_drawdown_pct: float) -> Tuple[bool, str]:
        if current_drawdown_pct >= self.max_drawdown_pct:
            return False, f"Max drawdown reached ({current_drawdown_pct:.1f}%)"
        if open_trades_count >= self.max_open_trades:
            return False, f"Max open trades reached ({self.max_open_trades})"
        return True, "OK"

    def calculate_sl_tp(
        self,
        entry_price: float,
        signal: str,
        sl_pips: int,
        tp_pips: int,
        pip_size: float = 0.1,
    ) -> Tuple[float, float]:
        sl_distance = sl_pips * pip_size
        tp_distance = tp_pips * pip_size
        if signal == "BUY":
            sl = round(entry_price - sl_distance, 2)
            tp = round(entry_price + tp_distance, 2)
        else:
            sl = round(entry_price + sl_distance, 2)
            tp = round(entry_price - tp_distance, 2)
        return sl, tp

    def should_trail_stop(
        self,
        signal: str,
        entry_price: float,
        current_price: float,
        current_sl: float,
        atr: float,
    ) -> Tuple[bool, float, str]:
        """
        Trailing stop logic:
        - At 1R profit → move SL to breakeven
        - At 2R profit → trail by 1 ATR
        Returns (should_modify: bool, new_sl: float, reason: str)
        """
        if signal == "BUY":
            risk = entry_price - current_sl
            if risk <= 0:
                return False, current_sl, ""
            profit = current_price - entry_price
            r_multiple = profit / risk

            if r_multiple >= 2.0:
                new_sl = round(current_price - atr, 2)
                if new_sl > current_sl:
                    return True, new_sl, f"Trailing at 2R+ profit (R={r_multiple:.1f}), trail by 1 ATR"
            elif r_multiple >= 1.0:
                breakeven = round(entry_price + 0.1, 2)
                if breakeven > current_sl:
                    return True, breakeven, f"Breakeven at 1R profit (R={r_multiple:.1f})"
        else:
            risk = current_sl - entry_price
            if risk <= 0:
                return False, current_sl, ""
            profit = entry_price - current_price
            r_multiple = profit / risk

            if r_multiple >= 2.0:
                new_sl = round(current_price + atr, 2)
                if new_sl < current_sl:
                    return True, new_sl, f"Trailing at 2R+ profit (R={r_multiple:.1f}), trail by 1 ATR"
            elif r_multiple >= 1.0:
                breakeven = round(entry_price - 0.1, 2)
                if breakeven < current_sl:
                    return True, breakeven, f"Breakeven at 1R profit (R={r_multiple:.1f})"

        return False, current_sl, ""
