from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services.report_service import build_dashboard

router = APIRouter(prefix="/reports", tags=["reports"])


class NLQueryRequest(BaseModel):
    question: str


@router.get("/dashboard")
def report_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return build_dashboard(db, tenant_id=user.tenant_id)


@router.post("/nl-query")
def natural_language_query(body: NLQueryRequest) -> dict:
    from app.data.module_data import nl_query

    return nl_query(body.question)


@router.get("/export")
def export_report(format: str = "xlsx") -> dict:
    return {
        "success": True,
        "format": format,
        "filename": f"trackchat-report-2026-07.{format}",
        "message": "报表导出任务已创建，请稍后下载",
    }
