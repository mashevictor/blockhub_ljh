"""销售/金融问数：基于租户真库聚合，禁止静态假答冒充业务。"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import FinanceNewsItem, FinanceOpsRecord, OpsKpiRecord, QuoteContractRecord, SalesLeadRecord
from app.services.finance_ops_store import KIND_LABEL, KINDS


def _finance_answer(
    db: Session,
    tenant_id: str,
    question: str,
    *,
    app_public_id: str | None = None,
) -> dict[str, Any] | None:
    q = (question or "").strip()
    finance_keys = (
        "KYC",
        "开户",
        "反洗钱",
        "AML",
        "授信",
        "贷后",
        "尽调",
        "报送",
        "核保",
        "理赔",
        "保险",
        "金融",
        "新闻",
        "宏观",
        "风控",
        "渠道",
        "费率",
        "运营日报",
        "资产分析",
        "研究所",
        "获客",
    )
    if not any(k in q for k in finance_keys):
        return None

    ops_q = db.query(FinanceOpsRecord.kind, FinanceOpsRecord.status, func.count()).filter(
        FinanceOpsRecord.tenant_id == tenant_id
    )
    news_q = db.query(FinanceNewsItem).filter(FinanceNewsItem.tenant_id == tenant_id)
    if app_public_id:
        ops_q = ops_q.filter(FinanceOpsRecord.app_public_id == app_public_id)
        news_q = news_q.filter(FinanceNewsItem.app_public_id == app_public_id)

    by_kind: dict[str, dict[str, int]] = {k: {"open": 0, "total": 0} for k in sorted(KINDS)}
    total = 0
    open_n = 0
    for kind, status, cnt in ops_q.group_by(FinanceOpsRecord.kind, FinanceOpsRecord.status).all():
        n = int(cnt or 0)
        if kind not in by_kind:
            by_kind[kind] = {"open": 0, "total": 0}
        by_kind[kind]["total"] += n
        total += n
        if status == "open":
            by_kind[kind]["open"] += n
            open_n += n

    news_total = news_q.count()
    news_demo = news_q.filter(FinanceNewsItem.source == "demo").count()
    news_real = news_total - news_demo

    if any(k in q for k in ("新闻", "宏观", "热议", "摘要")):
        answer = (
            f"行业新闻入库 {news_total}：演示 {news_demo} · 真源 {news_real}。"
            if news_total
            else "空库无行业新闻；可写入演示样本或接入真源同步。"
        )
        return {"question": q, "answer": answer, "source": "finance_news", "counts": {"total": news_total}}

    parts = [
        f"{KIND_LABEL.get(k, k)} {by_kind[k]['total']}（待办 {by_kind[k]['open']}）"
        for k in sorted(KINDS)
        if by_kind[k]["total"]
    ]
    if not parts and not news_total:
        return {
            "question": q,
            "answer": "空库无金融工单与新闻。提交 KYC/授信/报送等工单或同步新闻后即可查数。",
            "source": "finance_ops",
            "counts": {"total": 0, "open": 0, "news": 0},
        }
    answer = f"金融真库：合计 {total}（待办 {open_n}）"
    if parts:
        answer += " · " + "；".join(parts[:6])
    if news_total:
        answer += f" · 新闻 {news_total}"
    return {
        "question": q,
        "answer": answer,
        "source": "finance_ops",
        "counts": {"total": total, "open": open_n, "news": news_total, "by_kind": by_kind},
    }


def answer_sales_nl_query(
    db: Session,
    tenant_id: str,
    question: str,
    *,
    app_public_id: str | None = None,
) -> dict[str, Any]:
    q = (question or "").strip()
    fin = _finance_answer(db, tenant_id, q, app_public_id=app_public_id)
    if fin is not None:
        return fin

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
