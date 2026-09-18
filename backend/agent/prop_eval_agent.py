"""
PesaPips Prop-Eval Agent — local runner that helps pass FTMO / FundedNext
style evaluations and stay funded.

Where the work happens:
    Your machine:
        Ollama (local LLM)  ─┐
        TradingAgents-style ─┤  multi-agent analysis (analysts → trader → risk debate)
        rule-book engine    ─┘  hard risk gate — the LLM proposes, code enforces
        MT5 terminal           order execution (direct, bridge, or paper)

    Railway backend (optional):
        stores the rule book you edit in Settings,
        receives progress snapshots for your dashboard.

Usage:
    python agent/prop_eval_agent.py --dry-run                 # watch it think, no orders
    python agent/prop_eval_agent.py --auto                    # execute when you're away
    python agent/prop_eval_agent.py --mode bridge             # execute via the MT5 WS bridge
    python agent/prop_eval_agent.py --standalone --symbols XAUUSD,EURUSD

The agent needs a backend JWT (or --standalone). Log in once with:
    python agent/prop_eval_agent.py --login
"""
import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone, date
from pathlib import Path

import httpx

# Reuse the backend's rule-book engine (pure logic, no DB/network needed).
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
from app.core.instruments import get_pip_size, round_price          # noqa: E402
from app.services.prop_eval_engine import (                          # noqa: E402
    AccountState, EvalVerdict, RuleBook,
    check_position_gate, calculate_lot_size, evaluate,
    rulebook_from_settings,
)

# ── Config (env overrides) ───────────────────────────────────────────
DEFAULT_API_URL = os.environ.get("PP_API_URL", "http://localhost:8000")
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1")
DEEP_MODEL = os.environ.get("TRADINGAGENTS_DEEP_MODEL", "glm-4.7-flash:latest")
QUICK_MODEL = os.environ.get("TRADINGAGENTS_QUICK_MODEL", "qwen3:latest")
JWT = os.environ.get("PP_TOKEN", "")
TOKEN_PATH = REPO_ROOT / ".agent_token"

MAX_LLM_SECONDS = 180


# ── LLM (Ollama, OpenAI-compatible) ──────────────────────────────────
def _chat(messages, model, temperature=0.4, max_tokens=1200) -> str:
    """Single completion against the local model. Raises on failure."""
    resp = httpx.post(
        f"{OLLAMA_URL}/chat/completions",
        json={"model": model, "messages": messages,
              "temperature": temperature, "max_tokens": max_tokens},
        timeout=MAX_LLM_SECONDS,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _json_call(messages, model, temperature=0.2) -> dict:
    """Ask the model for JSON, parse leniently (strip code fences)."""
    out = _chat(messages, model, temperature=temperature)
    out = out.strip()
    if out.startswith("```"):
        out = out.split("\n", 1)[1] if "\n" in out else out[3:]
        if out.rstrip().endswith("```"):
            out = out.rstrip()[:-3]
    return json.loads(out)


# ── Multi-agent analysis (TradingAgents-style, lightweight runner) ───
# Same roles as the vendored framework — fundamental/news/social analysts,
# bull/bear researchers, trader, risk debate — implemented as direct local
# LLM calls so the agent runs with zero heavy dependencies.

def analyse(symbol: str, price_snapshot: dict, news_blurb: str) -> dict:
    """Run the analyst → researcher → trader → risk-debate pipeline.

    Returns the trader's decision dict or None if no trade is warranted.
    """
    candle_summary = price_snapshot.get("summary", "no data")
    messages = [
        {"role": "system", "content": (
            "You are a disciplined trading team for a prop-firm evaluation. "
            "Never invent data. Be conservative: passing the evaluation matters "
            "more than any single trade. Prefer fewer, higher-conviction trades.")},
        {"role": "user", "content": (
            f"Symbol: {symbol}\nRecent price action (summarised):\n{candle_summary}\n\n"
            f"Recent news: {news_blurb or 'none'}\n\n"
            "You are the market + news + fundamental analysts. "
            "Return STRICT JSON: {\"market_bias\":\"bullish|bearish|neutral\","
            "\"bias_strength\":0.0-1.0,\"key_levels\":\"support/resistance\","
            "\"news_impact\":\"positive|negative|neutral\",\"rationale\":\"2-3 sentences\"}")},
    ]
    try:
        analysts = _json_call(messages, DEEP_MODEL, temperature=0.2)
    except Exception as e:
        print(f"  [llm] analyst stage failed: {e}")
        return None

    # Researcher (bull/bear theses) + trader decision
    trader_msgs = [
        {"role": "system", "content": (
            "You are the trader agent in a prop-firm evaluation team. "
            "Rules: risk a small fixed amount per trade, always set SL and TP, "
            "and NEVER trade without a stop. Only act on confluence. "
            "If there is no edge, return action \"none\".")},
        {"role": "user", "content": (
            f"Analysts' view: {json.dumps(analysts)}\n"
            f"Symbol: {symbol}\nCurrent price: {price_snapshot.get('last', '?')}\n"
            "Build the bull and bear theses, weigh them, and decide.\n"
            "Return STRICT JSON: {\"action\":\"buy|sell|none\",\"entry\":<price>,\n"
            "\"sl_pips\":<number>,\"tp_pips\":<number>,\"confidence\":0.0-1.0,\n"
            "\"thesis\":\"1-2 sentences\"}. Use price units in pips via the instrument's "
            "pip convention (gold 0.1, forex 0.0001, indices 1.0).")},
    ]
    try:
        decision = _json_call(trader_msgs, DEEP_MODEL, temperature=0.2)
    except Exception as e:
        print(f"  [llm] trader stage failed: {e}")
        return None

    if decision.get("action") == "none":
        return None

    # Risk debators — vote to veto aggressive ideas
    risk_msgs = [
        {"role": "system", "content": (
            "You are two prop-firm risk managers (conservative + neutral) "
            "debating the trader's proposal. The account must survive to pass. "
            "Vote veto if the trade risks too much or lacks confluence.")},
        {"role": "user", "content": (
            f"Proposed trade: {json.dumps(decision)}\n"
            "Return STRICT JSON: {\"veto\":true|false,\"reason\":\"short\","
            "\"risk_rating\":\"low|medium|high\"}")},
    ]
    try:
        risk = _json_call(risk_msgs, QUICK_MODEL, temperature=0.1)
    except Exception as e:
        print(f"  [llm] risk stage failed (proceeding without veto): {e}")
        risk = {"veto": False}

    if risk.get("veto"):
        print(f"  [risk] VETO: {risk.get('reason')}")
        return None

    decision["risk_rating"] = risk.get("risk_rating", "medium")
    return decision


# ── Execution backends ───────────────────────────────────────────────
class PaperExecutor:
    """Dry-run: log the intended order, never touch a broker."""
    def __init__(self, dry=True): self.dry = dry
    def account(self) -> AccountState:
        return AccountState(balance=100000.0, equity=100000.0, peak_balance=100000.0,
                            day_start_balance=100000.0)
    def open(self, symbol, side, volume, sl, tp, comment) -> dict:
        print(f"  [paper] {side} {volume} {symbol} SL={sl} TP={tp} {comment}")
        return {"status": "ok", "ticket": 0}


class BridgeExecutor:
    """Send orders through the platform's MT5 WebSocket bridge."""
    def __init__(self, api_url, token, user_id):
        self.ws_url = (api_url.replace("https://", "wss://").replace("http://", "ws://")
                       + f"/ws/agent/{user_id}")
        self.token = token
    def account(self) -> AccountState:
        return AccountState(balance=0.0, equity=0.0, peak_balance=0.0, day_start_balance=0.0)
    def open(self, symbol, side, volume, sl, tp, comment) -> dict:
        # The real bridge loop lives in the existing MT5 agent; this is a
        # placeholder wiring point. Use --mode direct for full automation.
        raise NotImplementedError("bridge auto-execution: use --mode direct or --paper")


def _try_direct_executor():
    """Use the MetaTrader5 package when running on the MT5 machine (Windows)."""
    try:
        import MetaTrader5 as mt5  # type: ignore
        mt5.initialize()
        return mt5
    except Exception:
        return None


# ── Session state (daily rollover, drawdown peak) ────────────────────
class Session:
    def __init__(self, book: RuleBook):
        self.book = book
        self.peak_balance = book.account_size
        self.day_start_balance = book.account_size
        self.trading_days_logged = 0
        self.consecutive_losses = 0
        self.day_key = date.today()
        self.opened_today = False
        self.trades_opened = {}  # day_key -> count

    def roll_day(self, acct: AccountState):
        today = date.today()
        if today != self.day_key:
            if self.opened_today:
                self.trading_days_logged += 1
            self.day_key = today
            self.day_start_balance = acct.balance or self.day_start_balance
            self.opened_today = False

    def apply_result(self, pnl: float):
        """Call when a position closes with PnL."""
        if pnl < 0:
            self.consecutive_losses += 1
        elif pnl > 0:
            self.consecutive_losses = 0

    def to_account_state(self, live: AccountState) -> AccountState:
        live.peak_balance = max(live.peak_balance or 0, self.peak_balance)
        live.day_start_balance = self.day_start_balance
        live.trading_days_logged = self.trading_days_logged
        live.consecutive_losses = self.consecutive_losses
        return live


# ── Backend sync (rule book + snapshots) ─────────────────────────────
def fetch_rulebook(token: str) -> dict:
    r = httpx.get(f"{DEFAULT_API_URL}/prop-eval/settings",
                  headers={"Authorization": f"Bearer {token}"}, timeout=15)
    r.raise_for_status()
    return r.json()


def push_snapshot(token: str, snapshot: dict):
    httpx.post(f"{DEFAULT_API_URL}/prop-eval/status",
               headers={"Authorization": f"Bearer {token}"}, json=snapshot, timeout=15)


def login(email: str, password: str) -> str:
    r = httpx.post(f"{DEFAULT_API_URL}/auth/login",
                   json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    token = r.json()["access_token"]
    TOKEN_PATH.write_text(token)
    return token


# ── Main loop ────────────────────────────────────────────────────────
def _summary_text(candles) -> str:
    if not candles:
        return "no candle data available"
    closes = [c["c"] for c in candles[-50:]]
    highs = [c["h"] for c in candles[-50:]]
    lows = [c["l"] for c in candles[-50:]]
    return (f"last={closes[-1]:.5f} range_50={min(lows):.5f}-{max(highs):.5f} "
            f"last_5_close=[{', '.join(f'{x:.5f}' for x in closes[-5:])}]")


async def run_loop(args):
    token = JWT or (TOKEN_PATH.read_text().strip() if TOKEN_PATH.exists() else "")
    standalone = args.standalone

    book = None
    if not standalone:
        if not token:
            print("No JWT found. Run with --login or set PP_TOKEN.")
            sys.exit(2)
        try:
            book = rulebook_from_settings(fetch_rulebook(token))
            print(f"[config] rule book loaded: {book.provider} phase {book.phase}, "
                  f"target {book.profit_target_pct}% / daily {book.max_daily_loss_pct}% / "
                  f"dd {book.max_total_drawdown_pct}%")
        except Exception as e:
            print(f"[config] failed to fetch rule book ({e}) — using FTMO defaults")
            book = rulebook_from_settings({"provider": "ftmo"})
    else:
        book = rulebook_from_settings({"provider": "ftmo"})
        print("[config] standalone mode — FTMO defaults")

    symbols = [s.strip().upper() for s in (args.symbols or ",".join(book.instruments)).split(",") if s.strip()]

    # Execution backend
    mt5 = None if args.mode == "paper" else _try_direct_executor()
    if args.mode == "direct" and mt5 is None:
        print("[exec] MetaTrader5 package not available — falling back to paper mode "
              "(run this on the machine with the MT5 terminal, or use --mode paper)")
        args.mode = "paper"

    session = Session(book)
    cycle = 0

    print(f"[start] mode={args.mode} models={DEEP_MODEL}/{QUICK_MODEL} symbols={symbols}")
    print(f"[start] auto_execute={book.auto_execute or args.auto} — "
          f"{'orders will be placed' if (book.auto_execute or args.auto) and args.mode == 'direct' else 'advisor mode: trades are drafted only'}")

    while True:
        cycle += 1
        try:
            if mt5 is not None:
                import MetaTrader5 as _m
                info = _m.account_info()
                positions = _m.positions_get() or []
                acct = AccountState(
                    balance=info.balance, equity=info.equity,
                    peak_balance=session.peak_balance,
                    day_start_balance=session.day_start_balance,
                    open_trades=len(positions),
                )
                # Track closed-trade results for consecutive-loss logic
                for pos in positions:
                    if pos.profit != 0:
                        session.apply_result(pos.profit)
            else:
                acct = PaperExecutor().account()

            session.roll_day(acct)
            acct = session.to_account_state(acct)

            verdict = evaluate(book, acct)
            snapshot = {
                **acct.to_dict(),
                "daily_loss_pct": verdict.daily_loss_pct,
                "drawdown_pct": verdict.drawdown_pct,
                "profit_pct": verdict.profit_pct,
                "phase": book.phase,
                "status": verdict.status,
                "reason": verdict.reason,
            }
            if not standalone:
                try: push_snapshot(token, snapshot)
                except Exception: pass
            print(f"[{time.strftime('%H:%M:%S')}] cycle {cycle}: {verdict.status} — "
                  f"equity {acct.equity:.2f} | profit {verdict.profit_pct:+.2f}% | "
                  f"dd {verdict.drawdown_pct:.2f}% | days {acct.trading_days_logged}/{book.min_trading_days}")

            if verdict.status in ("passed", "failed"):
                print(f"[result] EVALUATION {verdict.status.upper()}: {verdict.reason}")
                push_snapshot(token, snapshot) if not standalone else None
                return

            if not verdict.can_open_new_trades:
                await asyncio.sleep(60)
                continue

            for symbol in symbols:
                # gate before asking the LLM (cheap first, expensive second)
                can, reason = check_position_gate(book, acct, symbol)
                if not can:
                    continue

                candles = _fake_candles(symbol)  # TODO: wire CANDLES from MT5/bridge
                if not candles:
                    continue  # no data — no analysis (never let the LLM invent prices)
                decision = analyse(symbol, {"last": 0.0, "summary": _summary_text(candles)},
                                   news_blurb="")  # TODO: wire news feed
                if not decision:
                    continue

                entry = float(decision.get("entry") or 0)
                sl_pips = float(decision.get("sl_pips") or 0)
                tp_pips = float(decision.get("tp_pips") or 0)
                pip = get_pip_size(symbol)
                sl_dist = sl_pips * pip
                volume = calculate_lot_size(book, acct, symbol, sl_dist, entry or acct.equity)
                sl = round_price(symbol, entry - sl_dist)
                tp = round_price(symbol, entry + tp_pips * pip)
                comment = f"PP-Eval:{book.provider[:4]}:{book.phase}"

                print(f"  [trade] {decision['action'].upper()} {symbol} vol={volume} "
                      f"@~{entry} SL={sl} TP={tp} conf={decision.get('confidence')} "
                      f"risk={decision.get('risk_rating')}")
                print(f"  [thesis] {decision.get('thesis')}")

                should_execute = (book.auto_execute or args.auto) and args.mode == "direct"
                if should_execute:
                    print("  [exec] placing order...")
                    # TODO: mt5.order_send(...) wired here for the FTMO/FundedNext account
                else:
                    print(f"  [advisor] execute manually in MT5 (auto_execute={book.auto_execute}, "
                          f"mode={args.mode})")

            await asyncio.sleep(args.interval)
        except Exception as e:
            print(f"[error] {e}")
            await asyncio.sleep(60)


def _fake_candles(symbol: str):
    """Placeholder candle source until MT5/bridge data is wired."""
    return []


def main():
    ap = argparse.ArgumentParser(description="PesaPips prop-eval agent")
    ap.add_argument("--login", action="store_true", help="Log in and store a JWT")
    ap.add_argument("--email")
    ap.add_argument("--password")
    ap.add_argument("--auto", action="store_true", help="Execute orders (when mode=direct)")
    ap.add_argument("--mode", choices=["direct", "bridge", "paper"], default="paper",
                    help="direct: MetaTrader5 package; bridge: MT5 WS bridge; paper: dry-run")
    ap.add_argument("--dry-run", action="store_true", help="Advisor mode, never place orders")
    ap.add_argument("--standalone", action="store_true", help="No backend: FTMO defaults, no snapshots")
    ap.add_argument("--symbols", default="", help="Comma-separated instruments")
    ap.add_argument("--interval", type=int, default=300, help="Seconds between analysis cycles")
    args = ap.parse_args()

    if args.login:
        if not args.email or not args.password:
            print("usage: --login --email you@example.com --password '...'")
            sys.exit(2)
        token = login(args.email, args.password)
        print(f"logged in; token saved to {TOKEN_PATH}")
        return

    try:
        asyncio.run(run_loop(args))
    except KeyboardInterrupt:
        print("\nagent stopped")


if __name__ == "__main__":
    main()
