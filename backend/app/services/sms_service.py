"""短信发送（未配置时记录日志并跳过）。"""

from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def sms_configured() -> bool:
    return bool(getattr(settings, "sms_enabled", False))


def send_sms(phone: str, text: str) -> bool:
    if not sms_configured():
        logger.info("SMS stub — would send to %s: %s", phone, text[:80])
        return False
    logger.warning("SMS provider not implemented — skip send to %s", phone)
    return False
