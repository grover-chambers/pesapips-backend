"""
TradeContext — PesaPips Unified Brain
Single shared context object that flows through all core systems.
Signal Engine → Market Intel → Risk Manager → Autorun → Journal
"""
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any
from datetime import datetime, timezone


@dataclass
class TradeContext:
    # Identity
    symbol:              str   = "XAUUSD"
    timeframe:           str   = "H1"
    timestamp:           str   = ""

    # Market state
    price:               float = 0.0
    market_open:         bool  = True

    # Regime
    regime:              str   = "UNKNOWN"
    regime_confidence:   int   = 0
    regime_color:        str   = "#9aa0b0"
    regime_advice:       str   = ""

    # Volatility
    atr:                 float = 0.0
    atr_vs_avg:          float = 1.0
    vol_state:           str   = "normal"   # normal|expanding|contracting|spiking
    adx:                 float = 0.0

    # Signal
    signal:              str   = "HOLD"
    signal_confidence:   float = 0.0
    signal_reason:       str   = ""
    sl_price:            float = 0.0
    tp_price:            float = 0.0

    # Strategy
    strategy_id:         int   = 0
    strategy_name:       str   = ""
    strategy_fit:        str   = "Unknown"  # Ideal|Fair|Poor|Avoid
    strategy_fit_score:  int   = 0

    # Risk — computed by Risk Manager from context
    base_lot:            float = 0.01
    adjusted_lot:        float = 0.01
    risk_pct:            float = 1.0
    lot_adjustment_reason: str = ""

    # Autorun decision
    autorun_should_trade: bool  = False
    autorun_skip_reason:  str   = ""

    # Journal
    journal_auto_log:    bool  = True
    trade_id:            Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @staticmethod
    def now_ts() -> str:
        return datetime.now(timezone.utc).isoformat()


def build_context(
    symbol: str,
    timeframe: str,
    strategy_id: int,
    strategy_name: str,
    price: float,
    market_open: bool = True,
) -> TradeContext:
    """Build a fresh TradeContext for a trading decision cycle."""
    ctx = TradeContext(
        symbol=symbol,
        timeframe=timeframe,
        strategy_id=strategy_id,
        strategy_name=strategy_name,
        price=price,
        market_open=market_open,
        timestamp=TradeContext.now_ts(),
    )
    return ctx


def enrich_with_regime(ctx: TradeContext, regime_data: dict) -> TradeContext:
    """Inject regime detector output into context."""
    if not regime_data or "error" in regime_data:
        return ctx

    ctx.regime            = regime_data.get("regime", "UNKNOWN")
    ctx.regime_confidence = regime_data.get("confidence", 0)
    ctx.regime_color      = regime_data.get("regime_color", "#9aa0b0")
    ctx.regime_advice     = regime_data.get("regime_advice", "")

    indicators = regime_data.get("indicators", {})
    ctx.atr               = indicators.get("atr", 0.0)
    ctx.atr_vs_avg        = indicators.get("atr_vs_avg", 1.0)
    ctx.adx               = indicators.get("adx", 0.0)

    structure = regime_data.get("structure", {})
    vol_state = structure.get("vol_state", "normal")
    ctx.vol_state = vol_state

    # Score strategy fit for this regime
    from app.services.market_regime import STRATEGY_REGIME_FIT, FIT_LABELS
    fit_score = STRATEGY_REGIME_FIT.get(ctx.strategy_id, {}).get(ctx.regime, 1)
    ctx.strategy_fit_score = fit_score
    ctx.strategy_fit = FIT_LABELS.get(fit_score, "Unknown")

    return ctx


def enrich_with_signal(ctx: TradeContext, signal_data: dict) -> TradeContext:
    """Inject signal engine output into context."""
    if not signal_data or "error" in signal_data:
        return ctx

    ctx.signal            = signal_data.get("signal", "HOLD")
    ctx.signal_confidence = signal_data.get("confidence", 0.0)
    ctx.signal_reason     = signal_data.get("reason", "")
    ctx.sl_price          = signal_data.get("sl", 0.0)
    ctx.tp_price          = signal_data.get("tp", 0.0)

    return ctx


def apply_risk_adjustment(ctx: TradeContext, account_balance: float, base_risk_pct: float) -> TradeContext:
    """
    Volatility-adjusted position sizing.
    Reduces lot size when:
    - ATR is spiking (> 1.8x average)
    - Regime is VOLATILE
    - Strategy fit is Poor or Avoid
    - Regime confidence is low
    """
    ctx.risk_pct  = base_risk_pct
    adjustment    = 1.0
    reasons       = []

    # Volatility spike — reduce size
    if ctx.atr_vs_avg > 1.8 or ctx.vol_state == "spiking":
        adjustment *= 0.5
        reasons.append(f"ATR spike ({ctx.atr_vs_avg:.1f}x avg) — size halved")
    elif ctx.atr_vs_avg > 1.3 or ctx.vol_state == "expanding":
        adjustment *= 0.75
        reasons.append(f"ATR expanding ({ctx.atr_vs_avg:.1f}x avg) — size reduced 25%")

    # Volatile regime — reduce size
    if ctx.regime == "VOLATILE":
        adjustment *= 0.6
        reasons.append("VOLATILE regime — size reduced 40%")

    # Poor strategy fit — reduce size
    if ctx.strategy_fit_score == 1:
        adjustment *= 0.7
        reasons.append("Poor strategy fit — size reduced 30%")
    elif ctx.strategy_fit_score == 0:
        adjustment *= 0.0  # Don't trade at all
        reasons.append("Strategy fit = Avoid — no trade")

    # Strong trend + ideal fit — allow full size
    if ctx.strategy_fit_score == 3 and ctx.adx > 30 and ctx.regime in ("TRENDING_UP", "TRENDING_DOWN"):
        adjustment = min(1.2, adjustment * 1.2)
        reasons.append(f"Strong trend + Ideal fit — size +20%")

    # Calculate lot size
    # Base: risk_pct of balance / (SL in pips * pip value)
    # Simplified: use 0.01 lot per $200 balance at 1% risk
    base_lot = max(0.01, round((account_balance * base_risk_pct / 100) / 200, 2))
    adjusted_lot = max(0.01, round(base_lot * adjustment, 2))

    ctx.base_lot              = base_lot
    ctx.adjusted_lot          = adjusted_lot
    ctx.lot_adjustment_reason = " | ".join(reasons) if reasons else "Standard sizing"

    return ctx


def should_autorun_trade(ctx: TradeContext) -> TradeContext:
    """
    Unified gate: should the autorun engine place a trade right now?
    All conditions must pass.
    """
    # 1. Market must be open
    if not ctx.market_open:
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = "Market closed"
        return ctx

    # 2. Must have a directional signal
    if ctx.signal not in ("BUY", "SELL"):
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = f"Signal is {ctx.signal} — no entry"
        return ctx

    # 3. Minimum confidence threshold
    if ctx.signal_confidence < 0.40:
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = f"Confidence too low ({ctx.signal_confidence:.0%} < 40%)"
        return ctx

    # 4. Don't trade if regime is VOLATILE and confidence is low
    if ctx.regime == "VOLATILE" and ctx.regime_confidence < 50:
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = "VOLATILE regime with low confidence — paused"
        return ctx

    # 5. Don't trade if strategy fit is Avoid
    if ctx.strategy_fit_score == 0:
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = f"Strategy unfit for {ctx.regime} regime (Avoid)"
        return ctx

    # 6. Don't trade with zero lot size
    if ctx.adjusted_lot <= 0:
        ctx.autorun_should_trade = False
        ctx.autorun_skip_reason  = "Lot size = 0 after risk adjustment"
        return ctx

    # All checks passed
    ctx.autorun_should_trade = True
    ctx.autorun_skip_reason  = ""
    return ctx
