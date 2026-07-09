from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.data.seed import ARCH_LAYERS
from app.db.session import get_db
from app.services.stats_service import dashboard_stats, recent_activities, usage_trends

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard")
def dashboard_stats_api(db: Session = Depends(get_db)) -> dict:
    return dashboard_stats(db)


@router.get("/activities")
def recent_activities_api(db: Session = Depends(get_db)) -> dict:
    return {"items": recent_activities(db)}


@router.get("/trends")
def usage_trends_api(db: Session = Depends(get_db)) -> dict:
    return usage_trends(db)


@router.get("/architecture")
def architecture_layers() -> dict:
    return {"layers": ARCH_LAYERS}
