"""按天翼AI开放平台文档测试 openapi.teleagi.cn。"""
from __future__ import annotations

import asyncio
import json

import websockets

from app.core.config import settings
from app.services.teleai_auth import build_authorization


def _headers(path: str) -> dict[str, str]:
    return {
        "X-APP-ID": settings.teleai_app_id,
        "Authorization": build_authorization(method="GET", path=path),
    }


async def test_connect(name: str, path: str) -> dict:
    url = f"wss://{settings.teleai_host}:443{path}"
    try:
        async with websockets.connect(url, additional_headers=_headers(path), open_timeout=20):
            return {"name": name, "ok": True, "stage": "handshake"}
    except Exception as exc:
        return {"name": name, "ok": False, "stage": "handshake", "error": str(exc)}


async def test_asr_start() -> dict:
    path = settings.teleai_asr_path
    url = f"wss://{settings.teleai_host}:443{path}"
    try:
        async with websockets.connect(url, additional_headers=_headers(path), open_timeout=20) as ws:
            await ws.send(json.dumps({
                "option": {
                    "sample_rate": 16000,
                    "enable_punctuation": True,
                    "enable_inverse_text_normalization": True,
                    "enable_emendation": True,
                },
                "req_id": "doc-test-asr-001",
                "rec_status": 0,
            }))
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(raw)
            return {
                "name": "ASR_START",
                "ok": data.get("code") == 10000,
                "stage": "start",
                "response": data,
            }
    except Exception as exc:
        return {"name": "ASR_START", "ok": False, "stage": "start", "error": str(exc)}


async def test_tts_synth() -> dict:
    path = settings.teleai_tts_path
    url = f"wss://{settings.teleai_host}:443{path}"
    try:
        async with websockets.connect(url, additional_headers=_headers(path), open_timeout=20) as ws:
            await ws.send(json.dumps({
                "req_id": "doc-test-tts-001",
                "text": "侬好，测试一下。",
                "format": "PCM",
                "sample_rate": 24000,
                "speech_rate": 1.0,
                "volume": 50,
            }))
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(raw)
            return {
                "name": "TTS_SYNTH",
                "ok": data.get("code") == 10000,
                "stage": "synth",
                "response": {k: (v[:80] + "...") if k == "result" and isinstance(v, dict) else v for k, v in data.items()},
            }
    except Exception as exc:
        return {"name": "TTS_SYNTH", "ok": False, "stage": "synth", "error": str(exc)}


async def main() -> None:
    settings.teleai_host = "openapi.teleagi.cn"
    print("host:", settings.teleai_host)
    print("app_id:", settings.teleai_app_id)
    for coro in (
        test_connect("ASR", settings.teleai_asr_path),
        test_connect("TTS", settings.teleai_tts_path),
        test_asr_start(),
        test_tts_synth(),
    ):
        print(json.dumps(await coro, ensure_ascii=False, indent=2))
        print("---")


if __name__ == "__main__":
    asyncio.run(main())
