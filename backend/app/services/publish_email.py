"""发布成功邮件 — 网页链接 + APK 附件。"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.services.email_service import send_email, smtp_configured
from app.services.file_storage import uploads_root

TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "templates" / "email" / "publish_delivery.html"

GMAIL_DOMAINS = frozenset({"gmail.com", "googlemail.com"})


def _is_gmail_recipient(email: str) -> bool:
    domain = email.rsplit("@", 1)[-1].lower().strip()
    return domain in GMAIL_DOMAINS


def _recipient_name(email: str) -> str:
    local = email.split("@", 1)[0]
    return local or "用户"


def _deliver_label(deliver: str) -> str:
    if deliver == "web":
        return "网页版"
    if deliver == "app":
        return "Android App"
    return "网页 + App 双端"


# 黑金邮件主题色（暖深灰，非纯黑）
_EMAIL_BG = "#221c16"
_EMAIL_BORDER = "#3d3428"
_EMAIL_GOLD = "#d4af37"
_EMAIL_GOLD_TEXT = "#1a1612"
_EMAIL_TEXT = "#f5f0e8"
_EMAIL_MUTED = "#c4b9a8"
_EMAIL_LABEL = "#a89f8f"


def _cta_button(href: str, label: str, icon: str = "&#127760;") -> str:
    """Gmail 兼容的金色主按钮。"""
    return (
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" '
        'style="margin:0 0 16px;">'
        "<tr><td align=\"center\" bgcolor=\"#d4af37\" "
        f'style="border-radius:12px;background-color:{_EMAIL_GOLD};'
        'border:1px solid #f0d78c;">'
        f'<a href="{href}" target="_blank" '
        'style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;'
        f"color:{_EMAIL_GOLD_TEXT};text-decoration:none;line-height:1.4;"
        'font-family:Arial,Helvetica,\'PingFang SC\',\'Microsoft YaHei\',sans-serif;">'
        f"{icon}&nbsp;{label}</a></td></tr></table>"
    )


def _info_row(title: str, body_html: str, icon: str = "&#128279;") -> str:
    return (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="margin-bottom:16px;">'
        f"<tr><td style=\"padding:16px 18px;background-color:{_EMAIL_BG};border-radius:14px;"
        f'border:1px solid {_EMAIL_BORDER};">'
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0">'
        "<tr>"
        f'<td width="32" valign="top" style="font-size:18px;line-height:1;padding-right:10px;">{icon}</td>'
        "<td valign=\"top\">"
        f'<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:{_EMAIL_LABEL};">{title}</p>'
        f"{body_html}"
        "</td></tr></table>"
        "</td></tr></table>"
    )


def _build_download_block(
    *,
    deliver: str,
    web_url: str,
    download_url: str,
    apk_attached: bool,
    gmail_mode: bool = False,
) -> str:
    parts: list[str] = []
    if deliver in ("web", "both") and web_url:
        parts.append(_cta_button(web_url, "打开网页员工端", "&#127760;"))
        parts.append(
            _info_row(
                "网页版链接",
                f'<p style="margin:0;font-size:13px;color:{_EMAIL_MUTED};line-height:1.6;word-break:break-all;">'
                f'<a href="{web_url}" style="color:#f0d78c;font-weight:600;text-decoration:underline;">'
                f"{web_url}</a></p>",
                "&#128279;",
            )
        )
    if deliver in ("app", "both"):
        if apk_attached:
            parts.append(
                _info_row(
                    "Android 安装包",
                    f'<p style="margin:0;font-size:14px;color:{_EMAIL_MUTED};line-height:1.65;">'
                    f"已随本邮件<strong style=\"color:{_EMAIL_TEXT};\">附件</strong>发送（.apk），"
                    "下载后允许「安装未知来源应用」即可安装。</p>",
                    "&#128241;",
                )
            )
        elif download_url:
            parts.append(_cta_button(download_url, "下载 Android 安装包", "&#128241;"))
            apk_note = (
                '<span style="color:#f0d78c;">（Gmail 邮箱请使用下载链接，勿依赖附件）</span>'
                if gmail_mode
                else f'<span style="color:{_EMAIL_LABEL};">（若暂不可用，请稍后重试）</span>'
            )
            parts.append(
                _info_row(
                    "APK 直链",
                    f'<p style="margin:0;font-size:13px;color:{_EMAIL_MUTED};line-height:1.6;word-break:break-all;">'
                    f'<a href="{download_url}" style="color:#f0d78c;font-weight:600;text-decoration:underline;">'
                    f"{download_url}</a>"
                    f"{apk_note}</p>",
                    "&#128279;",
                )
            )
        elif gmail_mode:
            parts.append(
                _info_row(
                    "Android 安装包",
                    f'<p style="margin:0;font-size:14px;color:{_EMAIL_MUTED};line-height:1.65;">'
                    "Gmail 对 .apk 附件限制较严，本邮件未附带安装包。"
                    "请登录积木仓「我的应用」页面获取下载链接，或使用网页员工端。</p>",
                    "&#128241;",
                )
            )
    if not parts and web_url:
        parts.append(_cta_button(web_url, "打开应用", "&#9889;"))
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
    gmail_mode: bool = False,
) -> str:
    lines = [
        f"您好，{recipient_name}：",
        "",
        f"您在积木仓 BlockHub 创建的应用「{app_name}」已发布成功（{_deliver_label(deliver)}）。",
        "",
    ]
    if deliver in ("web", "both"):
        lines.extend(["网页员工端：", web_url, ""])
    if deliver in ("app", "both"):
        if apk_attached:
            lines.append("Android 安装包已随邮件附件发送，请查收 .apk 文件。")
        elif download_url:
            lines.extend(["Android 下载：", download_url, ""])
            if gmail_mode:
                lines.append("（Gmail 用户请使用上方下载链接，本邮件未附带 .apk 附件。）")
        elif gmail_mode:
            lines.append("Gmail 用户：请登录积木仓「我的应用」获取 APK 下载链接。")
    if scenarios:
        lines.extend(["", "已包含场景：", "、".join(scenarios[:8])])
    lines.extend(["", "祝好，", "积木仓 BlockHub 团队"])
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
    gmail_mode: bool = False,
) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    logo_url = f"{settings.public_base_url.rstrip('/')}/logo-mark.jpg"
    scenario_text = "、".join(scenarios[:8]) if scenarios else "智能问答 · 审批 · 知识库"
    download_block = _build_download_block(
        deliver=deliver,
        web_url=web_url,
        download_url=download_url,
        apk_attached=apk_attached,
        gmail_mode=gmail_mode,
    )
    return (
        template.replace("{LOGO_URL}", logo_url)
        .replace("{用户姓名}", recipient_name)
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
    """发布成功后向用户邮箱发送网页链接，并在有 APK 时作为附件。"""
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
    gmail_mode = _is_gmail_recipient(email)

    apk_path: Path | None = None
    if deliver_mode in ("app", "both"):
        apk_path = _resolve_apk_path(public_id)

    # Gmail 常拒收 .apk 附件；改为下载链接 + 纯文本说明
    apk_attached = (
        apk_path is not None
        and deliver_mode in ("app", "both")
        and not gmail_mode
    )
    recipient = _recipient_name(email)
    subject = f"【积木仓 BlockHub】您的应用「{app_name}」已就绪，请查收访问方式"

    text = _build_text(
        recipient_name=recipient,
        app_name=app_name,
        deliver=deliver_mode,
        web_url=web_url,
        download_url=download_url,
        scenarios=scenarios,
        apk_attached=apk_attached,
        gmail_mode=gmail_mode,
    )
    html = _build_html(
        recipient_name=recipient,
        app_name=app_name,
        deliver=deliver_mode,
        web_url=web_url,
        download_url=download_url,
        scenarios=scenarios,
        apk_attached=apk_attached,
        gmail_mode=gmail_mode,
    )

    attachments: list[tuple[str, Path]] = []
    if apk_attached and apk_path:
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in app_name)
        attachments.append((f"{safe_name or public_id}.apk", apk_path))

    return send_email(email, subject, text, html, attachments=attachments)
