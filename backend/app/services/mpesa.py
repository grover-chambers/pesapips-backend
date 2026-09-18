"""
M-Pesa / Flutterwave payment integration for PesaPips.
Uses Flutterwave's M-Pesa push (STK) API for instant payment verification.
"""
import os
import httpx
import logging
from typing import Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger("mpesa")

FLW_SECRET_KEY = os.getenv("FLW_SECRET_KEY", "")
FLW_PUBLIC_KEY = os.getenv("FLW_PUBLIC_KEY", "")

PLAN_AMOUNTS = {
    "pro": {"monthly": 2500, "annual": 25000},
    "elite": {"monthly": 5000, "annual": 50000},
    "platinum": {"monthly": 9000, "annual": 90000},
}

FLW_CURRENCY = "KES"
FLW_COUNTRY = "KE"


async def initiate_mpesa_payment(
    email: str,
    phone: str,
    plan: str,
    billing: str = "monthly",
    tx_ref: str = "",
) -> dict:
    if not FLW_SECRET_KEY:
        return {"status": "error", "message": "Flutterwave not configured. Use manual M-Pesa payment."}

    amount = PLAN_AMOUNTS.get(plan, {}).get(billing, 0)
    if amount == 0:
        return {"status": "error", "message": f"Invalid plan: {plan}"}

    if not tx_ref:
        import secrets
        tx_ref = f"PP-{plan}-{secrets.token_hex(8)}"

    payload = {
        "tx_ref": tx_ref,
        "amount": str(amount),
        "currency": FLW_CURRENCY,
        "country": FLW_COUNTRY,
        "payment_options": "mpesa",
        "redirect_url": "https://pesapips.com/payment/callback",
        "customer": {
            "email": email,
            "phone_number": phone,
            "name": email.split("@")[0],
        },
        "customizations": {
            "title": "PesaPips Trading AI",
            "description": f"{plan.upper()} plan — {billing}",
            "logo": "https://pesapips.com/logo.png",
        },
        "meta": {
            "plan": plan,
            "billing": billing,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.flutterwave.com/v3/payments",
                json=payload,
                headers={"Authorization": f"Bearer {FLW_SECRET_KEY}"},
            )
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "status": "ok",
                    "link": data["data"]["link"],
                    "tx_ref": tx_ref,
                    "amount": amount,
                }
            return {"status": "error", "message": data.get("message", "Payment initiation failed")}
    except Exception as e:
        logger.error(f"Flutterwave payment initiation failed: {e}")
        return {"status": "error", "message": f"Payment service unavailable: {e}"}


async def verify_payment(tx_ref: str) -> Tuple[bool, dict]:
    if not FLW_SECRET_KEY:
        return False, {"message": "Flutterwave not configured"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={tx_ref}",
                headers={"Authorization": f"Bearer {FLW_SECRET_KEY}"},
            )
            data = resp.json()
            if data.get("status") == "success":
                tx_data = data.get("data", {})
                is_successful = (
                    tx_data.get("status") == "successful"
                    and tx_data.get("currency") == FLW_CURRENCY
                )
                if is_successful:
                    meta = tx_data.get("meta", {}) or {}
                    return True, {
                        "plan": meta.get("plan", ""),
                        "billing": meta.get("billing", "monthly"),
                        "amount": tx_data.get("amount", 0),
                        "flw_id": tx_data.get("id"),
                        "tx_ref": tx_ref,
                    }
                return False, {"message": f"Payment status: {tx_data.get('status', 'unknown')}"}
            return False, {"message": "Transaction not found"}
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        return False, {"message": f"Verification error: {e}"}


def get_pricing() -> dict:
    return {
        "plans": {
            "free": {"monthly": 0, "annual": 0, "features": ["5 signals/day", "Basic dashboard", "Community access"]},
            "pro": {"monthly": 2500, "annual": 25000, "save": 5000, "features": ["Unlimited signals", "All strategies", "Market intel", "Email alerts"]},
            "elite": {"monthly": 5000, "annual": 50000, "save": 10000, "features": ["Everything in Pro", "Regime scanner", "Auto-switching", "Telegram alerts", "Priority support"]},
            "platinum": {"monthly": 9000, "annual": 90000, "save": 18000, "features": ["Everything in Elite", "Auto-trading (autorun)", "Advanced risk manager", "Copy trading", "Dedicated support"]},
        },
        "currency": "KES",
        "annual_discount_label": "Save 2 months with annual billing",
    }
