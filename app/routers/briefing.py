"""
Daily AI Market Briefing endpoints.
"""
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models.user import User
from app.services.daily_briefing import generate_briefing

router = APIRouter(prefix="/briefing", tags=["Briefing"])


@router.get("/daily")
def daily_briefing(
    current_user: User = Depends(get_current_user),
):
    plan = current_user.subscription_plan
    tier_order = {"free": 0, "pro": 1, "elite": 2, "platinum": 3}
    user_tier = tier_order.get(plan, 0)

    briefing = generate_briefing()

    if user_tier < 1:
        return {
            "headline": briefing["headline"],
            "session": briefing["session"],
            "overall_regime": briefing["overall_regime"],
            "tier_limited": True,
            "upgrade_msg": "Upgrade to Pro to see the full daily briefing with strategy recommendations.",
        }

    if user_tier < 2:
        briefing.pop("events", None)
        briefing["assets"] = briefing.get("assets", [])[:3]
        briefing["tier_limited"] = True
        briefing["upgrade_msg"] = "Upgrade to Elite for events calendar and full asset coverage."

    return briefing


@router.get("/force-refresh")
def force_refresh(
    current_user: User = Depends(get_current_user),
):
    from app.services.daily_briefing import _briefing_cache
    _briefing_cache["briefing"] = None
    _briefing_cache["date"] = ""
    briefing = generate_briefing()
    return {"status": "refreshed", "headline": briefing["headline"]}
