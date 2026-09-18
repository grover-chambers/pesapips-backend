"""
Instrument metadata: pip sizes and price precision per MT5 symbol.

Why this exists:
    Rounding every price to 2 decimals (gold's convention) silently breaks
    forex precision — a 15-pip stop on EURUSD is 0.0015, which rounds to
    0.00. Every SL/TP/breakeven calculation must use the instrument's real
    pip size and quote precision.

Conventions:
    - `pip`      = the smallest significant price step for the instrument
    - `digits`   = number of decimals used when quoting prices
    - `round_price(symbol, price)` rounds to the instrument's quote precision

Supported groups: commodities (metals/oil), forex (majors/crosses/JPY),
stock indices, and common US stocks. Unknown symbols fall back to a
price-level heuristic so nothing crashes on an unmapped ticker.
"""
from typing import Optional

PIP_SIZES = {
    # ── Commodities ────────────────────────────────────────────────
    "XAUUSD": 0.1, "XAU": 0.1, "GOLD": 0.1,          # gold
    "XAGUSD": 0.01, "XAG": 0.01, "SILVER": 0.01,     # silver
    "WTI": 0.01, "USOIL": 0.01, "OIL": 0.01,         # crude oil
    "BRENT": 0.01, "UKOIL": 0.01,                    # brent
    "NATGAS": 0.001, "NG": 0.001,                    # natural gas
    "COPPER": 0.0001,                                # copper
    # ── Forex — USD-quoted (pip = 0.0001) ──────────────────────────
    "EURUSD": 0.0001, "GBPUSD": 0.0001, "AUDUSD": 0.0001,
    "NZDUSD": 0.0001, "USDCAD": 0.0001, "USDCHF": 0.0001,
    # ── Forex — JPY-quoted (pip = 0.01) ────────────────────────────
    "USDJPY": 0.01, "EURJPY": 0.01, "GBPJPY": 0.01,
    "AUDJPY": 0.01, "NZDJPY": 0.01, "CADJPY": 0.01, "CHFJPY": 0.01,
    # ── Forex — crosses ────────────────────────────────────────────
    "EURGBP": 0.0001, "EURCHF": 0.0001, "EURNZD": 0.0001,
    "EURCAD": 0.0001, "EURAUD": 0.0001, "GBPCHF": 0.0001,
    "GBPCAD": 0.0001, "GBPAUD": 0.0001, "GBPNZD": 0.0001,
    "AUDCAD": 0.0001, "AUDCHF": 0.0001, "AUDNZD": 0.0001,
    "CADCHF": 0.0001, "CADJPY": 0.01,  "NZDCHF": 0.0001,
    "NZDCAD": 0.0001, "CHFJPY": 0.01,
    # ── Indices (pip = 1 point for DJI/NAS100, 0.1 for others) ─────
    "US30": 1.0, "DJ30": 1.0, "WALLST30": 1.0,
    "NAS100": 1.0, "NDX100": 1.0, "USTEC": 1.0,
    "SPX500": 0.1, "US500": 0.1, "SP500": 0.1,
    "GER40": 1.0, "DAX40": 1.0, "UK100": 1.0, "FRA40": 1.0,
    "EU50": 1.0, "JPN225": 1.0, "NIKKEI": 1.0, "AUS200": 0.1,
    # ── Crypto (exact pip depends on broker; 1.0 / 0.1 covers BTC/ETH) ──
    "BTCUSD": 1.0, "ETHUSD": 0.1, "XRPUSD": 0.0001,
}

# Common US stocks quoted to cents. Falls outside PIP_SIZES → heuristic.
_STOCK_SUFFIXES = ("USD",)  # placeholder for future stock-list support

_DEFAULT_PIP = 0.0001
_DEFAULT_DIGITS = 5


def get_pip_size(symbol: str, price: Optional[float] = None) -> float:
    """Return the pip size for a symbol (price step per pip).

    Unmapped symbols fall back to a price-level heuristic when a price is
    available (e.g. stocks at $170 → 0.01), otherwise a forex default.
    """
    if not symbol:
        return _DEFAULT_PIP
    sym = symbol.upper().strip()
    if sym in PIP_SIZES:
        return PIP_SIZES[sym]
    if price:
        return infer_pip_size_from_price(price)
    return _DEFAULT_PIP


def get_digits(symbol: str, price: Optional[float] = None) -> int:
    """Number of decimals used when quoting prices for this symbol.

    pip 1.0    → digits 2  (indices: quoting to cents is harmless and finer)
    pip 0.1    → digits 2  (gold)
    pip 0.01   → digits 3  (silver, JPY pairs)
    pip 0.001  → digits 4  (natural gas)
    pip 0.0001 → digits 5  (forex majors/crosses)
    """
    pip = get_pip_size(symbol, price)
    if pip >= 1.0:
        return 2
    from math import log10
    exp = round(abs(log10(pip)))
    return max(2, exp + 1)


def round_price(symbol: str, price: float) -> float:
    """Round a price to the instrument's quote precision (never to 2 dp)."""
    return round(float(price), get_digits(symbol, price))


def infer_pip_size_from_price(price: float) -> float:
    """Heuristic for unmapped symbols, keyed off absolute price level."""
    p = abs(float(price))
    if p == 0:
        return _DEFAULT_PIP
    if p < 10:
        return 0.0001       # forex majors
    if p < 100:
        return 0.01         # silver / JPY-quoted
    if p < 1000:
        return 0.01         # stocks, gas, some indices
    return 0.1              # gold, high-priced indices
