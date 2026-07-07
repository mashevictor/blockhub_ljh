from __future__ import annotations

import asyncio
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
class AsrEvent:
    res_status: int
    text: str = ""
    lang: str = ""
    code: int = 0
    message: str = ""


class TeleAsrClient:
    def __init__(self, *, hotwords: list[str] | None = None) -> None:
        self._path = settings.teleai_asr_path
        self._hotwords = hotwords or []
        self._ws: Any = None
        self._req_id = f"sess-{uuid.uuid4().hex[:12]}"
        self._events: asyncio.Queue[AsrEvent | None] = asyncio.Queue()
        self._reader_task: asyncio.Task[None] | None = None

    async def connect(self) -> None:
        headers = build_ws_headers(self._path)
        self._ws = await websockets.connect(
            ws_url(self._path),
            additional_headers=headers,
            ping_interval=20,
            ping_timeout=20,
            open_timeout=15,
        )
        self._reader_task = asyncio.create_task(self._read_loop())
        await self._send({
            "option": {
                "sample_rate": 16000,
                "enable_punctuation": True,
                "enable_inverse_text_normalization": True,
                "enable_emendation": True,
                "format": "pcm",
                "hotwords": self._hotwords,
            },
            "req_id": self._req_id,
            "rec_status": 0,
        })

    async def close(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
        if self._ws:
            await self._ws.close()
        await self._events.put(None)

    async def send_audio(self, pcm_bytes: bytes) -> None:
        if not self._ws:
            return
        await self._send({
            "req_id": self._req_id,
            "rec_status": 1,
            "audio_stream": base64.b64encode(pcm_bytes).decode("ascii"),
        })

    async def end_utterance(self) -> None:
        if not self._ws:
            return
        await self._send({"req_id": self._req_id, "rec_status": 2})

    async def events(self) -> AsyncIterator[AsrEvent]:
        while True:
            event = await self._events.get()
            if event is None:
                break
            yield event

    async def _send(self, payload: dict[str, Any]) -> None:
        if self._ws:
            await self._ws.send(json.dumps(payload, ensure_ascii=False))

    async def _read_loop(self) -> None:
        assert self._ws is not None
        try:
            async for raw in self._ws:
                data = json.loads(raw)
                code = int(data.get("code", 0))
                if code != 10000:
                    await self._events.put(AsrEvent(
                        res_status=-1,
                        code=code,
                        message=str(data.get("message") or data.get("msg") or "ASR error"),
                    ))
                    continue

                res_status = int(data.get("res_status", -1))
                text = ""
                lang = ""
                results = (data.get("data") or {}).get("results") or []
                if results:
                    text = str(results[0].get("text") or "")
                    lang = str(results[0].get("lang") or "")

                await self._events.put(AsrEvent(res_status=res_status, text=text, lang=lang, code=code))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self._events.put(AsrEvent(res_status=-1, message=str(exc)))
