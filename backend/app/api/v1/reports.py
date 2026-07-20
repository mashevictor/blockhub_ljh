from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services.report_service import build_dashboard
from app.services.sales_nl_query import answer_sales_nl_query

router = APIRouter(prefix="/reports", tags=["reports"])


class NLQueryRequest(BaseModel):
    question: str
    app_public_id: str = ""


@router.get("/dashboard")
def report_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return build_dashboard(db, tenant_id=user.tenant_id)


@router.post("/nl-query")
def natural_language_query(
    body: NLQueryRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    app_id: str | None = Query(None),
) -> dict:
    """基于租户真库聚合回答；空库返回空态说明，禁止假 seed 数字。"""
    app_public_id = (body.app_public_id or app_id or "").strip() or None
    return answer_sales_nl_query(db, user.tenant_id, body.question, app_public_id=app_public_id)


@router.get("/export")
def export_report(format: str = "xlsx") -> dict:
    return {
        "success": True,
        "format": format,
        "filename": f"trackchat-report-2026-07.{format}",
        "message": "报表导出任务已创建，请稍后下载",
    }
