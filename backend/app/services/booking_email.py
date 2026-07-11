"""预约资料投递邮件（黑金模板，对齐 publish_email 风格）。"""

from __future__ import annotations

import html
import logging

from app.core.config import settings
from app.services.email_service import send_email, smtp_configured

logger = logging.getLogger(__name__)

_EMAIL_BG = "#221c16"
_EMAIL_BORDER = "#3d3428"
_EMAIL_GOLD = "#d4af37"
_EMAIL_GOLD_TEXT = "#1a1612"
_EMAIL_TEXT = "#f5f0e8"
_EMAIL_MUTED = "#c4b9a8"
_EMAIL_LABEL = "#a89f8f"
_EMAIL_GREEN = "#00b894"


def _cta_button(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:16px auto;">'
        f'<tr><td align="center" bgcolor="{_EMAIL_GOLD}" style="border-radius:12px;background-color:{_EMAIL_GOLD};">'
        f'<a href="{href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;'
        f"font-weight:700;color:{_EMAIL_GOLD_TEXT};text-decoration:none;"
        'font-family:Arial,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;">'
        f"📂 {html.escape(label)}</a></td></tr></table>"
    )


def _summary_block(summary: str) -> str:
    lines = [ln.strip() for ln in summary.split("\n") if ln.strip()]
    body = "".join(
        f'<p style="margin:0 0 8px;font-size:14px;color:{_EMAIL_MUTED};line-height:1.65;">'
        f"{html.escape(ln)}</p>"
        for ln in lines
    )
    return (
        f'<div style="background:{_EMAIL_BG};border:1px solid {_EMAIL_BORDER};border-left:4px solid {_EMAIL_GREEN};'
        f'border-radius:12px;padding:18px;margin:20px 0;">'
        f'<p style="margin:0 0 10px;font-size:12px;font-weight:800;color:{_EMAIL_GREEN};">&gt;&gt; 给您的转发摘要（可转给同事）</p>'
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
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0908;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0908;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background:#1a1612;border-radius:20px;border:1px solid #3d3428;overflow:hidden;">
<tr><td style="height:3px;background:linear-gradient(90deg,#96700a,#d4af37,#f0d78c);"></td></tr>
<tr><td style="padding:32px 36px;color:{_EMAIL_TEXT};">
<p style="margin:0 0 8px;font-size:22px;font-weight:700;text-align:center;">✦ 积木仓</p>
<p style="margin:0 0 24px;font-size:12px;color:{_EMAIL_LABEL};text-align:center;">预约确认 · 演示资料已备好</p>
<p style="font-size:16px;margin-bottom:8px;">{who}，您好</p>
<p style="font-size:14px;color:{_EMAIL_MUTED};line-height:1.6;margin-bottom:8px;">
我们已收到您的演示预约{co_line}。<strong style="color:{_EMAIL_TEXT};">24 小时内</strong>会有专属顾问与您联系。
</p>
{_summary_block(summary)}
{_cta_button(share_url, ">> 打开专属演示资料包")}
<p style="text-align:center;font-size:12px;color:{_EMAIL_LABEL};word-break:break-all;margin:8px 0 20px;">{html.escape(share_url)} · 链接 30 天内有效</p>
<p style="font-size:13px;color:{_EMAIL_MUTED};line-height:1.8;">
<strong style="color:{_EMAIL_TEXT};">资料包内包含：</strong><br/>
📎 《一页纸方案摘要》· 制造·线索响应<br/>
🔒 《安全与对接说明》· 业务系统集成与数据流<br/>
📊 《客户案例》· 制造企业试点报告<br/><br/>
<strong style="color:{_EMAIL_TEXT};">如需补充需求，直接回复本邮件即可。</strong>
</p>
</td></tr></table>
</td></tr></table>
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
        f"{who}，您好\n\n"
        f"我们已收到您的演示预约{co}。24 小时内会有专属顾问与您联系。\n\n"
        f">> 转发摘要：\n{summary}\n\n"
        f"专属资料包：{share_url}\n\n"
        f"资料包含：一页纸方案摘要、安全与对接说明、客户案例。\n"
        f"如需补充需求，直接回复本邮件即可。\n\n"
        f"—— 积木仓 BlockHub"
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
    subject = "【积木仓】演示预约已收到 · 资料包已备好"
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
    return send_email(to, subject, text, html_body)
