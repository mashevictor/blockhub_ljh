import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.data.module_data import (
    CHAT_MODELS,
    CHAT_SUGGESTIONS,
    add_chat_message,
    generate_rag_reply,
    get_chat_messages,
)
from app.services.llm_gateway import (
    build_chat_messages,
    chat_complete,
    llm_configured,
    stream_chat_deltas,
)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    model: str = "doubao-seed-2-0-mini"


def _history_for_llm(session_id: str) -> list[dict[str, str]]:
    items = get_chat_messages(session_id)
    return [{"role": m["role"], "content": m["content"]} for m in items[-10:]]


def _resolve_reply(message: str, session_id: str, model: str) -> tuple[str, str]:
    """返回 (reply, source) source=llm|mock"""
    if llm_configured():
        history = _history_for_llm(session_id)
        messages = build_chat_messages(message, history)
        text = chat_complete(messages, model=model)
        if text:
            return text.strip(), "llm"
    return generate_rag_reply(message), "mock"


@router.get("/config")
def chat_config() -> dict:
    return {
        "title": "智能问答",
        "description": "结合企业知识库的多轮对话",
        "default_model": CHAT_MODELS[0],
        "models": CHAT_MODELS,
        "suggestions": CHAT_SUGGESTIONS,
        "llm_configured": llm_configured(),
        "stream_supported": True,
    }


@router.get("/sessions/{session_id}/messages")
def list_messages(session_id: str = "default") -> dict:
    return {"session_id": session_id, "items": get_chat_messages(session_id)}


@router.post("/completions")
def chat_completion(body: ChatRequest) -> dict:
    add_chat_message(body.session_id, "user", body.message)
    reply, source = _resolve_reply(body.message, body.session_id, body.model)
    msg = add_chat_message(body.session_id, "assistant", reply)
    return {"session_id": body.session_id, "message": msg, "model": body.model, "source": source}


@router.post("/completions/stream")
async def chat_stream(body: ChatRequest):
    add_chat_message(body.session_id, "user", body.message)

    async def event_generator():
        reply_parts: list[str] = []
        source = "mock"

        if llm_configured():
            history = _history_for_llm(body.session_id)
            messages = build_chat_messages(body.message, history)
            got_llm = False
            for delta in stream_chat_deltas(messages, model=body.model):
                got_llm = True
                source = "llm"
                reply_parts.append(delta)
                chunk = "".join(reply_parts)
                data = json.dumps({"content": chunk, "done": False, "source": source}, ensure_ascii=False)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0)
            if got_llm and reply_parts:
                full = "".join(reply_parts)
                add_chat_message(body.session_id, "assistant", full)
                data = json.dumps({"content": full, "done": True, "source": source}, ensure_ascii=False)
                yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
                return

        reply = generate_rag_reply(body.message)
        add_chat_message(body.session_id, "assistant", reply)
        chunk = ""
        for i, ch in enumerate(list(reply)):
            chunk += ch
            if i % 2 == 1 or i == len(reply) - 1:
                data = json.dumps({"content": chunk, "done": i == len(reply) - 1, "source": source}, ensure_ascii=False)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.02)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
