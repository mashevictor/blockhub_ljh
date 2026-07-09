"""Real report aggregation from PostgreSQL (W4 · 报表非 Mock)."""

from __future__ import annotations

import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    ApprovalRecord,
    AppRecord,
    ChatMessage,
    EtlJob,
    IntegrationConnector,
    KbDocument,
    Notification,
    User,
)


def _month_key(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return f"{dt.year}-{dt.month:02d}"


def _last_6_months() -> list[str]:
    now = datetime.now(timezone.utc)
    keys: list[str] = []
    y, m = now.year, now.month
    for _ in range(6):
        keys.append(f"{y}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return list(reversed(keys))


CN_MONTH = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]


def build_dashboard(db: Session, *, tenant_id: str) -> dict[str, Any]:
    started = time.perf_counter()

    months = _last_6_months()
    month_labels = [CN_MONTH[int(k.split("-")[1]) - 1] for k in months]

    approvals = db.query(ApprovalRecord).filter(ApprovalRecord.tenant_id == tenant_id).all()
    chats = db.query(ChatMessage).filter(ChatMessage.tenant_id == tenant_id).all()
    apps = db.query(AppRecord).filter(AppRecord.tenant_id == tenant_id).all()
    kbs = db.query(KbDocument).filter(KbDocument.tenant_id == tenant_id).all()
    users = db.query(User).filter(User.tenant_id == tenant_id).all()
    notifications = db.query(Notification).filter(Notification.tenant_id == tenant_id).all()
    connectors = db.query(IntegrationConnector).filter(IntegrationConnector.tenant_id == tenant_id).all()
    etl_jobs = db.query(EtlJob).filter(EtlJob.tenant_id == tenant_id).all()

    approval_by_month = defaultdict(int)
    for a in approvals:
        approval_by_month[_month_key(a.submitted_at)] += 1
    chat_by_month = defaultdict(int)
    for c in chats:
        chat_by_month[_month_key(c.created_at)] += 1

    approval_trend_values = [approval_by_month.get(m, 0) for m in months]
    chat_trend_values = [chat_by_month.get(m, 0) for m in months]

    # Agent usage derived from real signals.
    usage_raw = [
        ("智能问答", len(chats)),
        ("审批流程", len(approvals)),
        ("知识库", len(kbs)),
        ("智能创建", len(apps)),
        ("消息通知", len(notifications)),
        ("数据报表", 0),
        ("系统对接", len(connectors) + len(etl_jobs)),
    ]
    total_calls = sum(c for _, c in usage_raw)
    agent_usage = [
        {"agent": name, "calls": calls, "percent": round(calls / total_calls * 100) if total_calls else 0}
        for name, calls in usage_raw
    ]

    # KPIs.
    total_apr = len(approvals)
    approved = sum(1 for a in approvals if a.status == "approved")
    approval_rate = f"{approved / total_apr * 100:.0f}%" if total_apr else "—"

    decided = [a for a in approvals if a.decided_at]
    if decided:
        hours = []
        for a in decided:
            if a.submitted_at:
                delta = (a.decided_at - a.submitted_at).total_seconds() / 3600
                hours.append(delta)
        avg_hours = sum(hours) / len(hours) if hours else 0
    else:
        avg_hours = 0

    active_users = len({u.id for u in users})
    doc_processed = sum(k.chunk_count for k in kbs)

    # Month-over-month growth for trends.
    def _growth(values: list[int]) -> str:
        if len(values) >= 2 and values[-2] > 0:
            pct = (values[-1] - values[-2]) / values[-2] * 100
            return f"{pct:+.0f}%"
        return "+0%"

    kpis = [
        {"key": "approval_rate", "label": "审批通过率", "value": approval_rate, "change": _growth(approval_trend_values), "positive": (total_apr == 0 or approved / total_apr >= 0.8)},
        {"key": "avg_time", "label": "平均处理时长", "value": f"{avg_hours:.1f}h", "change": "", "positive": True},
        {"key": "active_users", "label": "用户数", "value": str(active_users), "change": "", "positive": True},
        {"key": "doc_processed", "label": "文档切片量", "value": str(doc_processed), "change": "", "positive": True},
    ]

    availability = "100%"
    if etl_jobs:
        ok = sum(1 for j in etl_jobs if j.status == "success")
        availability = f"{ok / len(etl_jobs) * 100:.1f}%"

    elapsed_ms = int((time.perf_counter() - started) * 1000)

    return {
        "kpis": kpis,
        "approval_trend": {"label": "审批趋势", "growth": _growth(approval_trend_values), "months": month_labels, "values": approval_trend_values},
        "chat_trend": {"label": "问答趋势", "growth": _growth(chat_trend_values), "months": month_labels, "values": chat_trend_values},
        "agent_usage": agent_usage,
        "total_calls": total_calls,
        "availability": availability,
        "avg_response_ms": elapsed_ms,
        "nl_suggestions": [
            "上个月审批通过率是多少？",
            "哪个功能使用最多？",
            "本月新增了多少文档？",
        ],
    }
