"""天翼 AI ASR/TTS 端到端自检脚本。

做法：用 TTS 把一句上海话合成成 PCM，再把这段 PCM 喂回 ASR，
看能否被识别出来 —— 以此同时验证 TTS（能出声）和 ASR（能识别）两条链路。
"""
from __future__ import annotations

import asyncio
import base64
import sys

from app.services.teleai_asr import TeleAsrClient
from app.services.teleai_tts import TeleTtsClient
from app.services.teleai_auth import teleai_configured
from app.core.config import settings


async def run_tts(text: str) -> bytes:
    """合成文本，返回拼接后的 PCM（16-bit）。"""
    client = TeleTtsClient()
    pcm = bytearray()
    chunks = 0
    async for chunk in client.synthesize_stream(text):
        if chunk.audio_b64:
            pcm += base64.b64decode(chunk.audio_b64)
            chunks += 1
        if chunk.is_end:
            break
    print(f"[TTS] 合成 {chunks} 个音频包，PCM 字节数={len(pcm)}")
    return bytes(pcm)


async def run_asr(pcm: bytes) -> str:
    """把一段 PCM 喂给 ASR，返回最终识别文本。"""
    client = TeleAsrClient(hotwords=["上海话", "智能体"])
    final_text = ""
    try:
        await client.connect()
        # 按 200ms 一帧分片发送（16k * 2bytes * 0.2s = 6400 字节/帧）
        frame = 6400
        for i in range(0, len(pcm), frame):
            await client.send_audio(pcm[i : i + frame])
        await client.end_utterance()

        async for event in client.events():
            if event.res_status == -1:
                print(f"[ASR] 错误 code={event.code} msg={event.message}")
                break
            if event.res_status == 2 and event.text:
                print(f"[ASR] 中间结果: {event.text}")
            if event.res_status in (3, 4) and event.text:
                final_text = event.text
                print(f"[ASR] 最终结果: {event.text} (lang={event.lang})")
                break
    finally:
        await client.close()
    return final_text


async def main() -> int:
    if not teleai_configured():
        print("FAIL: TELEAI_APP_ID / TELEAI_APP_KEY 未配置")
        return 1

    print(f"== 使用 host={settings.teleai_host} region={settings.teleai_region} dialect={settings.teleai_tts_dialect}")

    # 一句上海话
    phrase = "侬好，吾是上海话智能体，谢谢侬。"
    print(f"\n[TTS] 合成文本: {phrase}")
    pcm = await run_tts(phrase)
    if len(pcm) == 0:
        print("FAIL: TTS 未返回任何音频")
        return 1

    print(f"\n[ASR] 把 TTS 合成的 PCM 喂回 ASR ...")
    recognized = await run_asr(pcm)
    if not recognized:
        print("WARN: ASR 未返回识别结果（可能是静音/协议未结束）")
        return 2

    print(f"\n== 往返成功 ==")
    print(f"TTS 文本 : {phrase}")
    print(f"ASR 识别 : {recognized}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
