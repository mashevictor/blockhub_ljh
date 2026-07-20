"""销售问数：基于租户真库聚合，禁止静态假答冒充业务。"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import OpsKpiRecord, QuoteContractRecord, SalesLeadRecord


def answer_sales_nl_query(
    db: Session,
    tenant_id: str,
    question: str,
    *,
    app_public_id: str | None = None,
) -> dict[str, Any]:
    q = (question or "").strip()
    leads_q = db.query(SalesLeadRecord).filter(SalesLeadRecord.tenant_id == tenant_id)
    quotes_q = db.query(QuoteContractRecord).filter(QuoteContractRecord.tenant_id == tenant_id)
    kpi_q = db.query(OpsKpiRecord).filter(OpsKpiRecord.tenant_id == tenant_id)
    if app_public_id:
        leads_q = leads_q.filter(SalesLeadRecord.app_public_id == app_public_id)
        quotes_q = quotes_q.filter(QuoteContractRecord.app_public_id == app_public_id)
        kpi_q = kpi_q.filter(OpsKpiRecord.app_public_id == app_public_id)

    leads = leads_q.all()
    quotes = quotes_q.all()
    kpis = kpi_q.order_by(OpsKpiRecord.created_at.desc()).limit(20).all()

    by_status: dict[str, int] = {}
    for r in leads:
        by_status[r.status] = by_status.get(r.status, 0) + 1
    open_n = by_status.get("open", 0)
    following_n = by_status.get("following", 0)
    won_n = by_status.get("won", 0)
    lost_n = by_status.get("lost", 0)
    total_leads = len(leads)
    total_quotes = len(quotes)
    signed = sum(1 for r in quotes if r.status == "signed")
    reviewing = sum(1 for r in quotes if r.status == "reviewing")

    # 关键词路由到真聚合
    if any(k in q for k in ("漏斗", "转化", "阶段", "线索")):
        answer = (
            f"线索合计 {total_leads}：新线索 {open_n} · 跟进中 {following_n} · 成交 {won_n} · 丢单 {lost_n}。"
            if total_leads
            else "空库无销售线索，漏斗各阶段均为 0。"
        )
        return {"question": q, "answer": answer, "source": "sales_lead", "counts": by_status}

    if any(k in q for k in ("报价", "合同", "签约", "折扣")):
        answer = (
            f"报价/合同合计 {total_quotes}：评审中 {reviewing} · 已签约 {signed}。"
            if total_quotes
            else "空库无报价合同记录。"
        )
        return {"question": q, "answer": answer, "source": "quote_contract"}

    if any(k in q for k in ("业绩", "提成", "排行", "KPI", "目标", "区域")):
        if not kpis:
            return {"question": q, "answer": "空库无经营指标；可在经营看板补录或等线索成交后查看漏斗。", "source": "ops_kpi"}
        top = "；".join(f"{r.title}={r.value}" + (f"（{r.period}）" if r.period else "") for r in kpis[:5])
        return {"question": q, "answer": f"最近指标：{top}", "source": "ops_kpi"}

    # 默认总览
    answer = (
        f"销售总览：线索 {total_leads}（成交 {won_n}）· 报价合同 {total_quotes}（已签约 {signed}）· 指标 {len(kpis)}。"
        if total_leads or total_quotes or kpis
        else "空库无销售业务数据。录入线索/报价后即可查数。"
    )
    return {
        "question": q,
        "answer": answer,
        "source": "sales_overview",
        "counts": {"leads": total_leads, "quotes": total_quotes, "kpis": len(kpis)},
    }
