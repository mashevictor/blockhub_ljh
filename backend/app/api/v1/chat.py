import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.data.module_data import CHAT_MODELS, CHAT_SUGGESTIONS, generate_rag_reply
from app.db.models import User
from app.db.session import get_db
from app.services.chat_store import add_message, list_messages
from app.services.embedding_service import embedding_configured
from app.services.kb_store import search_chunks
from app.services.llm_gateway import (
    chat_complete,
    llm_configured,
    stream_chat_deltas,
)
from app.services.rag_service import build_rag_context, build_rag_messages

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    model: str = "doubao-seed-2-0-mini"
    use_rag: bool = True
    kb_id: str | None = None
    top_k: int = Field(default=4, ge=1, le=10)


def _history_for_llm(db: Session, user: User, session_id: str) -> list[dict[str, str]]:
    items = list_messages(db, user, session_id)
    return [{"role": m["role"], "content": m["content"]} for m in items[-10:]]


def _retrieve(db: Session, user: User, message: str, kb_id: str | None, top_k: int):
    if not message.strip():
        return None
    hits = search_chunks(db, user.tenant_id, message, kb_id=kb_id, top_k=top_k)
    return build_rag_context(hits)


def _resolve_reply(
    db: Session,
    user: User,
    message: str,
    session_id: str,
    model: str,
    *,
    use_rag: bool,
    kb_id: str | None,
    top_k: int,
) -> tuple[str, str, list[dict] | None]:
    """返回 (reply, source, citations)"""
    rag = _retrieve(db, user, message, kb_id, top_k) if use_rag else None
    citations = rag.citations if rag else None

    if llm_configured():
        history = _history_for_llm(db, user, session_id)
        messages = build_rag_messages(message, history, rag) if rag else None
        if messages is None:
            from app.services.llm_gateway import build_chat_messages

            messages = build_chat_messages(message, history)
        text = chat_complete(messages, model=model)
        if text:
            return text.strip(), "llm", citations

    if rag and rag.citations:
        top = rag.citations[0]
        return (
            f"根据知识库《{top['doc_name']}》：{top['snippet']}\n\n"
            f"（共检索到 {len(rag.citations)} 条相关片段，可在知识库页查看详情。）",
            "kb",
            citations,
        )
    return generate_rag_reply(message), "mock", None


@router.get("/config")
def chat_config(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    from app.services.kb_store import kb_stats

    stats = kb_stats(db, user.tenant_id)
    return {
        "title": "智能问答",
        "description": "结合企业知识库的多轮对话",
        "default_model": CHAT_MODELS[0],
        "models": CHAT_MODELS,
        "suggestions": CHAT_SUGGESTIONS,
        "llm_configured": llm_configured(),
        "embedding_configured": embedding_configured(),
        "rag_available": stats["chunks"] > 0,
        "stream_supported": True,
        "persistence": "postgresql",
    }


@router.get("/sessions/{session_id}/messages")
def list_messages_api(
    session_id: str = "default",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return {"session_id": session_id, "items": list_messages(db, user, session_id)}


@router.post("/completions")
def chat_completion(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    add_message(db, user, body.session_id, "user", body.message)
    reply, source, citations = _resolve_reply(
        db,
        user,
        body.message,
        body.session_id,
        body.model,
        use_rag=body.use_rag,
        kb_id=body.kb_id,
        top_k=body.top_k,
    )
    msg = add_message(
        db, user, body.session_id, "assistant", reply, citations=citations, source=source
    )
    return {"session_id": body.session_id, "message": msg, "model": body.model, "source": source}


@router.post("/completions/stream")
async def chat_stream(
    body: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    add_message(db, user, body.session_id, "user", body.message)
    rag = _retrieve(db, user, body.message, body.kb_id, body.top_k) if body.use_rag else None
    citations = rag.citations if rag else None

    async def event_generator():
        reply_parts: list[str] = []
        source = "mock"

        if llm_configured():
            history = _history_for_llm(db, user, body.session_id)
            messages = build_rag_messages(body.message, history, rag) if rag else None
            if messages is None:
                from app.services.llm_gateway import build_chat_messages

                messages = build_chat_messages(body.message, history)
            got_llm = False
            for delta in stream_chat_deltas(messages, model=body.model):
                got_llm = True
                source = "llm"
                reply_parts.append(delta)
                chunk = "".join(reply_parts)
                payload = {
                    "content": chunk,
                    "done": False,
                    "source": source,
                    "citations": citations,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)
            if got_llm and reply_parts:
                full = "".join(reply_parts)
                add_message(
                    db,
                    user,
                    body.session_id,
                    "assistant",
                    full,
                    citations=citations,
                    source=source,
                )
                payload = {
                    "content": full,
                    "done": True,
                    "source": source,
                    "citations": citations,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
                return

        if rag and rag.citations:
            top = rag.citations[0]
            reply = (
                f"根据知识库《{top['doc_name']}》：{top['snippet']}\n\n"
                f"（共检索到 {len(rag.citations)} 条相关片段。）"
            )
            source = "kb"
        else:
            reply = generate_rag_reply(body.message)

        add_message(
            db, user, body.session_id, "assistant", reply, citations=citations, source=source
        )
        chunk = ""
        for i, ch in enumerate(list(reply)):
            chunk += ch
            if i % 2 == 1 or i == len(reply) - 1:
                payload = {
                    "content": chunk,
                    "done": i == len(reply) - 1,
                    "source": source,
                    "citations": citations if i == len(reply) - 1 else None,
                }
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
