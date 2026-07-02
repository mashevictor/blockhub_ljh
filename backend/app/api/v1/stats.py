from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.data.module_data import _notify_store, approval_stats
from app.data.seed import (
    AGENTS,
    ARCH_LAYERS,
    CAPABILITIES,
    INDUSTRY_SCENARIOS,
    OFFICE_SCENARIOS,
    RECENT_ACTIVITIES,
)
from app.db.session import get_db
from app.services.app_store import list_published_apps

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
def dashboard_stats(db: Session = Depends(get_db)) -> dict:
    appr = approval_stats()
    unread = sum(1 for n in _notify_store if not n["read"])
    apps = list_published_apps(db)
    return {
        "status": "healthy",
        "status_text": "系统运行正常",
        "agents": len(AGENTS),
        "capabilities": len(CAPABILITIES),
        "office_scenarios": len(OFFICE_SCENARIOS),
        "industry_scenarios": len(INDUSTRY_SCENARIOS),
        "total_scenarios": len(OFFICE_SCENARIOS) + len(INDUSTRY_SCENARIOS),
        "apps_created": 24 + len(apps),
        "chat_sessions": 1286,
        "pending_approvals": appr["pending"],
        "unread_notifications": unread,
    }


@router.get("/activities")
def recent_activities() -> dict:
    return {"items": RECENT_ACTIVITIES}


@router.get("/trends")
def usage_trends() -> dict:
    return {
        "growth": "+23%",
        "label": "问答与审批使用量",
        "days": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        "chat_qa": [42, 58, 65, 72, 68, 35, 28],
        "approval": [18, 22, 28, 31, 26, 12, 8],
    }


@router.get("/architecture")
def architecture_layers() -> dict:
    return {"layers": ARCH_LAYERS}
