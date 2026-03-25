from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import User, MT5Account, Strategy, UserStrategy, Trade, PerformanceLog
from app.routers import auth, mt5, strategies, trading, dashboard, signal, notifications, payments, ws_bridge, market, courses, admin, blog

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

@app.on_event("startup")
async def on_startup():
    """Restore autorun sessions and start scheduled tasks on server start."""
    import asyncio, logging
    logger = logging.getLogger("startup")
    # 1. Restore autorun sessions
    try:
        from app.services.autorun_engine import restore_autorun_sessions
        await restore_autorun_sessions()
        logger.info("Autorun sessions restored")
    except Exception as e:
        logger.error(f"Autorun restore failed: {e}")
    # 2. Start scheduled regime scan (every hour)
    try:
        from app.services.regime_scanner import start_regime_scanner
        asyncio.create_task(start_regime_scanner())
        logger.info("Regime scanner started")
    except Exception as e:
        logger.error(f"Regime scanner failed to start: {e}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(mt5.router)
app.include_router(strategies.router)
app.include_router(trading.router)
app.include_router(dashboard.router)
app.include_router(signal.router)
app.include_router(notifications.router)
app.include_router(payments.router)
app.include_router(ws_bridge.router)
app.include_router(market.router)
app.include_router(courses.router)
app.include_router(admin.router)
app.include_router(blog.router)

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": "0.1.0", "status": "running", "docs": "/docs"}
