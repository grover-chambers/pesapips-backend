from typing import Optional


class RiskManager:
    """
    Calculates lot size based on account balance and risk settings.
    Enforces max drawdown and max open trades limits.
    """

    def __init__(
        self,
        balance: float,
        risk_per_trade: float = 1.0,
        max_drawdown_pct: float = 10.0,
        max_open_trades: int = 3,
        pip_value: float = 1.0,
    ):
        self.balance = balance
        self.risk_per_trade = risk_per_trade        # % of balance per trade
        self.max_drawdown_pct = max_drawdown_pct    # stop trading if DD exceeds this
        self.max_open_trades = max_open_trades
        self.pip_value = pip_value                  # $ per pip per 0.01 lot (XAUUSD = 0.01)

    def calculate_lot_size(self, sl_pips: int) -> float:
        """
        Risk a fixed % of balance per trade.
        lot = (balance * risk_pct) / (sl_pips * pip_value_per_lot)
        Rounded down to nearest 0.01, min 0.01, max 5.0
        """
        if sl_pips <= 0:
            return 0.01

        risk_amount = self.balance * (self.risk_per_trade / 100)
        pip_value_per_lot = self.pip_value * 100    # per full lot
        raw_lot = risk_amount / (sl_pips * pip_value_per_lot)

        lot = round(max(0.01, min(5.0, raw_lot)), 2)
        return lot

    def can_open_trade(self, open_trades_count: int, current_drawdown_pct: float) -> tuple[bool, str]:
        """
        Returns (allowed: bool, reason: str)
        """
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
        pip_size: float = 0.1,   # XAUUSD pip = 0.1
    ) -> tuple[float, float]:
        """
        Returns (stop_loss, take_profit) price levels.
        """
        sl_distance = sl_pips * pip_size
        tp_distance = tp_pips * pip_size

        if signal == "BUY":
            sl = round(entry_price - sl_distance, 2)
            tp = round(entry_price + tp_distance, 2)
        else:  # SELL
            sl = round(entry_price + sl_distance, 2)
            tp = round(entry_price - tp_distance, 2)

        return sl, tp
