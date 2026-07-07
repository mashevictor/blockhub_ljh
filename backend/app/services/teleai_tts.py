from __future__ import annotations

import base64
import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import websockets

from app.core.config import settings
from app.services.teleai_auth import build_ws_headers, ws_url


@dataclass
class TtsChunk:
    audio_b64: str
    is_end: bool = False


class TeleTtsClient:
    def __init__(self) -> None:
        self._path = settings.teleai_tts_path
        self._dialect = settings.teleai_tts_dialect

    async def synthesize_stream(self, text: str) -> AsyncIterator[TtsChunk]:
        headers = build_ws_headers(self._path)
        req_id = f"tts-{uuid.uuid4().hex[:12]}"
        payload: dict[str, Any] = {
            "req_id": req_id,
            "text": text[:500],
            "format": "PCM",
            "sample_rate": 24000,
            "speech_rate": 1.0,
            "volume": 50,
        }
        if self._dialect:
            payload["dialect"] = self._dialect

        async with websockets.connect(
            ws_url(self._path),
            additional_headers=headers,
            ping_interval=20,
            ping_timeout=20,
            open_timeout=15,
        ) as ws:
            await ws.send(json.dumps(payload, ensure_ascii=False))
            async for raw in ws:
                data = json.loads(raw)
                code = int(data.get("code", 0))
                if code != 10000:
                    raise RuntimeError(str(data.get("message") or data.get("msg") or f"TTS error {code}"))

                result = data.get("result") or {}
                audio = str(result.get("audio") or "")
                is_end = bool(result.get("is_end"))
                if audio or is_end:
                    yield TtsChunk(audio_b64=audio, is_end=is_end)
                if is_end:
                    break
