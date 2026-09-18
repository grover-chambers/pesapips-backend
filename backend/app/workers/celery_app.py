from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "pesapips",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.trading_loop"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Nairobi",
    enable_utc=True,
    beat_schedule={
        "run-trading-loop-every-5s": {
            "task": "app.workers.trading_loop.run_trading_loop",
            "schedule": 5.0,
        },
    },
)
