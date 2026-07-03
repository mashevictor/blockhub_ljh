"""发布成功邮件 — 网页链接 + APK 附件。"""

from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.services.email_service import send_email, smtp_configured
from app.services.file_storage import uploads_root

TEMPLATE_PATH = Path(__file__).resolve().parents[1] / "templates" / "email" / "publish_delivery.html"


def _recipient_name(email: str) -> str:
    local = email.split("@", 1)[0]
    return local or "用户"


def _deliver_label(deliver: str) -> str:
    if deliver == "web":
        return "网页版"
    if deliver == "app":
        return "Android App"
    return "网页 + App 双端"


def _build_download_block(*, deliver: str, web_url: str, download_url: str, apk_attached: bool) -> str:
    parts: list[str] = []
    if deliver in ("web", "both"):
        parts.append(
            f'<p class="p"><strong>网页员工端：</strong>'
            f'<a href="{web_url}" style="color:#0175C2;word-break:break-all;">{web_url}</a></p>'
        )
    if deliver in ("app", "both"):
        if apk_attached:
            parts.append(
                '<p class="p"><strong>Android 安装包：</strong>已随本邮件附件发送（.apk），'
                "下载后允许安装未知来源应用即可安装。</p>"
            )
        else:
            parts.append(
                f'<p class="p"><strong>Android 安装包：</strong>'
                f'<a href="{download_url}" style="color:#0175C2;word-break:break-all;">{download_url}</a>'
                "（若暂不可用，请稍后重试或联系管理员）</p>"
            )
    if not parts:
        parts.append(f'<p class="p"><a href="{web_url}">{web_url}</a></p>')
    return '<div class="download-block">' + "".join(parts) + "</div>"


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
        else:
            lines.extend(["Android 下载：", download_url, ""])
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
) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    logo_url = f"{settings.public_base_url.rstrip('/')}/logo-mark.jpg"
    scenario_text = "、".join(scenarios[:8]) if scenarios else "智能问答 · 审批 · 知识库"
    download_block = _build_download_block(
        deliver=deliver,
        web_url=web_url,
        download_url=download_url,
        apk_attached=apk_attached,
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

    apk_path: Path | None = None
    if deliver_mode in ("app", "both"):
        apk_path = _resolve_apk_path(public_id)

    apk_attached = apk_path is not None and deliver_mode in ("app", "both")
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

    return send_email(email, subject, text, html, attachments=attachments)
