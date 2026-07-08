"""一次性脚本：验证电信星辰 AppID/AppKey 是否能连上 ASR/TTS WebSocket。"""
from __future__ import annotations

import asyncio
import json

import websockets
from websockets.asyncio.client import connect

from app.core.config import settings
from app.services.teleai_auth import build_authorization, build_ws_headers, teleai_configured, ws_url


def _parse_error_body(body: bytes | bytearray | None) -> dict | str:
    if not body:
        return ""
    text = bytes(body).decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


async def probe(name: str, path: str, region: str | None = None) -> dict:
    old_region = settings.teleai_region
    if region:
        settings.teleai_region = region

    url = ws_url(path)
    headers = build_ws_headers(path)
    auth = headers["Authorization"]
    auth_parts = auth.split("/")

    result = {
        "name": name,
        "path": path,
        "region": settings.teleai_region,
        "app_id": settings.teleai_app_id,
        "app_key_len": len(settings.teleai_app_key),
        "x_app_id_matches": headers.get("X-APP-ID") == settings.teleai_app_id,
        "auth_app_id_matches": len(auth_parts) > 1 and auth_parts[1] == settings.teleai_app_id,
        "signature_len": len(auth_parts[-1]) if auth_parts else 0,
    }

    try:
        async with connect(url, additional_headers=headers, open_timeout=20):
            result["ok"] = True
            result["detail"] = "websocket_connected"
    except websockets.exceptions.InvalidStatus as exc:
        resp = exc.response
        parsed = _parse_error_body(getattr(resp, "body", None))
        result["ok"] = False
        result["http_status"] = resp.status_code
        result["response"] = parsed
        if isinstance(parsed, dict):
            result["teleai_code"] = parsed.get("code")
            result["teleai_message"] = parsed.get("message")
            result["trace_id"] = parsed.get("traceId")
    except Exception as exc:
        result["ok"] = False
        result["detail"] = f"{type(exc).__name__}: {exc}"
    finally:
        settings.teleai_region = old_region

    return result


async def main() -> None:
    print("=== Credential check ===")
    print("configured:", teleai_configured())
    print("app_id:", settings.teleai_app_id)
    print("app_key_len:", len(settings.teleai_app_key))
    try:
        sample_auth = build_authorization(method="GET", path=settings.teleai_asr_path)
        print("local_signature_ok:", len(sample_auth) > 100)
    except Exception as exc:
        print("local_signature_ok:", False, exc)

    print("\n=== Telecom cloud probe ===")
    jobs = [
        ("ASR", settings.teleai_asr_path, "SH"),
        ("TTS", settings.teleai_tts_path, "SH"),
        ("ASR", settings.teleai_asr_path, "QG"),
    ]
    for name, path, region in jobs:
        result = await probe(name, path, region)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print("---")


if __name__ == "__main__":
    asyncio.run(main())
