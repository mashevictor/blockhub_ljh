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

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    model: str = "doubao-seed-2-0-mini"


@router.get("/config")
def chat_config() -> dict:
    return {
        "title": "智能问答",
        "description": "结合企业知识库的多轮对话",
        "default_model": CHAT_MODELS[0],
        "models": CHAT_MODELS,
        "suggestions": CHAT_SUGGESTIONS,
    }


@router.get("/sessions/{session_id}/messages")
def list_messages(session_id: str = "default") -> dict:
    return {"session_id": session_id, "items": get_chat_messages(session_id)}


@router.post("/completions")
def chat_completion(body: ChatRequest) -> dict:
    add_chat_message(body.session_id, "user", body.message)
    reply = generate_rag_reply(body.message)
    msg = add_chat_message(body.session_id, "assistant", reply)
    return {"session_id": body.session_id, "message": msg, "model": body.model}


@router.post("/completions/stream")
async def chat_stream(body: ChatRequest):
    reply = generate_rag_reply(body.message)
    add_chat_message(body.session_id, "user", body.message)

    async def event_generator():
        add_chat_message(body.session_id, "assistant", reply)
        words = list(reply)
        chunk = ""
        for i, ch in enumerate(words):
            chunk += ch
            if i % 3 == 2 or i == len(words) - 1:
                data = json.dumps({"content": chunk, "done": i == len(words) - 1}, ensure_ascii=False)
                yield f"data: {data}\n\n"
                await asyncio.sleep(0.03)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
