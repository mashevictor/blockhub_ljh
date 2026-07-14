from __future__ import annotations

import asyncio
import base64
import logging
from enum import Enum

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.teleai_asr import TeleAsrClient
from app.services.teleai_auth import build_authorization, teleai_configured, ws_url
from app.services.teleai_tts import TeleTtsClient
from app.services.voice_demo import SHANGHAI_DEMO_SAMPLES, SHANGHAI_GREETING, pick_shanghai_fallback
from app.services.voice_orchestrator import build_shanghai_messages, iter_llm_stream
from app.services.llm_gateway import llm_configured
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
    llm_provider: str = "deepseek"
    greeting: str = SHANGHAI_GREETING
    demo_samples: list[dict[str, str]] = Field(default_factory=list)


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
        llm_provider="deepseek" if settings.deepseek_api_key else "llm",
        greeting=SHANGHAI_GREETING,
        demo_samples=list(SHANGHAI_DEMO_SAMPLES),
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
    """验证签名 + ASR 会话启动（option/rec_status=0）。"""
    if not teleai_configured():
        return {"ok": False, "detail": "TELEAI_APP_ID / TELEAI_APP_KEY 未配置"}
    try:
        import json
        import uuid

        import websockets

        auth = build_authorization(method="GET", path=settings.teleai_asr_path)
        asr_url = ws_url(settings.teleai_asr_path)
        headers = {
            "X-APP-ID": settings.teleai_app_id,
            "Authorization": auth,
        }
        async with websockets.connect(
            asr_url,
            additional_headers=headers,
            ping_interval=None,
            ping_timeout=None,
            open_timeout=15,
        ) as ws:
            await ws.send(json.dumps({
                "option": {
                    "sample_rate": 16000,
                    "enable_punctuation": True,
                    "enable_inverse_text_normalization": True,
                    "enable_emendation": True,
                    "max_end_silence": 500,
                },
                "req_id": f"probe-{uuid.uuid4().hex[:8]}",
                "rec_status": 0,
            }, ensure_ascii=False))
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            data = json.loads(raw)
            started = int(data.get("code", 0)) == 10000
            return {
                "ok": started,
                "host": settings.teleai_host,
                "asr_url": asr_url,
                "handshake_ok": True,
                "asr_start_ok": started,
                "asr_start_response": data,
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
    asr_final_sent = False
    asr_reconnect_task: asyncio.Task[None] | None = None
    asr_ready = asyncio.Event()
    asr_ready.set()
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

    async def speak_reply(sentence: str) -> None:
        text = sentence.strip()
        if not text:
            return
        await set_state(SessionState.SPEAKING)
        got_audio = False
        for attempt in range(2):
            try:
                async for chunk in tts.synthesize_stream(text):
                    if state == SessionState.LISTENING:
                        return
                    if chunk.audio_b64:
                        got_audio = True
                        await ws.send_json({
                            "type": "tts_audio",
                            "data": chunk.audio_b64,
                            "is_end": chunk.is_end,
                        })
                    if chunk.is_end:
                        if not chunk.audio_b64:
                            await ws.send_json({"type": "tts_audio", "data": "", "is_end": True})
                        return
                if got_audio:
                    await ws.send_json({"type": "tts_audio", "data": "", "is_end": True})
                    return
            except Exception as exc:
                logger.warning("TTS attempt %s failed for %r: %s", attempt + 1, text[:40], exc)
                if attempt >= 1:
                    await ws.send_json({
                        "type": "error",
                        "code": "TTS",
                        "message": "语音合成暂不可用，已显示文字回复",
                    })
                    await ws.send_json({"type": "tts_audio", "data": "", "is_end": True})
                    return
                await asyncio.sleep(0.35)

    async def run_llm_and_tts(user_text: str) -> None:
        await set_state(SessionState.THINKING)
        messages = build_shanghai_messages(user_text, history)
        history.append({"role": "user", "content": user_text})
        reply_parts: list[str] = []

        try:
            if not llm_configured():
                reply = pick_shanghai_fallback(user_text)
                reply_parts.append(reply)
                await ws.send_json({"type": "llm_delta", "text": reply})
                await speak_reply(reply)
            else:
                for event in iter_llm_stream(messages):
                    if state == SessionState.LISTENING:
                        return
                    if event.delta:
                        await ws.send_json({"type": "llm_delta", "text": event.delta})
                    if event.sentence:
                        reply_parts.append(event.sentence)
                        await speak_reply(event.sentence)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("LLM/TTS pipeline failed")
            msg = str(exc)
            if "tts" in msg.lower() or "1002" in msg or "10000" in msg:
                user_msg = "语音合成(TTS)暂不可用，已为你显示文字回复（待开通 TTS 能力）。"
            else:
                user_msg = f"语音处理出错：{msg}"
            await ws.send_json({"type": "error", "code": "PIPELINE", "message": user_msg})
            await ws.send_json({"type": "tts_audio", "data": "", "is_end": True})
            return

        if reply_parts:
            history.append({"role": "assistant", "content": "".join(reply_parts)})
        await set_state(SessionState.IDLE)

    async def prepare_next_asr_turn() -> None:
        nonlocal asr_reconnect_task, asr_final_sent
        asr_ready.clear()
        try:
            await asr.reconnect()
            asr_final_sent = False
        except Exception as exc:
            logger.warning("ASR prepare next turn failed: %s", exc)
        finally:
            asr_ready.set()

    async def schedule_asr_reconnect() -> None:
        nonlocal asr_reconnect_task
        if asr_reconnect_task and not asr_reconnect_task.done():
            return
        asr_reconnect_task = asyncio.create_task(prepare_next_asr_turn())

    async def pump_asr() -> None:
        nonlocal llm_task, asr_final_sent
        try:
            async for event in asr.events():
                if event.res_status == 0:
                    continue
                if event.res_status == -1:
                    if event.code in (10007, 10005, 10002) or TeleAsrClient.is_transient_error(event):
                        try:
                            await asr.reconnect()
                            asr_final_sent = False
                            continue
                        except Exception as exc:
                            logger.warning("ASR reconnect failed: %s", exc)
                    await ws.send_json({
                        "type": "error",
                        "code": str(event.code or "ASR"),
                        "message": event.message or "ASR 错误",
                    })
                    continue

                if event.res_status == 1:
                    await ws.send_json({"type": "asr_speech_start"})

                if event.res_status == 2 and event.text:
                    await ws.send_json({"type": "asr_partial", "text": event.text})

                if event.res_status in (3, 4) and event.text and not asr_final_sent:
                    asr_final_sent = True
                    await ws.send_json({
                        "type": "asr_final",
                        "text": event.text,
                        "lang": event.lang or "wuu",
                        "dialect": "shanghai",
                    })
                    await cancel_llm()
                    llm_task = asyncio.create_task(run_llm_and_tts(event.text))

                if event.res_status == 4:
                    await schedule_asr_reconnect()
        except asyncio.CancelledError:
            raise

    async def receive_browser_audio() -> None:
        nonlocal hotwords, llm_task, asr_final_sent
        while True:
            msg = await ws.receive_json()
            msg_type = msg.get("type")

            if msg_type == "audio":
                pcm_b64 = msg.get("data") or ""
                if pcm_b64:
                    await asr_ready.wait()
                    if state in (SessionState.IDLE, SessionState.SPEAKING):
                        await set_state(SessionState.LISTENING)
                    asr_final_sent = False
                    await asr.send_audio(base64.b64decode(pcm_b64))

            elif msg_type == "utterance_end":
                await asr_ready.wait()
                await asr.end_utterance()

            elif msg_type == "barge_in":
                await cancel_llm()
                await set_state(SessionState.LISTENING)

            elif msg_type in ("simulate", "text"):
                # text = 客户端打字输入；simulate = 例句。均跳过 ASR，走真实 LLM + TTS
                user_text = str(msg.get("text") or "").strip()
                if not user_text:
                    continue
                await ws.send_json({
                    "type": "asr_final",
                    "text": user_text,
                    "lang": "wuu",
                    "dialect": "shanghai",
                    "via": "text" if msg_type == "text" else "simulate",
                })
                await cancel_llm()
                llm_task = asyncio.create_task(run_llm_and_tts(user_text))

            elif msg_type == "config":
                words = msg.get("hotwords")
                if isinstance(words, list):
                    hotwords = [str(w) for w in words if w]
                    asr.set_hotwords(hotwords)
                    await schedule_asr_reconnect()

    try:
        for attempt in range(3):
            try:
                await asr.connect()
                break
            except Exception as exc:
                if attempt >= 2:
                    raise
                logger.warning("ASR connect retry %s: %s", attempt + 1, exc)
                await asyncio.sleep(0.5 * (attempt + 1))
        await set_state(SessionState.IDLE)
        await ws.send_json({
            "type": "ready",
            "session_id": session_id,
            "greeting": SHANGHAI_GREETING,
            "demo_samples": SHANGHAI_DEMO_SAMPLES,
        })

        async def play_welcome() -> None:
            await ws.send_json({"type": "assistant_message", "text": SHANGHAI_GREETING})
            try:
                await speak_reply(SHANGHAI_GREETING)
            except Exception as exc:
                logger.warning("Welcome TTS failed: %s", exc)
                await ws.send_json({
                    "type": "error",
                    "code": "TTS",
                    "message": "欢迎语语音播报失败，文字已显示",
                })
                await ws.send_json({"type": "tts_audio", "data": "", "is_end": True})
            if state != SessionState.LISTENING:
                await set_state(SessionState.IDLE)

        welcome_task = asyncio.create_task(play_welcome())
        await asyncio.gather(pump_asr(), receive_browser_audio(), welcome_task)
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
        if asr_reconnect_task and not asr_reconnect_task.done():
            asr_reconnect_task.cancel()
            try:
                await asr_reconnect_task
            except asyncio.CancelledError:
                pass
        await asr.close()
