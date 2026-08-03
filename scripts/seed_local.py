"""
Local bootstrap for PesaPips private-tool mode.

Seeds a local admin + demo user and a default prop-eval rule book, so the
local stack (backend on :8000, frontend on :5173) is usable immediately.

Usage:  python scripts/seed_local.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import User  # noqa: E402
from app.models.prop_eval import PropEvalSettings  # noqa: E402

ADMIN_EMAIL = "brayanodira@gmail.com"
ADMIN_PASSWORD = "!Nc0rr3k7"
DEMO_EMAIL = "demo@pesapips.com"
DEMO_PASSWORD = "demo1234"


def _get_or_create_user(db: Session, email: str, password: str, is_admin: bool,
                        display_name: str, referral_code: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"  user exists: {email}")
        return user
    user = User(
        email=email,
        hashed_password=hash_password(password),
        is_active=True,
        is_verified=True,
        is_admin=is_admin,
        display_name=display_name,
        subscription_plan="premium",
        paper_trading_enabled=True,
        referral_code=referral_code,
    )
    db.add(user)
    db.flush()
    print(f"  created {email} (admin={is_admin})")
    return user


def _seed_rulebook(db: Session, user_id: int):
    if db.query(PropEvalSettings).first():
        print("  prop_eval_settings already present")
        return
    db.add(PropEvalSettings(
        user_id=user_id,
        provider="fundednext",
        account_size=100000.0,
        profit_target_pct=10.0,
        max_daily_loss_pct=3.0,
        max_total_drawdown_pct=6.0,
        min_trading_days=5,
        risk_per_trade_pct=0.5,
        max_open_trades=2,
        auto_execute=False,
    ))
    print("  seeded default prop-eval rule book (FundedNext presets)")


def main():
    db = SessionLocal()
    try:
        admin = _get_or_create_user(db, ADMIN_EMAIL, ADMIN_PASSWORD, True,
                                    "Brayo (Admin)", "LOCALADMIN")
        demo = _get_or_create_user(db, DEMO_EMAIL, DEMO_PASSWORD, False,
                                   "Demo Trader", "DEMO2026")
        _seed_rulebook(db, admin.id)
        db.commit()
        print("\nLocal bootstrap complete.")
        print(f"  admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print(f"  demo:  {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print(f"  rule book owned by user id={admin.id}, demo user id={demo.id}")
    except Exception as e:
        db.rollback()
        print(f"seed failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
