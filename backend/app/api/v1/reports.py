from fastapi import APIRouter
from pydantic import BaseModel

from app.data.module_data import (
    AGENT_USAGE,
    APPROVAL_TREND,
    CHAT_TREND,
    REPORT_KPIS,
    REPORT_NL_SUGGESTIONS,
    nl_query,
)

router = APIRouter(prefix="/reports", tags=["reports"])


class NLQueryRequest(BaseModel):
    question: str


@router.get("/dashboard")
def report_dashboard() -> dict:
    return {
        "kpis": REPORT_KPIS,
        "approval_trend": APPROVAL_TREND,
        "chat_trend": CHAT_TREND,
        "agent_usage": AGENT_USAGE,
        "total_calls": sum(a["calls"] for a in AGENT_USAGE),
        "availability": "99.8%",
        "avg_response_ms": 45,
        "nl_suggestions": REPORT_NL_SUGGESTIONS,
    }


@router.post("/nl-query")
def natural_language_query(body: NLQueryRequest) -> dict:
    return nl_query(body.question)


@router.get("/export")
def export_report(format: str = "xlsx") -> dict:
    return {
        "success": True,
        "format": format,
        "filename": f"trackchat-report-2026-07.{format}",
        "message": "报表导出任务已创建，请稍后下载",
    }
