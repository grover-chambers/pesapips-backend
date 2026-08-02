"""
Prop-firm evaluation engine.

The rule book is enforced in CODE. The TradingAgents LLM proposes a trade;
this engine decides whether it may be placed, based on the firm's limits.

Design rules (from passing FTMO/FundedNext-style evals):
  * Max daily loss  → stop trading for the day (hard gate, not a suggestion)
  * Max total drawdown → evaluation is failed (breach)
  * Profit target reached AND min trading days met → evaluation passed
  * Risk per trade, max open trades, max consecutive losses → position gates
  * Equity is used for limits (prop firms evaluate on equity, not balance)

All math here is deterministic and unit-tested; no LLM is involved.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

from app.core.instruments import get_pip_size, round_price

# ── Provider presets (defaults when a user picks a firm) ────────────
# Standard 100K plans. Phase 2 targets differ from phase 1 — the engine
# reports the phase; users adjust the target in Settings when they advance.
PROVIDER_PRESETS: Dict[str, Dict] = {
    "ftmo": {
        "account_size": 100000.0,
        "profit_target_pct": 10.0,       # phase 1; phase 2 is 5%
        "max_daily_loss_pct": 2.0,
        "max_total_drawdown_pct": 5.0,
        "min_trading_days": 5,
        "risk_per_trade_pct": 0.5,
        "max_open_trades": 2,
        "max_consecutive_losses": 3,
        "instruments": ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100", "SPX500"],
    },
    "fundednext": {
        "account_size": 100000.0,
        "profit_target_pct": 10.0,       # phase 1; phase 2 is 5%
        "max_daily_loss_pct": 3.0,
        "max_total_drawdown_pct": 6.0,
        "min_trading_days": 5,
        "risk_per_trade_pct": 0.5,
        "max_open_trades": 2,
        "max_consecutive_losses": 3,
        "instruments": ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100", "SPX500"],
    },
}

# Defaults for "custom" providers
CUSTOM_PRESET: Dict = PROVIDER_PRESETS["ftmo"]


# ── Domain objects ───────────────────────────────────────────────────
@dataclass
class AccountState:
    """Live account state, refreshed from MT5 before every decision."""
    balance: float = 0.0
    equity: float = 0.0
    peak_balance: float = 0.0            # high-water mark (equity)
    day_start_balance: float = 0.0       # snapshot at start of trading day
    open_trades: int = 0
    trading_days_logged: int = 0
    consecutive_losses: int = 0
    last_error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "balance": self.balance,
            "equity": self.equity,
            "peak_balance": self.peak_balance,
            "day_start_balance": self.day_start_balance,
            "open_trades": self.open_trades,
            "trading_days_logged": self.trading_days_logged,
            "consecutive_losses": self.consecutive_losses,
            "last_error": self.last_error,
        }


@dataclass
class RuleBook:
    """Parsed, validated rule book from PropEvalSettings."""
    provider: str = "ftmo"
    phase: int = 1
    account_size: float = 100000.0
    profit_target_pct: float = 10.0
    max_daily_loss_pct: float = 2.0
    max_total_drawdown_pct: float = 5.0
    min_trading_days: int = 5
    risk_per_trade_pct: float = 0.5
    max_open_trades: int = 2
    max_consecutive_losses: int = 3
    instruments: List[str] = field(default_factory=lambda: list(PROVIDER_PRESETS["ftmo"]["instruments"]))
    auto_execute: bool = False
    stop_on_daily_loss: bool = True
    news_guard_enabled: bool = True
    hold_over_weekend: bool = False

    @property
    def target_balance(self) -> float:
        return self.account_size * (1 + self.profit_target_pct / 100.0)

    def daily_loss_limit(self, day_start_balance: float) -> float:
        """Absolute equity floor for today (breach = stop trading for the day)."""
        return day_start_balance * (1 - self.max_daily_loss_pct / 100.0)

    def drawdown_floor(self, peak_balance: float) -> float:
        """Absolute equity floor from peak (breach = evaluation failed)."""
        return peak_balance * (1 - self.max_total_drawdown_pct / 100.0)


def rulebook_from_settings(settings: Dict) -> RuleBook:
    """Build a RuleBook from a PropEvalSettings dict (settings.to_dict()).

    Preset values act as defaults: keys missing from the settings dict fall
    back to the provider's preset (e.g. ``{"provider": "fundednext"}`` gets
    FundedNext's 3%/6% limits), and values explicitly saved always win.
    """
    provider = settings.get("provider") or "ftmo"
    preset = PROVIDER_PRESETS.get(provider, PROVIDER_PRESETS["ftmo"])
    merged = {**preset, **settings}
    merged["provider"] = provider
    return RuleBook(
        provider=provider,
        phase=int(merged.get("phase") or 1),
        account_size=float(merged.get("account_size") or 100000.0),
        profit_target_pct=float(merged.get("profit_target_pct") or 10.0),
        max_daily_loss_pct=float(merged.get("max_daily_loss_pct") or preset["max_daily_loss_pct"]),
        max_total_drawdown_pct=float(merged.get("max_total_drawdown_pct") or preset["max_total_drawdown_pct"]),
        min_trading_days=int(merged.get("min_trading_days") or preset["min_trading_days"]),
        risk_per_trade_pct=float(merged.get("risk_per_trade_pct") or preset["risk_per_trade_pct"]),
        max_open_trades=int(merged.get("max_open_trades") or preset["max_open_trades"]),
        max_consecutive_losses=int(merged.get("max_consecutive_losses") or preset["max_consecutive_losses"]),
        instruments=merged.get("instruments") or list(preset["instruments"]),
        auto_execute=bool(merged.get("auto_execute", False)),
        stop_on_daily_loss=bool(merged.get("stop_on_daily_loss", True)),
        news_guard_enabled=bool(merged.get("news_guard_enabled", True)),
        hold_over_weekend=bool(merged.get("hold_over_weekend", False)),
    )


# ── Verdicts ─────────────────────────────────────────────────────────
@dataclass
class EvalVerdict:
    status: str          # running | blocked | passed | failed
    reason: str          # human-readable explanation
    daily_loss_pct: float = 0.0
    drawdown_pct: float = 0.0
    profit_pct: float = 0.0
    can_open_new_trades: bool = False

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "reason": self.reason,
            "daily_loss_pct": round(self.daily_loss_pct, 2),
            "drawdown_pct": round(self.drawdown_pct, 2),
            "profit_pct": round(self.profit_pct, 2),
            "can_open_new_trades": self.can_open_new_trades,
        }


def evaluate(book: RuleBook, acct: AccountState) -> EvalVerdict:
    """Evaluate the account against the rule book. Deterministic."""
    if acct.peak_balance <= 0:
        acct.peak_balance = acct.balance or acct.account_size or book.account_size
    if acct.day_start_balance <= 0:
        acct.day_start_balance = acct.balance or acct.account_size or book.account_size

    ref_equity = max(acct.balance, acct.equity)
    peak = max(acct.peak_balance, ref_equity, book.account_size)

    drawdown_pct = (peak - ref_equity) / peak * 100.0 if peak > 0 else 0.0
    profit_pct = (ref_equity - book.account_size) / book.account_size * 100.0
    daily_loss_pct = (acct.day_start_balance - ref_equity) / acct.day_start_balance * 100.0 \
        if acct.day_start_balance > 0 else 0.0

    # 1. Hard failure: max drawdown breached
    if ref_equity <= book.drawdown_floor(peak):
        return EvalVerdict(
            status="failed", reason="Max total drawdown breached",
            daily_loss_pct=daily_loss_pct, drawdown_pct=drawdown_pct, profit_pct=profit_pct,
            can_open_new_trades=False,
        )

    # 2. Passed: target reached AND min trading days met
    if profit_pct >= book.profit_target_pct and acct.trading_days_logged >= book.min_trading_days:
        return EvalVerdict(
            status="passed",
            reason=f"Profit target {book.profit_target_pct:.1f}% met over {acct.trading_days_logged} days",
            daily_loss_pct=daily_loss_pct, drawdown_pct=drawdown_pct, profit_pct=profit_pct,
            can_open_new_trades=False,
        )

    # 3. Daily stop: daily loss limit reached → no new trades today
    if ref_equity <= book.daily_loss_limit(acct.day_start_balance):
        return EvalVerdict(
            status="blocked",
            reason=f"Daily loss limit ({book.max_daily_loss_pct:.1f}%) reached — trading halted for today",
            daily_loss_pct=daily_loss_pct, drawdown_pct=drawdown_pct, profit_pct=profit_pct,
            can_open_new_trades=False,
        )

    # 4. Running normally — new trades allowed subject to position gates
    return EvalVerdict(
        status="running", reason="Within limits",
        daily_loss_pct=daily_loss_pct, drawdown_pct=drawdown_pct, profit_pct=profit_pct,
        can_open_new_trades=True,
    )


# ── Position gates (called before placing ANY order) ────────────────
def check_position_gate(book: RuleBook, acct: AccountState, symbol: str) -> Tuple[bool, str]:
    """May we open a new trade on `symbol`? Deterministic, no LLM."""
    if acct.open_trades >= book.max_open_trades:
        return False, f"Max open trades reached ({book.max_open_trades})"
    if book.instruments and symbol.upper() not in [s.upper() for s in book.instruments]:
        return False, f"{symbol} not in the rule-book instrument universe"
    if acct.consecutive_losses >= book.max_consecutive_losses:
        return False, f"Max consecutive losses reached ({book.max_consecutive_losses}) — cooldown"
    return True, "OK"


def calculate_lot_size(
    book: RuleBook,
    acct: AccountState,
    symbol: str,
    sl_distance: float,          # absolute price distance to stop-loss
    price: float,
) -> float:
    """
    Risk-based position sizing.

    risk_amount = equity * risk_per_trade_pct%
    loss_if_stopped = lot * contract_value_per_price_unit * sl_distance
    For FX 1 lot ≈ 100,000 units; for gold 1 lot ≈ 100 oz.
    We approximate contract units by pip conventions: 1 standard lot moves
    $10 per 0.1 gold pip and $10 per 0.0001 fx pip — i.e. $10 per pip
    for pip sizes in the PIP_SIZES table.
    """
    pip = get_pip_size(symbol, price)
    if sl_distance <= 0 or pip <= 0:
        return 0.01
    risk_amount = (acct.equity or acct.balance) * (book.risk_per_trade_pct / 100.0)
    sl_pips = sl_distance / pip
    # $10 per pip per standard lot (matches the platform's existing model)
    loss_if_stopped_per_lot = sl_pips * 10.0
    if loss_if_stopped_per_lot <= 0:
        return 0.01
    raw = risk_amount / loss_if_stopped_per_lot
    return round(min(2.0, max(0.01, raw)), 2)


def validate_settings(data: Dict) -> Tuple[bool, List[str]]:
    """Sanity-check rule-book values. Returns (ok, errors)."""
    errors: List[str] = []
    if not data.get("provider") in ("ftmo", "fundednext", "custom"):
        errors.append("provider must be ftmo, fundednext, or custom")
    if float(data.get("account_size") or 0) <= 0:
        errors.append("account_size must be positive")
    if not (0 < float(data.get("profit_target_pct") or 0) <= 100):
        errors.append("profit_target_pct must be between 0 and 100")
    if not (0 < float(data.get("max_daily_loss_pct") or 0) <= 100):
        errors.append("max_daily_loss_pct must be between 0 and 100")
    if not (0 < float(data.get("max_total_drawdown_pct") or 0) <= 100):
        errors.append("max_total_drawdown_pct must be between 0 and 100")
    if int(data.get("min_trading_days") or 0) < 1:
        errors.append("min_trading_days must be at least 1")
    if not (0 < float(data.get("risk_per_trade_pct") or 0) <= 10):
        errors.append("risk_per_trade_pct must be between 0 and 10")
    return (len(errors) == 0, errors)
