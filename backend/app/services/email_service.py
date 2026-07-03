"""QQ / SMTP 邮件发送（对齐 D:\\product\\邮件模板\\发送邮件的js.txt）。"""

from __future__ import annotations

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(settings.smtp_enabled and settings.smtp_user and settings.smtp_password)


def send_email(
    to: str,
    subject: str,
    text: str,
    html: str | None = None,
    *,
    attachments: list[tuple[str, Path]] | None = None,
) -> bool:
    """发送 HTML + 纯文本邮件，可选附件（如 APK）。"""
    if not smtp_configured():
        logger.warning("SMTP not configured — skip send to %s", to)
        return False

    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg["To"] = to

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(text, "plain", "utf-8"))
    if html:
        alt.attach(MIMEText(html, "html", "utf-8"))
    msg.attach(alt)

    for filename, path in attachments or []:
        if not path.is_file():
            continue
        part = MIMEApplication(path.read_bytes(), Name=filename)
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    try:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, [to], msg.as_string())
        logger.info("Email sent to %s subject=%s", to, subject)
        return True
    except Exception:
        logger.exception("Email send failed to %s", to)
        return False
