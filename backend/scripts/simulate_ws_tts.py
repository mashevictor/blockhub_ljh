"""模拟前端 WebSocket 文本转语音联调。

方法（忠实复刻前端链路）：
  1. 把一句"用户想说的上海话"用 TeleTTS 合成成 24k PCM（模拟真实人声）。
  2. 重采样到 16k，作为麦克风音频帧通过 WebSocket 发给运行中的后端
     /api/v1/voice/shanghai-agent（与浏览器前端完全一致：audio → ASR → LLM → TTS）。
  3. 接收并拼接服务端回传的 tts_audio（24k PCM），即"文本→语音"的成品。
  4. 同时打印 ASR 识别文本与 LLM 上海话回复文本，并落盘 WAV 供试听。

用法:
  PYTHONPATH=. .venv/bin/python scripts/simulate_ws_tts.py "侬好，吾是上海话智能体"
"""
from __future__ import annotations

import asyncio
import audioop
import base64
import json
import struct
import sys
import websockets

from app.services.teleai_tts import TeleTtsClient


TTS_RATE = 24000
ASR_RATE = 16000
WS_URL = "ws://127.0.0.1:8001/api/v1/voice/shanghai-agent"


async def synth_to_24k_pcm(text: str) -> bytes:
    client = TeleTtsClient()
    pcm = bytearray()
    async for chunk in client.synthesize_stream(text):
        if chunk.audio_b64:
            pcm += base64.b64decode(chunk.audio_b64)
    return bytes(pcm)


def resample_24k_to_16k(pcm24: bytes) -> bytes:
    converted, _ = audioop.ratecv(pcm24, 2, 1, TTS_RATE, ASR_RATE, None)
    return converted


def write_wav(path: str, pcm: bytes, rate: int) -> None:
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(pcm)))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16))
        f.write(b"data")
        f.write(struct.pack("<I", len(pcm)))
        f.write(pcm)


async def main() -> int:
    phrase = sys.argv[1] if len(sys.argv) > 1 else "侬好，吾是上海话智能体"
    print(f"[1] 合成输入音频(模拟人声): {phrase}")
    pcm24 = await synth_to_24k_pcm(phrase)
    if not pcm24:
        print("FAIL: 输入音频合成失败")
        return 1
    pcm16 = resample_24k_to_16k(pcm24)
    print(f"    24k PCM={len(pcm24)}B -> 16k PCM={len(pcm16)}B")

    out_pcm = bytearray()
    asr_final = ""
    llm_text = ""
    states: list[str] = []

    print(f"[2] 连接 WS {WS_URL}")
    async with websockets.connect(WS_URL, open_timeout=15) as ws:
        # 等待 ready
        ready = await ws.recv()
        print("   服务端:", ready)
        # 分帧发送（200ms @ 16k = 6400 字节/帧）
        frame = 6400
        n = 0
        for i in range(0, len(pcm16), frame):
            await ws.send(json.dumps({"type": "audio", "data": base64.b64encode(pcm16[i:i+frame]).decode()}))
            n += 1
        await ws.send(json.dumps({"type": "utterance_end"}))
        print(f"   已发送 {n} 帧音频 + utterance_end")

        print("[3] 接收服务端消息流 ...")
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=30)
            except asyncio.TimeoutError:
                print("   (30s 超时，停止接收)")
                break
            msg = json.loads(raw)
            t = msg.get("type")
            if t == "state":
                states.append(msg.get("state"))
            elif t == "asr_final":
                asr_final = msg.get("text", "")
                print(f"  ASR 识别 : {asr_final}")
            elif t == "llm_delta":
                llm_text += msg.get("text", "")
            elif t == "tts_audio":
                if msg.get("data"):
                    out_pcm += base64.b64decode(msg["data"])
            elif t == "error":
                print(f"  ERROR    : {msg}")
                break
            elif t == "state" and msg.get("state") == "idle" and out_pcm:
                # 一轮完成后等待一下确保收完尾包
                pass
            # 收完 tts 且回到 idle 后多等片刻再退出
            if t == "state" and msg.get("state") == "idle" and out_pcm:
                await asyncio.sleep(0.3)
                break

    print(f"\n[4] 结果")
    print(f"  ASR 识别文本 : {asr_final}")
    print(f"  LLM 上海话回复: {llm_text}")
    print(f"  TTS 回传音频 : {len(out_pcm)}B @ {TTS_RATE}Hz")
    if out_pcm:
        wav = "/tmp/shanghai_ws_out.wav"
        write_wav(wav, bytes(out_pcm), TTS_RATE)
        print(f"  已保存 WAV  : {wav}")
        print("  => 文本转语音联调成功 ✅")
        return 0
    print("  => 未收到音频，联调失败 ❌")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
