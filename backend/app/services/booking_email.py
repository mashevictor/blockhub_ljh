"""预约资料投递邮件 — 浅色商务模板（与 publish_email 同源风格）。"""

from __future__ import annotations

import html
import logging

from app.core.config import settings
from app.services.email_service import send_email, smtp_configured

logger = logging.getLogger(__name__)

_BG = "#F8FAFC"
_BORDER = "#E2E8F0"
_INK = "#0F172A"
_MUTED = "#475569"
_LABEL = "#64748B"
_CTA_BG = "#0F172A"
_CTA_FG = "#FFFFFF"
_LINK = "#1D4ED8"
_ACCENT = "#0F172A"


def _cta_button(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0;">'
        f'<tr><td align="left" bgcolor="{_CTA_BG}" style="border-radius:8px;background-color:{_CTA_BG};">'
        f'<a href="{href}" target="_blank" style="display:inline-block;padding:12px 24px;font-size:14px;'
        f"font-weight:700;color:{_CTA_FG};text-decoration:none;"
        "font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;\">"
        f"{html.escape(label)}</a></td></tr></table>"
    )


def _summary_block(summary: str) -> str:
    lines = [ln.strip() for ln in summary.split("\n") if ln.strip()]
    body = "".join(
        f'<p style="margin:0 0 8px;font-size:14px;color:{_MUTED};line-height:1.65;">'
        f"{html.escape(ln)}</p>"
        for ln in lines
    )
    return (
        f'<div style="background:{_BG};border:1px solid {_BORDER};border-left:4px solid {_ACCENT};'
        f'border-radius:8px;padding:16px;margin:18px 0;">'
        f'<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:{_INK};">给同事的转发摘要</p>'
        f"{body}</div>"
    )


def build_booking_email_html(
    *,
    salutation: str,
    company_name: str,
    summary: str,
    share_url: str,
) -> str:
    who = html.escape(salutation.strip() or "您好")
    co = html.escape(company_name.strip())
    co_line = f"（{co}）" if co else ""
    safe_url = html.escape(share_url)
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>积木仓 · 演示预约确认</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">
演示预约已收到，专属资料包已备好，24 小时内顾问将联系您。
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F1F5F9;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
<tr>
<td bgcolor="#0F172A" style="background-color:#0F172A;padding:20px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
<tr>
<td style="font-size:18px;font-weight:700;color:#FFFFFF;">积木仓 BlockHub</td>
<td align="right" style="font-size:12px;color:#94A3B8;">演示预约确认</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px 28px 8px;color:{_INK};">
<p style="margin:0 0 12px;font-size:16px;font-weight:600;">{who}，您好：</p>
<p style="margin:0 0 8px;font-size:14px;color:{_MUTED};line-height:1.7;">
我们已收到您的演示预约{co_line}。<strong style="color:{_INK};">24 小时内</strong>会有顾问与您联系。
</p>
{_summary_block(summary)}
{_cta_button(share_url, "打开专属演示资料包")}
<p style="margin:0 0 16px;font-size:12px;color:{_LABEL};word-break:break-all;line-height:1.5;">
链接（30 天内有效）：<a href="{safe_url}" style="color:{_LINK};">{safe_url}</a>
</p>
<p style="margin:0 0 8px;font-size:13px;color:{_MUTED};line-height:1.7;">
资料包通常包含：一页纸方案摘要、安全与对接说明、客户案例，以及价格与部署说明。
</p>
<p style="margin:0 0 4px;font-size:13px;color:{_MUTED};line-height:1.7;">
如需补充需求，直接回复本邮件即可。
</p>
<p style="margin:18px 0 0;font-size:13px;color:{_LABEL};line-height:1.6;">
祝好，<br /><span style="font-weight:700;color:{_INK};">积木仓团队</span>
</p>
</td>
</tr>
<tr>
<td style="padding:18px 28px 22px;border-top:1px solid {_BORDER};background-color:{_BG};">
<p style="margin:0;font-size:11px;color:#94A3B8;line-height:1.5;">
此邮件由积木仓系统自动发送。blockhub.club
</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body></html>"""


def build_booking_email_text(
    *,
    salutation: str,
    company_name: str,
    summary: str,
    share_url: str,
) -> str:
    who = salutation.strip() or "您好"
    co = f"（{company_name.strip()}）" if company_name.strip() else ""
    return (
        f"{who}，您好：\n\n"
        f"我们已收到您的演示预约{co}。24 小时内会有顾问与您联系。\n\n"
        f"转发摘要：\n{summary}\n\n"
        f"专属资料包：{share_url}\n"
        f"（链接 30 天内有效）\n\n"
        f"资料通常包含：一页纸方案摘要、安全与对接说明、客户案例、价格与部署说明。\n"
        f"如需补充需求，直接回复本邮件即可。\n\n"
        f"积木仓团队\nhttps://blockhub.club"
    )


def send_booking_delivery_email(
    *,
    to: str,
    salutation: str,
    company_name: str,
    summary: str,
    share_url: str,
) -> bool:
    if not smtp_configured():
        logger.warning("SMTP not configured — skip booking email to %s", to)
        return False
    subject = "积木仓：演示预约已确认"
    text = build_booking_email_text(
        salutation=salutation,
        company_name=company_name,
        summary=summary,
        share_url=share_url,
    )
    html_body = build_booking_email_html(
        salutation=salutation,
        company_name=company_name,
        summary=summary,
        share_url=share_url,
    )
    return send_email(
        to,
        subject,
        text,
        html_body,
        list_unsubscribe=f"{settings.public_base_url.rstrip('/')}/#contact",
    )
