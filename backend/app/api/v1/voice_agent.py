from __future__ import annotations

import asyncio
import base64
import logging
from enum import Enum

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.config import settings
from app.services.teleai_asr import TeleAsrClient
from app.services.teleai_auth import build_authorization, teleai_configured, ws_url
from app.services.teleai_tts import TeleTtsClient
from app.services.voice_orchestrator import build_shanghai_messages, stream_sentences
from app.services.voice_prompts import DEFAULT_HOTWORDS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


class SessionState(str, Enum):
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"


class VoiceStatusResponse(BaseModel):
    configured: bool
    host: str
    region: str
    asr_path: str
    tts_path: str
    ws_endpoint: str


class VoiceClientConfig(BaseModel):
    agent_id: str
    ws_url: str
    ws_path: str
    capture_sample_rate: int
    playback_sample_rate: int
    frame_ms: int
    dialect: str
    configured: bool


@router.get("/config", response_model=VoiceClientConfig)
def voice_client_config(request: Request) -> VoiceClientConfig:
    ws_path = f"{settings.api_prefix}/voice/shanghai-agent"
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    scheme = "wss" if forwarded_proto == "https" else "ws"
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "127.0.0.1:8001"
    return VoiceClientConfig(
        agent_id="shanghai_voice",
        ws_url=f"{scheme}://{host}{ws_path}",
        ws_path=ws_path,
        capture_sample_rate=16000,
        playback_sample_rate=24000,
        frame_ms=200,
        dialect=settings.teleai_tts_dialect,
        configured=teleai_configured(),
    )


@router.get("/status", response_model=VoiceStatusResponse)
def voice_status() -> VoiceStatusResponse:
    return VoiceStatusResponse(
        configured=teleai_configured(),
        host=settings.teleai_host,
        region=settings.teleai_region,
        asr_path=settings.teleai_asr_path,
        tts_path=settings.teleai_tts_path,
        ws_endpoint=f"{settings.api_prefix}/voice/shanghai-agent",
    )


@router.get("/auth-probe")
async def voice_auth_probe() -> dict:
    """验证签名与电信 WebSocket 握手。"""
    if not teleai_configured():
        return {"ok": False, "detail": "TELEAI_APP_ID / TELEAI_APP_KEY 未配置"}
    try:
        import websockets

        auth = build_authorization(method="GET", path=settings.teleai_asr_path)
        asr_url = ws_url(settings.teleai_asr_path)
        headers = {
            "X-APP-ID": settings.teleai_app_id,
            "Authorization": auth,
        }
        async with websockets.connect(asr_url, additional_headers=headers, open_timeout=15):
            handshake_ok = True
        return {
            "ok": True,
            "host": settings.teleai_host,
            "asr_url": asr_url,
            "handshake_ok": handshake_ok,
            "authorization_prefix": auth.split("/")[0:5],
            "authorization_length": len(auth),
        }
    except Exception as exc:
        return {
            "ok": False,
            "host": settings.teleai_host,
            "asr_url": ws_url(settings.teleai_asr_path),
            "detail": str(exc),
        }


@router.websocket("/shanghai-agent")
async def shanghai_voice_agent(ws: WebSocket, session_id: str = "default") -> None:
    await ws.accept()

    if not teleai_configured():
        await ws.send_json({"type": "error", "code": "NOT_CONFIGURED", "message": "电信星辰密钥未配置"})
        await ws.close()
        return

    state = SessionState.IDLE
    hotwords = list(DEFAULT_HOTWORDS)
    history: list[dict[str, str]] = []
    llm_task: asyncio.Task[None] | None = None
    asr = TeleAsrClient(hotwords=hotwords)
    tts = TeleTtsClient()

    async def set_state(next_state: SessionState) -> None:
        nonlocal state
        state = next_state
        await ws.send_json({"type": "state", "state": state.value})

    async def cancel_llm() -> None:
        nonlocal llm_task
        if llm_task and not llm_task.done():
            llm_task.cancel()
            try:
                await llm_task
            except asyncio.CancelledError:
                pass
        llm_task = None

    async def run_llm_and_tts(user_text: str) -> None:
        await set_state(SessionState.THINKING)
        messages = build_shanghai_messages(user_text, history)
        history.append({"role": "user", "content": user_text})
        reply_parts: list[str] = []

        try:
            async for sentence in stream_sentences(messages):
                if state == SessionState.LISTENING:
                    return
                reply_parts.append(sentence)
                await ws.send_json({"type": "llm_delta", "text": sentence})
                await set_state(SessionState.SPEAKING)
                async for chunk in tts.synthesize_stream(sentence):
                    if state == SessionState.LISTENING:
                        return
                    if chunk.audio_b64:
                        await ws.send_json({
                            "type": "tts_audio",
                            "data": chunk.audio_b64,
                            "is_end": chunk.is_end,
                        })
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("LLM/TTS pipeline failed")
            msg = str(exc)
            # TTS 在电信网关被按 AppID 拒权(1002)或返回非 10000 时，给出可读提示，
            # 文字回复已经通过 llm_delta 展示，不阻断对话。
            if "tts" in msg.lower() or "1002" in msg or "10000" in msg:
                user_msg = "语音合成(TTS)暂不可用，已为你显示文字回复（待开通 TTS 能力）。"
            else:
                user_msg = f"语音处理出错：{msg}"
            await ws.send_json({"type": "error", "code": "PIPELINE", "message": user_msg})
            return

        if reply_parts:
            history.append({"role": "assistant", "content": "".join(reply_parts)})
        await set_state(SessionState.IDLE)

    async def pump_asr() -> None:
        nonlocal llm_task
        try:
            async for event in asr.events():
                if event.res_status == 0:
                    continue
                if event.res_status == -1:
                    await ws.send_json({
                        "type": "error",
                        "code": str(event.code or "ASR"),
                        "message": event.message or "ASR 错误",
                    })
                    continue

                if event.res_status == 2 and event.text:
                    await ws.send_json({"type": "asr_partial", "text": event.text})

                if event.res_status in (3, 4) and event.text:
                    await ws.send_json({
                        "type": "asr_final",
                        "text": event.text,
                        "lang": event.lang,
                    })
                    await cancel_llm()
                    llm_task = asyncio.create_task(run_llm_and_tts(event.text))
        except asyncio.CancelledError:
            raise

    async def receive_browser_audio() -> None:
        nonlocal hotwords, llm_task
        while True:
            msg = await ws.receive_json()
            msg_type = msg.get("type")

            if msg_type == "audio":
                pcm_b64 = msg.get("data") or ""
                if pcm_b64:
                    if state in (SessionState.IDLE, SessionState.SPEAKING):
                        await set_state(SessionState.LISTENING)
                    await asr.send_audio(base64.b64decode(pcm_b64))

            elif msg_type == "utterance_end":
                await asr.end_utterance()

            elif msg_type == "barge_in":
                await cancel_llm()
                await set_state(SessionState.LISTENING)

            elif msg_type == "config":
                words = msg.get("hotwords")
                if isinstance(words, list):
                    hotwords = [str(w) for w in words if w]

    try:
        await asr.connect()
        await set_state(SessionState.IDLE)
        await ws.send_json({"type": "ready", "session_id": session_id})
        await asyncio.gather(pump_asr(), receive_browser_audio())
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception("Voice session failed")
        try:
            await ws.send_json({"type": "error", "code": "SESSION", "message": str(exc)})
        except Exception:
            pass
    finally:
        await cancel_llm()
        await asr.close()
