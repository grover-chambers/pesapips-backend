from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.strategy import UserStrategy
from app.services.signal_engine import run_signal
from app.services.risk_manager import RiskManager
from app.services.market_data import get_market_data
from app.models.trade import Trade
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.trading_loop.run_trading_loop")
def run_trading_loop():
    """
    Runs every 5 seconds via Celery Beat.
    Finds all active user strategies, fetches market data,
    runs signal engine, logs result.
    MT5 execution will be added once MT5 bridge is connected.
    """
    db = SessionLocal()
    try:
        active_strategies = db.query(UserStrategy).filter(
            UserStrategy.is_active == True
        ).all()

        if not active_strategies:
            return {"status": "no_active_strategies"}

        results = []

        for us in active_strategies:
            try:
                params = us.custom_params
                asset = us.asset
                timeframe = us.timeframe

                # Fetch market data
                df = get_market_data(symbol=asset, timeframe=timeframe, periods=200)
                if df is None or df.empty:
                    logger.warning(f"No data for {asset}")
                    continue

                # Run signal engine
                signal_result = run_signal(df, params)
                signal = signal_result["signal"]

                logger.info(
                    f"User {us.user_id} | {asset} | {signal} | "
                    f"{signal_result['reason']} | "
                    f"confidence={signal_result['confidence']}"
                )

                # Log trade to DB if signal is BUY or SELL
                if signal in ("BUY", "SELL"):
                    rm = RiskManager(
                        balance=1000.0,  # placeholder until MT5 balance is live
                        risk_per_trade=params.get("risk_per_trade", 1.0),
                    )
                    lot = rm.calculate_lot_size(sl_pips=params.get("sl_pips", 15))
                    latest_price = float(df.iloc[-1]["close"])
                    sl, tp = rm.calculate_sl_tp(
                        entry_price=latest_price,
                        signal=signal,
                        sl_pips=params.get("sl_pips", 15),
                        tp_pips=params.get("tp_pips", 30),
                    )

                    trade = Trade(
                        user_id=us.user_id,
                        symbol=asset,
                        trade_type=signal,
                        lot=lot,
                        entry_price=latest_price,
                        sl=sl,
                        tp=tp,
                        status="open",
                        strategy_name=us.strategy.name,
                        opened_at=datetime.utcnow(),
                    )
                    db.add(trade)
                    db.commit()

                results.append({
                    "user_id": us.user_id,
                    "asset": asset,
                    "signal": signal,
                    "confidence": signal_result["confidence"],
                })

            except Exception as e:
                logger.error(f"Error processing strategy {us.id}: {e}")
                continue

        return {"status": "ok", "processed": len(active_strategies), "results": results}

    finally:
        db.close()
