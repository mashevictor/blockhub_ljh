"""发布成功邮件 — 浅色商务模板；默认不附带 APK（防退信）。"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.services.email_service import send_email, smtp_configured
from app.services.file_storage import uploads_root

TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "templates" / "email" / "publish_delivery.html"

# 浅色商务（对齐 docs/UIUE-DESIGN-SYSTEM.md §6）
_BG = "#F8FAFC"
_BORDER = "#E2E8F0"
_INK = "#0F172A"
_MUTED = "#475569"
_LABEL = "#64748B"
_CTA_BG = "#0F172A"
_CTA_FG = "#FFFFFF"
_LINK = "#1D4ED8"


def _deliver_label(deliver: str) -> str:
    if deliver == "web":
        return "网页版"
    if deliver == "app":
        return "Android App"
    return "网页 + App"


def _recipient_name(email: str) -> str:
    local = email.split("@", 1)[0].strip()
    return local or "用户"


def _cta_button(href: str, label: str) -> str:
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" '
        'style="margin:0 0 14px;">'
        f'<tr><td align="left" bgcolor="{_CTA_BG}" '
        f'style="border-radius:8px;background-color:{_CTA_BG};">'
        f'<a href="{href}" target="_blank" '
        'style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;'
        f"color:{_CTA_FG};text-decoration:none;line-height:1.4;"
        "font-family:Arial,Helvetica,'PingFang SC','Microsoft YaHei',sans-serif;\">"
        f"{label}</a></td></tr></table>"
    )


def _info_row(title: str, body_html: str) -> str:
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="margin-bottom:14px;">'
        f'<tr><td style="padding:14px 16px;background-color:{_BG};border-radius:8px;'
        f'border:1px solid {_BORDER};">'
        f'<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:{_LABEL};">{title}</p>'
        f"{body_html}"
        "</td></tr></table>"
    )


def _build_download_block(
    *,
    deliver: str,
    web_url: str,
    download_url: str,
    apk_attached: bool,
) -> str:
    parts: list[str] = []
    if deliver in ("web", "both") and web_url:
        parts.append(_cta_button(web_url, "打开网页版"))
        parts.append(
            _info_row(
                "网页版链接",
                f'<p style="margin:0;font-size:13px;color:{_MUTED};line-height:1.6;word-break:break-all;">'
                f'<a href="{web_url}" style="color:{_LINK};font-weight:600;text-decoration:underline;">'
                f"{web_url}</a></p>",
            )
        )
    if deliver in ("app", "both"):
        if apk_attached:
            parts.append(
                _info_row(
                    "Android 安装包",
                    f'<p style="margin:0;font-size:14px;color:{_MUTED};line-height:1.65;">'
                    f"已随本邮件附件发送（.apk）。请允许「安装未知来源应用」后安装。</p>",
                )
            )
        elif download_url:
            parts.append(_cta_button(download_url, "下载 Android 安装包"))
            parts.append(
                _info_row(
                    "安装包下载链接",
                    f'<p style="margin:0;font-size:13px;color:{_MUTED};line-height:1.6;word-break:break-all;">'
                    f'<a href="{download_url}" style="color:{_LINK};font-weight:600;text-decoration:underline;">'
                    f"{download_url}</a></p>"
                    f'<p style="margin:8px 0 0;font-size:12px;color:{_LABEL};line-height:1.5;">'
                    "为降低邮箱拦截风险，默认不随信附带 .apk 文件。</p>",
                )
            )
        else:
            parts.append(
                _info_row(
                    "Android 安装包",
                    f'<p style="margin:0;font-size:14px;color:{_MUTED};line-height:1.65;">'
                    "安装包仍在构建中。请稍后打开积木仓「我的应用」获取下载链接，或先使用网页版。</p>",
                )
            )
    if not parts and web_url:
        parts.append(_cta_button(web_url, "打开应用"))
    return "".join(parts)


def _build_text(
    *,
    recipient_name: str,
    app_name: str,
    deliver: str,
    web_url: str,
    download_url: str,
    scenarios: list[str],
    apk_attached: bool,
) -> str:
    lines = [
        f"{recipient_name}，您好：",
        "",
        f"您在积木仓创建的应用「{app_name}」已发布（{_deliver_label(deliver)}）。",
        "",
    ]
    if deliver in ("web", "both") and web_url:
        lines.extend(["网页版：", web_url, ""])
    if deliver in ("app", "both"):
        if apk_attached:
            lines.append("Android 安装包已作为附件发送。")
        elif download_url:
            lines.extend(
                [
                    "Android 安装包下载（本邮件不含 .apk 附件，请用链接下载）：",
                    download_url,
                    "",
                ]
            )
        else:
            lines.append("Android 安装包仍在构建中，请稍后在「我的应用」查看。")
    if scenarios:
        lines.extend(["", "已包含能力：", "、".join(scenarios[:8])])
    lines.extend(["", "如有问题请直接回复本邮件。", "", "积木仓团队", "https://blockhub.club"])
    return "\n".join(lines)


def _build_html(
    *,
    recipient_name: str,
    app_name: str,
    deliver: str,
    web_url: str,
    download_url: str,
    scenarios: list[str],
    apk_attached: bool,
) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    scenario_text = "、".join(scenarios[:8]) if scenarios else "智能问答 · 审批 · 知识库"
    download_block = _build_download_block(
        deliver=deliver,
        web_url=web_url,
        download_url=download_url,
        apk_attached=apk_attached,
    )
    return (
        template.replace("{用户姓名}", recipient_name)
        .replace("{应用名称}", app_name)
        .replace("{交付形式}", _deliver_label(deliver))
        .replace("{场景列表}", scenario_text)
        .replace("{下载链接区块}", download_block)
    )


def _resolve_apk_path(public_id: str) -> Path | None:
    root = uploads_root()
    per_app = root / "apks" / f"{public_id}.apk"
    if per_app.is_file():
        return per_app
    default_apk = root / "apks" / "default.apk"
    if default_apk.is_file():
        return default_apk
    return None


def send_publish_delivery_email(
    contact_email: str,
    app: dict,
    *,
    deliver: str | None = None,
) -> bool:
    """发布成功后发通知邮件。默认只发链接，不附带 APK。"""
    email = contact_email.strip()
    if not email or "@" not in email:
        return False
    if not smtp_configured():
        return False

    deliver_mode = deliver or app.get("deliver") or "both"
    web_url = app.get("web_url") or ""
    download_url = app.get("download_url") or ""
    app_name = app.get("name") or "我的应用"
    public_id = app.get("id") or "app"
    scenarios = app.get("scenarios") or []

    # 默认永不附带 .apk：多数邮箱（含 Gmail / 企业邮）会直接拒收或进垃圾箱
    apk_path = _resolve_apk_path(public_id) if deliver_mode in ("app", "both") else None
    apk_attached = bool(settings.smtp_attach_apk and apk_path is not None)
    if not download_url and apk_path is not None:
        # 有包无直链时仍给站点入口，避免空提示
        base = settings.public_base_url.rstrip("/")
        download_url = f"{base}/api/v1/runtime/{public_id}/download"

    recipient = _recipient_name(email)
    # 短标题、少符号，降低垃圾邮件评分
    subject = f"积木仓：应用「{app_name}」已发布"

    text = _build_text(
        recipient_name=recipient,
        app_name=app_name,
        deliver=deliver_mode,
        web_url=web_url,
        download_url=download_url,
        scenarios=scenarios,
        apk_attached=apk_attached,
    )
    html = _build_html(
        recipient_name=recipient,
        app_name=app_name,
        deliver=deliver_mode,
        web_url=web_url,
        download_url=download_url,
        scenarios=scenarios,
        apk_attached=apk_attached,
    )

    attachments: list[tuple[str, Path]] = []
    if apk_attached and apk_path:
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in app_name)
        attachments.append((f"{safe_name or public_id}.apk", apk_path))

    return send_email(
        email,
        subject,
        text,
        html,
        attachments=attachments or None,
        list_unsubscribe=f"{settings.public_base_url.rstrip('/')}/#contact",
    )
