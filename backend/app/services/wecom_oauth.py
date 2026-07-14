"""企业微信 OAuth2 扫码登录骨架（P4-I2）。"""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.core.config import settings


def wecom_configured() -> bool:
    return bool(settings.wecom_corp_id.strip() and settings.wecom_secret.strip() and settings.wecom_agent_id.strip())


def redirect_uri() -> str:
    if settings.wecom_oauth_redirect_uri.strip():
        return settings.wecom_oauth_redirect_uri.strip()
    base = settings.public_base_url.rstrip("/")
    return f"{base}/api/v1/auth/oauth/wecom/callback"


def build_authorize_url(*, state: str = "blockhub") -> str:
    params = {
        "appid": settings.wecom_corp_id.strip(),
        "redirect_uri": redirect_uri(),
        "response_type": "code",
        "scope": "snsapi_base",
        "state": state,
        "agentid": settings.wecom_agent_id.strip(),
    }
    return "https://open.weixin.qq.com/connect/oauth2/authorize?" + urlencode(params) + "#wechat_redirect"


def _http_get_json(url: str) -> dict[str, Any]:
    req = Request(url, method="GET")
    try:
        with urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return json.loads(raw) if raw else {}
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"wecom_http_{exc.code}:{body[:200]}") from exc
    except URLError as exc:
        raise RuntimeError(f"wecom_network:{exc.reason}") from exc


def exchange_code_for_userid(code: str) -> dict[str, Any]:
    """code → userid（需有效 corp 凭证）。"""
    token_url = (
        "https://qyapi.weixin.qq.com/cgi-bin/gettoken?"
        + urlencode({"corpid": settings.wecom_corp_id.strip(), "corpsecret": settings.wecom_secret.strip()})
    )
    token_data = _http_get_json(token_url)
    if token_data.get("errcode") not in (0, None) and not token_data.get("access_token"):
        raise RuntimeError(f"wecom_token_error:{token_data}")
    access_token = token_data["access_token"]
    user_url = (
        "https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?"
        + urlencode({"access_token": access_token, "code": code})
    )
    user_data = _http_get_json(user_url)
    if user_data.get("errcode") not in (0, None) and not (user_data.get("UserId") or user_data.get("userid")):
        raise RuntimeError(f"wecom_userinfo_error:{user_data}")
    userid = str(user_data.get("UserId") or user_data.get("userid") or "")
    if not userid:
        raise RuntimeError("wecom_missing_userid")
    return {"userid": userid, "raw": user_data}
