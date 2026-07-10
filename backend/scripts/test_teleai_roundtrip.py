"""天翼 AI ASR/TTS 端到端自检脚本。

做法：用 TTS 把一句上海话合成成 PCM，再把这段 PCM 喂回 ASR，
看能否被识别出来 —— 以此同时验证 TTS（能出声）和 ASR（能识别）两条链路。
"""
from __future__ import annotations

import asyncio
import base64
import os
import struct
import sys
import time

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


def resample_pcm16(pcm: bytes, from_rate: int, to_rate: int) -> bytes:
    """线性重采样 16-bit PCM。TTS 输出 24k，ASR 按 16k 配置，需降采样。"""
    if from_rate == to_rate or not pcm:
        return pcm
    n = len(pcm) // 2
    src = struct.unpack(f"<{n}h", pcm)
    ratio = from_rate / to_rate
    out_n = int(n / ratio)
    out = []
    for i in range(out_n):
        idx = i * ratio
        i0 = int(idx)
        frac = idx - i0
        i1 = min(i0 + 1, n - 1)
        out.append(int(src[i0] + (src[i1] - src[i0]) * frac))
    return struct.pack(f"<{out_n}h", *out)


async def run_asr(pcm: bytes, *, attempt: int = 1) -> str:
    """把一段 PCM 喂给 ASR，返回最终识别文本。"""
    client = TeleAsrClient(hotwords=["上海话", "智能体", "侬好"])
    final_text = ""
    try:
        await client.connect()
        await asyncio.sleep(0.15)
        # 按 200ms 一帧分片发送（16k * 2bytes * 0.2s = 6400 字节/帧）
        frame = 6400
        for i in range(0, len(pcm), frame):
            await client.send_audio(pcm[i : i + frame])
            await asyncio.sleep(0.15)
        await client.end_utterance()

        deadline = time.monotonic() + 25
        async for event in client.events():
            if time.monotonic() > deadline:
                print(f"[ASR] 等待最终结果超时 (attempt {attempt})")
                break
            if event.res_status == 0:
                continue
            if event.res_status == -1:
                print(f"[ASR] 错误 code={event.code} msg={event.message} (attempt {attempt})")
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

    phrase = os.environ.get("VOICE_ROUNDTRIP_PHRASE", "侬好，吾是上海话智能体。")
    print(f"\n[TTS] 合成文本: {phrase}")
    pcm = await run_tts(phrase)
    if len(pcm) == 0:
        print("FAIL: TTS 未返回任何音频")
        return 1

    pcm_16k = resample_pcm16(pcm, 24000, 16000)
    # 限制最长 3 秒，避免冒烟时过长音频触发网关限流
    max_bytes = 16000 * 2 * 3
    if len(pcm_16k) > max_bytes:
        pcm_16k = pcm_16k[:max_bytes]
        print(f"[ASR] 截断 PCM 至 3s ({len(pcm_16k)} bytes)")

    print("\n[ASR] 把 TTS 合成的 PCM（降采样至 16k）喂回 ASR ...")
    recognized = ""
    for attempt in range(1, 4):
        recognized = await run_asr(pcm_16k, attempt=attempt)
        if recognized:
            break
        if attempt < 3:
            print(f"[ASR] 第 {attempt} 次未识别，1s 后重试...")
            await asyncio.sleep(1.0)

    if not recognized:
        print("WARN: ASR 未返回识别结果（TTS 可能正常，ASR 流式需检查电信侧授权）")
        return 2

    print("\n== 往返成功 ==")
    print(f"TTS 文本 : {phrase}")
    print(f"ASR 识别 : {recognized}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
