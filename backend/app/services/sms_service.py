"""短信发送：腾讯云 SMS；未配置时跳过并记日志。"""

from __future__ import annotations

import logging
import re

from app.core.config import settings
from app.services.tencent_api import tc3_json_request

logger = logging.getLogger(__name__)

_PHONE_CN = re.compile(r"^1[3-9]\d{9}$")


def sms_configured() -> bool:
    return bool(
        settings.sms_enabled
        and str(settings.tencent_sms_sdk_app_id or "").strip()
        and str(settings.tencent_sms_sign_name or "").strip()
        and str(settings.tencent_sms_template_id or "").strip()
        and (settings.tencent_secret_id or settings.cos_secret_id)
        and (settings.tencent_secret_key or settings.cos_secret_key)
    )


def _e164(phone: str) -> str:
    p = (phone or "").strip().replace(" ", "")
    if p.startswith("+"):
        return p
    if _PHONE_CN.match(p):
        return f"+86{p}"
    raise ValueError("手机号格式无效")


def send_sms(phone: str, text: str) -> bool:
    """兼容旧调用：纯文本。已配置腾讯云 SMS 时改走模板（从 text 提取 6 位码）。"""
    if not sms_configured():
        logger.info("SMS stub — would send to %s: %s", phone, text[:80])
        return False
    m = re.search(r"\b(\d{4,8})\b", text or "")
    code = m.group(1) if m else text.strip()[:8]
    return send_otp_sms(phone, code)


def send_otp_sms(phone: str, code: str) -> bool:
    """发送登录/注册验证码短信。模板参数默认 [{code}]。"""
    if not sms_configured():
        logger.info("SMS not configured — skip OTP to %s", phone)
        return False

    secret_id = (settings.tencent_secret_id or settings.cos_secret_id or "").strip()
    secret_key = (settings.tencent_secret_key or settings.cos_secret_key or "").strip()
    try:
        phone_e164 = _e164(phone)
    except ValueError:
        logger.warning("invalid phone for SMS: %s", phone)
        return False

    payload = {
        "PhoneNumberSet": [phone_e164],
        "SmsSdkAppId": str(settings.tencent_sms_sdk_app_id).strip(),
        "SignName": str(settings.tencent_sms_sign_name).strip(),
        "TemplateId": str(settings.tencent_sms_template_id).strip(),
        "TemplateParamSet": [str(code).strip()],
    }
    try:
        resp = tc3_json_request(
            secret_id=secret_id,
            secret_key=secret_key,
            service="sms",
            host="sms.tencentcloudapi.com",
            action="SendSms",
            version="2021-01-11",
            payload=payload,
            region=(settings.tencent_sms_region or "ap-guangzhou").strip(),
        )
    except RuntimeError as e:
        logger.error("SendSms failed: %s", e)
        return False

    status_set = resp.get("SendStatusSet") or []
    if not status_set:
        logger.error("SendSms empty status: %s", resp)
        return False
    first = status_set[0] if isinstance(status_set[0], dict) else {}
    ok = str(first.get("Code") or "").upper() in ("OK", "OKAY")
    if not ok:
        logger.error(
            "SendSms reject phone=%s code=%s msg=%s",
            phone_e164,
            first.get("Code"),
            first.get("Message"),
        )
    return ok
