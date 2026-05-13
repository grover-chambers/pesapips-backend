from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional, List


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    FERNET_KEY: str
    REDIS_URL: str = "redis://localhost:6379/0"
    APP_NAME: str = "PesaPips Trading AI"
    DEBUG: bool = True
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_FROM: str = "PesaPips <noreply@pesapips.com>"
    # Market Data
    TWELVE_DATA_KEY: Optional[str] = ""
    # CORS
    CORS_ORIGINS: str = "https://pesapips.vercel.app,https://pesapips.com,http://localhost:5173,http://localhost:3000"
    # MT5 Bridge Path
    MT5_BRIDGE_PATH: Optional[str] = None
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = ""
    TELEGRAM_CHAT_ID: Optional[str] = ""
    # Flutterwave / M-Pesa
    FLW_SECRET_KEY: Optional[str] = ""
    FLW_PUBLIC_KEY: Optional[str] = ""

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
