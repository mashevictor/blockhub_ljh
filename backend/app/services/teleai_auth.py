from __future__ import annotations

import hashlib
import hmac
import time
import urllib.parse

from app.core.config import settings

ORIGIN_NAME = "teleai-cloud-auth-v1"
SIGNED_HEADERS = "x-app-id"


def teleai_configured() -> bool:
    return bool(settings.teleai_app_id and settings.teleai_app_key)


def _normalize(segment: str, *, encoding_slash: bool = False) -> str:
    safe = "~()*!'" if encoding_slash else "~()*!'"
    return urllib.parse.quote(segment, safe=safe)


def _canonical_uri(path: str) -> str:
    segments = [seg for seg in path.split("/") if seg != ""]
    if not segments:
        return "/"
    return "/" + "/".join(_normalize(seg, encoding_slash=False) for seg in segments)


def _canonical_headers(app_id: str) -> tuple[str, str]:
    headers = {"x-app-id": app_id.strip()}
    canonical = "\n".join(f"{k}:{urllib.parse.quote(v.strip(), safe='')}" for k, v in sorted(headers.items()))
    return canonical, SIGNED_HEADERS


def build_authorization(
    *,
    method: str,
    path: str,
    query_string: str = "",
    timestamp: int | None = None,
) -> str:
    if not teleai_configured():
        raise RuntimeError("TELEAI_APP_ID / TELEAI_APP_KEY 未配置")

    ts = str(timestamp or int(time.time()))
    expire = str(settings.teleai_auth_expire_seconds)
    prefix = f"{ORIGIN_NAME}/{settings.teleai_app_id}/{settings.teleai_region}/{ts}/{expire}"

    signing_key = hmac.new(
        settings.teleai_app_key.encode("utf-8"),
        prefix.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    canonical_headers, signed_headers = _canonical_headers(settings.teleai_app_id)
    canonical_request = "\n".join([
        method.upper(),
        _canonical_uri(path),
        query_string,
        canonical_headers,
    ])

    signature = hmac.new(
        signing_key.encode("utf-8"),
        canonical_request.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"{prefix}/{signed_headers}/{signature}"


def build_ws_headers(path: str, *, query_string: str = "") -> dict[str, str]:
    """天翼AI开放平台 WebSocket 握手头（文档仅要求 X-APP-ID + Authorization）。"""
    authorization = build_authorization(method="GET", path=path, query_string=query_string)
    return {
        "X-APP-ID": settings.teleai_app_id,
        "Authorization": authorization,
    }


def ws_url(path: str) -> str:
    return f"wss://{settings.teleai_host}:443{path}"
