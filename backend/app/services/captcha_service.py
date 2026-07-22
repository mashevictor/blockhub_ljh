# -*- coding: utf-8 -*-
"""腾讯云验证码（Captcha）票据校验。"""

from __future__ import annotations

import logging

from app.core.config import settings
from app.services.tencent_api import tc3_json_request

logger = logging.getLogger(__name__)


def captcha_configured() -> bool:
    return bool(
        str(settings.tencent_captcha_app_id or "").strip()
        and str(settings.tencent_captcha_app_secret_key or "").strip()
    )


def api_keys() -> tuple[str, str]:
    """DescribeCaptchaResult 需 CAM SecretId/Key；优先专用项，否则复用 COS。"""
    sid = (settings.tencent_secret_id or settings.cos_secret_id or "").strip()
    skey = (settings.tencent_secret_key or settings.cos_secret_key or "").strip()
    return sid, skey


def verify_captcha_ticket(*, ticket: str, randstr: str, user_ip: str) -> None:
    """校验通过则返回；失败抛 ValueError。"""
    if not captcha_configured():
        raise ValueError("人机验证未配置，请联系管理员")
    ticket = (ticket or "").strip()
    randstr = (randstr or "").strip()
    if not ticket or not randstr:
        raise ValueError("请先完成人机验证")

    secret_id, secret_key = api_keys()
    if not secret_id or not secret_key:
        raise ValueError("腾讯云 API 密钥未配置（TENCENT_SECRET_ID 或 COS_SECRET_ID）")

    try:
        app_id = int(str(settings.tencent_captcha_app_id).strip())
    except ValueError as e:
        raise ValueError("CaptchaAppId 配置无效") from e

    payload = {
        "CaptchaType": 9,
        "Ticket": ticket,
        "UserIp": (user_ip or "127.0.0.1").split(",")[0].strip() or "127.0.0.1",
        "Randstr": randstr,
        "CaptchaAppId": app_id,
        "AppSecretKey": str(settings.tencent_captcha_app_secret_key).strip(),
    }
    try:
        resp = tc3_json_request(
            secret_id=secret_id,
            secret_key=secret_key,
            service="captcha",
            host="captcha.tencentcloudapi.com",
            action="DescribeCaptchaResult",
            version="2019-07-22",
            payload=payload,
        )
    except RuntimeError as e:
        logger.warning("captcha api failed: %s", e)
        raise ValueError("人机验证服务暂不可用，请稍后重试") from e

    # 官方：CaptchaCode == 1 表示验证通过
    code = resp.get("CaptchaCode")
    try:
        ok = int(code) == 1
    except (TypeError, ValueError):
        ok = str(code).upper() in ("1", "OK")
    if not ok:
        msg = str(resp.get("CaptchaMsg") or "验证未通过")
        logger.info("captcha reject code=%s msg=%s", code, msg)
        raise ValueError("人机验证未通过，请重试")
