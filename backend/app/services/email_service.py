"""SMTP 邮件发送（QQ / 通用 SSL）。抗退信：完整头、纯文本+HTML、默认不鼓励大附件。"""

from __future__ import annotations

import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.header import Header
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# 常见被邮箱拦截的扩展名（默认拒绝作为附件）
_BLOCKED_ATTACHMENT_SUFFIXES = frozenset(
    {".apk", ".exe", ".bat", ".cmd", ".msi", ".js", ".vbs", ".scr", ".dll"}
)


def smtp_configured() -> bool:
    return bool(settings.smtp_enabled and settings.smtp_user and settings.smtp_password)


def send_email(
    to: str,
    subject: str,
    text: str,
    html: str | None = None,
    *,
    attachments: list[tuple[str, Path]] | None = None,
    reply_to: str | None = None,
    list_unsubscribe: str | None = None,
) -> bool:
    """发送 HTML + 纯文本邮件。默认跳过 .apk 等易退信附件。"""
    if not smtp_configured():
        logger.warning("SMTP not configured — skip send to %s", to)
        return False

    msg = MIMEMultipart("mixed")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = formataddr((str(Header(settings.smtp_from_name, "utf-8")), settings.smtp_user))
    msg["To"] = to
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=settings.smtp_user.split("@")[-1] if "@" in settings.smtp_user else "blockhub.club")
    msg["MIME-Version"] = "1.0"
    msg["X-Mailer"] = "BlockHub"
    if reply_to:
        msg["Reply-To"] = reply_to
    elif settings.smtp_user:
        msg["Reply-To"] = settings.smtp_user
    if list_unsubscribe:
        msg["List-Unsubscribe"] = f"<{list_unsubscribe}>"
        msg["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    alt = MIMEMultipart("alternative")
    # plain 在前、html 在后（客户端优先展示后者；反垃圾仍可读 plain）
    alt.attach(MIMEText(text, "plain", "utf-8"))
    if html:
        alt.attach(MIMEText(html, "html", "utf-8"))
    msg.attach(alt)

    attached = 0
    for filename, path in attachments or []:
        if not path.is_file():
            continue
        suffix = Path(filename).suffix.lower() or path.suffix.lower()
        if suffix in _BLOCKED_ATTACHMENT_SUFFIXES and not settings.smtp_attach_apk:
            logger.warning("Skip blocked attachment %s (smtp_attach_apk=false)", filename)
            continue
        if path.stat().st_size > 8 * 1024 * 1024:
            logger.warning("Skip oversized attachment %s (%s bytes)", filename, path.stat().st_size)
            continue
        part = MIMEApplication(path.read_bytes(), Name=filename)
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)
        attached += 1

    try:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, [to], msg.as_string())
        logger.info(
            "Email sent to %s subject=%s attachments=%s mid=%s",
            to,
            subject,
            attached,
            msg["Message-ID"],
        )
        return True
    except Exception:
        logger.exception("Email send failed to %s", to)
        return False


def render_preview_stamp() -> str:
    """调试用时间戳。"""
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6]
