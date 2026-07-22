# -*- coding: utf-8 -*-
"""腾讯云 API TC3-HMAC-SHA256 最小客户端（验证码 / 短信）。"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def tc3_json_request(
    *,
    secret_id: str,
    secret_key: str,
    service: str,
    host: str,
    action: str,
    version: str,
    payload: dict[str, Any],
    region: str = "",
    timeout: int = 15,
) -> dict[str, Any]:
    if not secret_id or not secret_key:
        raise RuntimeError("腾讯云 SecretId/SecretKey 未配置")

    method = "POST"
    ct = "application/json; charset=utf-8"
    canonical_uri = "/"
    canonical_query = ""
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    payload_hash = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
    canonical_headers = f"content-type:{ct}\nhost:{host}\n"
    signed_headers = "content-type;host"
    canonical_request = (
        f"{method}\n{canonical_uri}\n{canonical_query}\n"
        f"{canonical_headers}\n{signed_headers}\n{payload_hash}"
    )

    now = datetime.now(timezone.utc)
    timestamp = str(int(time.time()))
    date = now.strftime("%Y-%m-%d")
    credential_scope = f"{date}/{service}/tc3_request"
    string_to_sign = (
        "TC3-HMAC-SHA256\n"
        f"{timestamp}\n"
        f"{credential_scope}\n"
        f"{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
    )

    secret_date = _sign(("TC3" + secret_key).encode("utf-8"), date)
    secret_service = _sign(secret_date, service)
    secret_signing = _sign(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    authorization = (
        "TC3-HMAC-SHA256 "
        f"Credential={secret_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    headers = {
        "Authorization": authorization,
        "Content-Type": ct,
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Timestamp": timestamp,
        "X-TC-Version": version,
    }
    if region:
        headers["X-TC-Region"] = region

    req = urllib.request.Request(
        f"https://{host}",
        data=payload_json.encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8") or "{}"
            data = json.loads(raw)
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError(f"腾讯云 API HTTP {e.code}: {err}") from e

    if not isinstance(data, dict):
        raise RuntimeError("腾讯云 API 响应异常")
    resp_obj = data.get("Response") or {}
    if isinstance(resp_obj, dict) and resp_obj.get("Error"):
        err = resp_obj["Error"]
        raise RuntimeError(f"腾讯云 API 错误 {err.get('Code')}: {err.get('Message')}")
    return resp_obj if isinstance(resp_obj, dict) else {}
