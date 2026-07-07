"""Chat session persistence — PostgreSQL."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import ChatMessage, Conversation, User


def _message_to_dict(msg: ChatMessage) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else "",
    }
    if msg.citations_json:
        out["citations"] = msg.citations_json
    if msg.source:
        out["source"] = msg.source
    return out


def get_or_create_conversation(
    db: Session,
    user: User,
    session_key: str,
) -> Conversation:
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.tenant_id == user.tenant_id,
            Conversation.user_id == user.id,
            Conversation.session_key == session_key,
        )
        .first()
    )
    if conv:
        return conv
    conv = Conversation(
        tenant_id=user.tenant_id,
        user_id=user.id,
        session_key=session_key,
        title=session_key if session_key != "default" else "默认会话",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def list_messages(
    db: Session,
    user: User,
    session_key: str,
) -> list[dict[str, Any]]:
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.tenant_id == user.tenant_id,
            Conversation.user_id == user.id,
            Conversation.session_key == session_key,
        )
        .first()
    )
    if not conv:
        return []
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [_message_to_dict(m) for m in rows]


def add_message(
    db: Session,
    user: User,
    session_key: str,
    role: str,
    content: str,
    *,
    citations: list[dict] | None = None,
    source: str | None = None,
) -> dict[str, Any]:
    conv = get_or_create_conversation(db, user, session_key)
    msg = ChatMessage(
        conversation_id=conv.id,
        tenant_id=user.tenant_id,
        role=role,
        content=content,
        citations_json=citations,
        source=source,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _message_to_dict(msg)
