from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models import User, MT5Account, Strategy, UserStrategy, Trade, PerformanceLog
from app.models import Notification, Message, Payment, BlogPost
from app.models import CourseModule, CourseLesson, CourseQuiz, UserProgress
from app.models import SupportTicket, TicketNote, Announcement
from app.models.password_reset import PasswordResetToken
from app.models.trading_audit import SignalAudit, ReferralCode, ReferralUse, PaperTrade
from app.routers import auth, mt5, strategies, trading, dashboard, signal, notifications, payments, ws_bridge, market, courses, admin, blog
from app.routers import audit, referrals, paper_trading, mpesa, telegram, briefing

logger = logging.getLogger("pesapips")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    try:
        from app.services.autorun_engine import restore_autorun_sessions
        await restore_autorun_sessions()
        logger.info("Autorun sessions restored")
    except Exception as e:
        logger.error(f"Autorun restore failed: {e}")
    try:
        from app.services.regime_scanner import start_regime_scanner
        asyncio.create_task(start_regime_scanner())
        logger.info("Regime scanner started")
    except Exception as e:
        logger.error(f"Regime scanner failed to start: {e}")
    try:
        from app.services.news_filter import force_refresh
        force_refresh()
        logger.info("News calendar cache primed")
    except Exception as e:
        logger.error(f"News calendar prime failed: {e}")
    yield


app = FastAPI(title=settings.APP_NAME, version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
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
app.include_router(audit.router)
app.include_router(referrals.router)
app.include_router(paper_trading.router)
app.include_router(mpesa.router)
app.include_router(telegram.router)
app.include_router(briefing.router)


@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": "0.3.0", "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
