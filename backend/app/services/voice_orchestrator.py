from __future__ import annotations

import re
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass

from app.services.llm_gateway import llm_configured, stream_chat_deltas
from app.services.voice_prompts import SHANGHAI_VOICE_SYSTEM_PROMPT

_SENTENCE_END = re.compile(r"[。！？；\n]")


@dataclass
class LlmStreamEvent:
    delta: str = ""
    sentence: str = ""


def build_shanghai_messages(user_text: str, history: list[dict[str, str]] | None = None) -> list[dict[str, str]]:
    msgs: list[dict[str, str]] = [{"role": "system", "content": SHANGHAI_VOICE_SYSTEM_PROMPT}]
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_text})
    return msgs


def iter_sentences(deltas: Iterator[str]) -> Iterator[str]:
    buffer = ""
    for delta in deltas:
        buffer += delta
        while True:
            match = _SENTENCE_END.search(buffer)
            if not match:
                break
            end = match.end()
            sentence = buffer[:end].strip()
            buffer = buffer[end:]
            if sentence:
                yield sentence
    tail = buffer.strip()
    if tail:
        yield tail


def iter_llm_stream(messages: list[dict[str, str]]) -> Iterator[LlmStreamEvent]:
    """逐 token 产出 delta，并在句末产出 sentence 供 TTS。"""
    from app.core.config import settings

    model = settings.deepseek_model if settings.deepseek_api_key else None
    if not llm_configured():
        return
    buffer = ""
    for delta in stream_chat_deltas(messages, model=model, temperature=0.65):
        buffer += delta
        yield LlmStreamEvent(delta=delta)
        while True:
            match = _SENTENCE_END.search(buffer)
            if not match:
                break
            end = match.end()
            sentence = buffer[:end].strip()
            buffer = buffer[end:]
            if sentence:
                yield LlmStreamEvent(sentence=sentence)
    tail = buffer.strip()
    if tail:
        yield LlmStreamEvent(sentence=tail)


async def stream_sentences(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    from app.core.config import settings

    # 语音 Agent 优先 DeepSeek 做语义理解
    model = settings.deepseek_model if settings.deepseek_api_key else None
    if not llm_configured():
        return
    for sentence in iter_sentences(stream_chat_deltas(messages, model=model, temperature=0.65)):
        yield sentence
