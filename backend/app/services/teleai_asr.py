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

ASR_SAMPLE_RATE = 16000


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
        self._ready = asyncio.Event()
        self._session_active = False
        self._stream_ended = False
        self._op_lock = asyncio.Lock()

    def set_hotwords(self, hotwords: list[str]) -> None:
        self._hotwords = hotwords[:20]

    def _build_start_option(self) -> dict[str, Any]:
        option: dict[str, Any] = {
            "sample_rate": ASR_SAMPLE_RATE,
            "enable_punctuation": True,
            "enable_inverse_text_normalization": True,
            "enable_emendation": True,
            "max_end_silence": 500,
        }
        if self._hotwords:
            option["hotwords"] = self._hotwords
        return option

    async def connect(self) -> None:
        async with self._op_lock:
            await self._connect_unlocked()

    async def _connect_unlocked(self) -> None:
        """connect 核心逻辑；调用方需已持有 _op_lock。"""
        self._ready.clear()
        self._stream_ended = False
        headers = build_ws_headers(self._path)
        # 电信网关部分环境不支持 WebSocket ping，会触发 1002 protocol error
        self._ws = await websockets.connect(
            ws_url(self._path),
            additional_headers=headers,
            ping_interval=None,
            ping_timeout=None,
            open_timeout=15,
            close_timeout=5,
        )
        self._reader_task = asyncio.create_task(self._read_loop())
        self._session_active = True
        await self._send({
            "option": self._build_start_option(),
            "req_id": self._req_id,
            "rec_status": 0,
        })
        try:
            await asyncio.wait_for(self._ready.wait(), timeout=15)
        except asyncio.TimeoutError:
            await self._shutdown_ws()
            raise RuntimeError("ASR session start timeout (no res_status=0)")

    async def _end_stream(self) -> None:
        if not self._ws or not self._session_active or self._stream_ended:
            return
        await self._send({"rec_status": 2})
        self._stream_ended = True

    async def _shutdown_ws(self) -> None:
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
            self._reader_task = None
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        self._session_active = False
        self._stream_ended = False

    async def _drain_events(self) -> None:
        while not self._events.empty():
            try:
                self._events.get_nowait()
            except asyncio.QueueEmpty:
                break

    async def close(self) -> None:
        async with self._op_lock:
            try:
                await self._end_stream()
                if self._session_active:
                    await asyncio.sleep(0.1)
            except Exception:
                pass
            await self._shutdown_ws()
        await self._drain_events()
        await self._events.put(None)

    async def reconnect(self) -> None:
        async with self._op_lock:
            try:
                await self._end_stream()
                if self._session_active:
                    await asyncio.sleep(0.05)
            except Exception:
                pass
            await self._shutdown_ws()
            await self._drain_events()
            self._req_id = f"sess-{uuid.uuid4().hex[:12]}"
            self._ready = asyncio.Event()
            await self._connect_unlocked()

    async def send_audio(self, pcm_bytes: bytes, *, pace: bool = False) -> None:
        """发送 PCM 音频帧。实时麦克风场景 pace=False；文件回放自检可 pace=True。"""
        if not pcm_bytes:
            return
        async with self._op_lock:
            if not self._ws:
                return
            self._stream_ended = False
            await self._send({
                "rec_status": 1,
                "audio_stream": base64.b64encode(pcm_bytes).decode("ascii"),
            })
        if pace:
            duration_s = len(pcm_bytes) / 2 / ASR_SAMPLE_RATE
            if duration_s > 0:
                await asyncio.sleep(duration_s)

    async def end_utterance(self) -> None:
        async with self._op_lock:
            await self._end_stream()

    async def events(self) -> AsyncIterator[AsrEvent]:
        while True:
            event = await self._events.get()
            if event is None:
                break
            yield event

    @staticmethod
    def is_transient_error(event: AsrEvent) -> bool:
        if event.res_status != -1:
            return False
        msg = (event.message or "").lower()
        transient_markers = (
            "timeout",
            "timed out",
            "connection",
            "closed",
            "reset",
            "1002",
            "1011",
            "1006",
            "protocol error",
            "temporarily",
            "10007",
            "non-real-time",
        )
        return any(m in msg for m in transient_markers)

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

                if res_status == 0:
                    self._ready.set()

                await self._events.put(AsrEvent(res_status=res_status, text=text, lang=lang, code=code))
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await self._events.put(AsrEvent(res_status=-1, message=str(exc)))
