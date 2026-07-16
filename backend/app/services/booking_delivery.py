"""预约演示资料投递：摘要生成、专属链接、邮件/短信。"""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import DemoBooking
from app.services.booking_email import send_booking_delivery_email
from app.services.deepseek_client import deepseek_json_chat
from app.services.sms_service import send_sms

logger = logging.getLogger(__name__)

SHARE_ARTIFACTS: list[dict[str, str]] = [
    {
        "id": "one-pager",
        "title": "一页纸方案摘要",
        "description": "制造行业 · 线索快速响应 · 可转发给决策层",
        "href": "/downloads/one-pager-mfg.pdf",
    },
    {
        "id": "case-mfg",
        "title": "制造行业客户案例（含试点调整过程）",
        "description": "800 人制造企业 · 平均首响 28 分钟 · 一线采纳率 72%",
        "href": "/cases/mfg-leads",
    },
    {
        "id": "integration",
        "title": "业务系统对接清单",
        "description": "用友等常见系统对接说明与数据流",
        "href": "/downloads/integration-checklist.pdf",
    },
    {
        "id": "security",
        "title": "安全常见问题答复（预填版）",
        "description": "信息部门预审 · 数据不出境 · 可审计",
        "href": "/downloads/security-faq.pdf",
    },
    {
        "id": "pricing",
        "title": "价格与套餐说明",
        "description": "SaaS / 混合部署 / 私有化 · 影响因素说明",
        "href": "/pricing",
    },
    {
        "id": "trust",
        "title": "信任与合规中心",
        "description": "安全白皮书 · DPA 摘要 · 部署模式对比",
        "href": "/trust",
    },
]


@dataclass
class DeliveryResult:
    share_token: str
    share_url: str
    agent_summary: str
    email_sent: bool
    sms_sent: bool
    delivery_status: str


def new_share_token() -> str:
    return secrets.token_urlsafe(9).replace("-", "").replace("_", "")[:12]


def share_url(token: str) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/share/{token}"


def short_share_url(token: str) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/s/{token}"


def mask_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) >= 7:
        return f"{digits[:3]}****{digits[-4:]}"
    if len(digits) >= 4:
        return f"{digits[:2]}****{digits[-2:]}"
    return phone or ""


def fallback_summary(*, salutation: str, company_name: str) -> str:
    co = company_name.strip() or "贵司"
    return (
        f"① {co}关注的销售与服务响应场景，可与积木仓制造行业方案中的"
        f"「系统联动 + 人工确认后再发送」方式相匹配。\n"
        f"② 参考同行业试点结果：平均首次响应时间由约 3.2 小时缩短至 28 分钟，"
        f"一线采纳率 72%（以上为已验证数据，不含赢单率承诺）。\n"
        f"③ 建议信息部门同事一并查看资料包中的「业务系统对接说明」与「数据安全说明」，便于内部预审。"
    )


def generate_agent_summary(*, salutation: str, company_name: str) -> str:
    sal = salutation.strip() or "客户"
    co = company_name.strip() or "未填写公司"
    data = deepseek_json_chat(
        (
            "你是积木仓售前材料助手。根据客户预约信息，生成 3 句中文「内部转发摘要」。"
            "要求：① 场景匹配 ② 引用已验证试点数据（28 分钟首响、72% 采纳率，注明不含赢单承诺）"
            "③ 建议信息部门同事查看安全与对接材料。"
            "语气专业、可转发给同事。禁止英文术语（如 POC、SSOT、Agent、Deal Room）。"
            "只返回 JSON：{\"summary\":\"三句话，用换行分隔，可加 ①②③ 前缀\"}"
        ),
        f"称呼：{sal}\n公司：{co}",
        temperature=0.3,
    )
    summary = (data or {}).get("summary", "").strip()
    if summary and len(summary) >= 40:
        return summary
    return fallback_summary(salutation=salutation, company_name=company_name)


def deliver_booking(db: Session, row: DemoBooking) -> DeliveryResult:
    if not row.share_token:
        row.share_token = new_share_token()
    if not row.agent_summary:
        row.agent_summary = generate_agent_summary(
            salutation=row.salutation,
            company_name=row.company_name,
        )

    url = share_url(row.share_token)
    short_url = short_share_url(row.share_token)
    email_sent = False
    sms_sent = False

    if row.contact_email.strip():
        email_sent = send_booking_delivery_email(
            to=row.contact_email.strip(),
            salutation=row.salutation.strip(),
            company_name=row.company_name.strip(),
            summary=row.agent_summary,
            share_url=url,
        )

    if row.contact_phone.strip():
        sal = row.salutation.strip() or "您好"
        sms_text = (
            f"【积木仓】{sal}，演示预约已收到，24 小时内将有顾问联系。"
            f"您的资料包：{short_url} 详细文件已发至邮箱。"
        )
        if not row.contact_email.strip():
            sms_text = (
                f"【积木仓】{sal}，演示预约已收到，24 小时内将有顾问联系。"
                f"资料包：{short_url}"
            )
        sms_sent = send_sms(row.contact_phone.strip(), sms_text)

    if email_sent or sms_sent:
        row.delivery_status = "sent"
    elif row.contact_email.strip() or row.contact_phone.strip():
        row.delivery_status = "ready"
    else:
        row.delivery_status = "ready"

    row.email_sent = email_sent
    row.sms_sent = sms_sent
    db.add(row)
    db.commit()
    db.refresh(row)

    logger.info(
        "booking delivery id=%s token=%s email=%s sms=%s",
        row.id,
        row.share_token,
        email_sent,
        sms_sent,
    )
    return DeliveryResult(
        share_token=row.share_token,
        share_url=url,
        agent_summary=row.agent_summary,
        email_sent=email_sent,
        sms_sent=sms_sent,
        delivery_status=row.delivery_status,
    )


def get_share_pack(db: Session, token: str) -> dict | None:
    row = db.query(DemoBooking).filter(DemoBooking.share_token == token).first()
    if not row:
        return None
    return {
        "token": row.share_token,
        "salutation": row.salutation,
        "company_name": row.company_name,
        "agent_summary": row.agent_summary,
        "artifacts": SHARE_ARTIFACTS,
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }
