from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import KbDocument, KbDocumentChunk, KnowledgeBase, User
from app.services.embedding_service import embed_texts, embedding_configured
from app.services.object_storage import load_kb_bytes, public_file_url, save_kb_bytes
from app.services.pdf_chunker import chunk_text, estimate_tokens, extract_text_from_bytes

logger = logging.getLogger(__name__)

KB_PIPELINE = ["上传文档", "解析内容", "分段整理", "向量化", "建立索引", "智能搜索"]


@dataclass
class SearchHit:
    chunk_id: str
    document_id: str
    doc_name: str
    kb_id: str
    chunk_index: int
    page_number: int
    content: str
    score: float


def _fmt_size(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


def kb_stats(db: Session, tenant_id: str) -> dict:
    bases = db.scalar(
        select(func.count()).select_from(KnowledgeBase).where(KnowledgeBase.tenant_id == tenant_id)
    ) or 0
    docs = db.scalar(
        select(func.count()).select_from(KbDocument).where(KbDocument.tenant_id == tenant_id)
    ) or 0
    chunks = db.scalar(
        select(func.count()).select_from(KbDocumentChunk).where(KbDocumentChunk.tenant_id == tenant_id)
    ) or 0
    indexed = db.scalar(
        select(func.count())
        .select_from(KbDocument)
        .where(KbDocument.tenant_id == tenant_id, KbDocument.status == "indexed")
    ) or 0
    return {
        "knowledge_bases": bases,
        "documents": docs,
        "chunks": chunks,
        "indexed": indexed,
        "embedding_configured": embedding_configured(),
        "cos_configured": bool(settings.cos_secret_id and settings.cos_bucket),
    }


def list_bases(db: Session, tenant_id: str) -> list[dict]:
    rows = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.tenant_id == tenant_id)
        .order_by(KnowledgeBase.updated_at.desc())
        .all()
    )
    return [_base_dict(kb) for kb in rows]


def create_base(db: Session, user: User, name: str, description: str = "") -> dict:
    kb = KnowledgeBase(
        tenant_id=user.tenant_id,
        name=name.strip(),
        description=description.strip(),
        status="empty",
        created_by_id=user.id,
    )
    db.add(kb)
    db.commit()
    db.refresh(kb)
    return _base_dict(kb)


def get_base(db: Session, tenant_id: str, kb_id: str) -> KnowledgeBase | None:
    return (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == kb_id, KnowledgeBase.tenant_id == tenant_id)
        .first()
    )


def list_documents(db: Session, tenant_id: str, kb_id: str | None = None) -> list[dict]:
    q = db.query(KbDocument).filter(KbDocument.tenant_id == tenant_id)
    if kb_id:
        q = q.filter(KbDocument.kb_id == kb_id)
    rows = q.order_by(KbDocument.created_at.desc()).all()
    return [_doc_dict(d) for d in rows]


def get_document(db: Session, tenant_id: str, doc_id: str) -> KbDocument | None:
    return (
        db.query(KbDocument)
        .filter(KbDocument.id == doc_id, KbDocument.tenant_id == tenant_id)
        .first()
    )


def create_uploaded_document(
    db: Session,
    user: User,
    *,
    kb_id: str,
    filename: str,
    data: bytes,
    mime_type: str,
) -> dict:
    kb = get_base(db, user.tenant_id, kb_id)
    if not kb:
        raise ValueError("知识库不存在")

    file_key, storage = save_kb_bytes(
        tenant_id=user.tenant_id,
        kb_id=kb_id,
        filename=filename,
        data=data,
    )
    doc = KbDocument(
        kb_id=kb_id,
        tenant_id=user.tenant_id,
        name=filename,
        file_key=file_key,
        storage=storage,
        mime_type=mime_type or "application/octet-stream",
        size_bytes=len(data),
        status="processing",
        created_by_id=user.id,
    )
    db.add(doc)
    kb.doc_count = (kb.doc_count or 0) + 1
    kb.status = "processing"
    kb.updated_at = datetime.now()
    db.commit()
    db.refresh(doc)
    return _doc_dict(doc)


def index_document(db: Session, doc_id: str) -> None:
    doc = db.get(KbDocument, doc_id)
    if not doc:
        return

    doc.status = "processing"
    doc.error_message = ""
    db.commit()

    try:
        raw = load_kb_bytes(doc.file_key, doc.storage)
        text, page_count = extract_text_from_bytes(raw, doc.name, doc.mime_type)
        pieces = chunk_text(
            text,
            chunk_size=settings.kb_chunk_size,
            overlap=settings.kb_chunk_overlap,
        )
        if not pieces:
            raise ValueError("未能从文档中提取有效文本")

        db.execute(delete(KbDocumentChunk).where(KbDocumentChunk.document_id == doc.id))

        vectors = embed_texts([p.content for p in pieces])
        chunk_rows: list[KbDocumentChunk] = []
        for piece in pieces:
            emb = None
            if vectors is not None:
                emb = vectors[piece.chunk_index]
            chunk_rows.append(
                KbDocumentChunk(
                    document_id=doc.id,
                    kb_id=doc.kb_id,
                    tenant_id=doc.tenant_id,
                    chunk_index=piece.chunk_index,
                    page_number=piece.page_number,
                    content=piece.content,
                    token_count=estimate_tokens(piece.content),
                    embedding=emb,
                )
            )
        db.add_all(chunk_rows)

        doc.page_count = page_count
        doc.chunk_count = len(chunk_rows)
        doc.status = "indexed"
        doc.error_message = ""
        doc.updated_at = datetime.now()

        kb = db.get(KnowledgeBase, doc.kb_id)
        if kb:
            kb.chunk_count = (
                db.scalar(
                    select(func.count())
                    .select_from(KbDocumentChunk)
                    .where(KbDocumentChunk.kb_id == kb.id)
                )
                or 0
            )
            indexed_docs = (
                db.scalar(
                    select(func.count())
                    .select_from(KbDocument)
                    .where(KbDocument.kb_id == kb.id, KbDocument.status == "indexed")
                )
                or 0
            )
            kb.status = "indexed" if indexed_docs > 0 else "empty"
            kb.updated_at = datetime.now()

        db.commit()
    except Exception as exc:
        logger.exception("Index document %s failed", doc_id)
        db.rollback()
        doc = db.get(KbDocument, doc_id)
        if doc:
            doc.status = "failed"
            doc.error_message = str(exc)[:500]
            doc.updated_at = datetime.now()
            db.commit()


def search_chunks(
    db: Session,
    tenant_id: str,
    query: str,
    *,
    kb_id: str | None = None,
    top_k: int = 5,
) -> list[SearchHit]:
    q = query.strip()
    if not q:
        return []

    base_filter = [KbDocumentChunk.tenant_id == tenant_id]
    if kb_id:
        base_filter.append(KbDocumentChunk.kb_id == kb_id)

    query_vec = embed_texts([q])
    if query_vec and query_vec[0]:
        distance = KbDocumentChunk.embedding.cosine_distance(query_vec[0])
        stmt = (
            select(KbDocumentChunk, KbDocument.name, distance.label("dist"))
            .join(KbDocument, KbDocument.id == KbDocumentChunk.document_id)
            .where(*base_filter, KbDocumentChunk.embedding.isnot(None))
            .order_by(distance)
            .limit(top_k)
        )
        rows = db.execute(stmt).all()
        hits: list[SearchHit] = []
        for chunk, doc_name, dist in rows:
            score = max(0.0, min(1.0, 1.0 - float(dist)))
            hits.append(
                SearchHit(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    doc_name=doc_name,
                    kb_id=chunk.kb_id,
                    chunk_index=chunk.chunk_index,
                    page_number=chunk.page_number,
                    content=chunk.content,
                    score=round(score, 4),
                )
            )
        if hits:
            return hits

    pattern = f"%{q}%"
    stmt = (
        select(KbDocumentChunk, KbDocument.name)
        .join(KbDocument, KbDocument.id == KbDocumentChunk.document_id)
        .where(*base_filter, KbDocumentChunk.content.ilike(pattern))
        .order_by(KbDocumentChunk.created_at.desc())
        .limit(top_k)
    )
    rows = db.execute(stmt).all()
    return [
        SearchHit(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            doc_name=doc_name,
            kb_id=chunk.kb_id,
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            content=chunk.content,
            score=round(0.9 - i * 0.05, 4),
        )
        for i, (chunk, doc_name) in enumerate(rows)
    ]


def _base_dict(kb: KnowledgeBase) -> dict:
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "doc_count": kb.doc_count,
        "chunk_count": kb.chunk_count,
        "status": kb.status,
        "updated_at": kb.updated_at.isoformat() if kb.updated_at else "",
    }


def _doc_dict(doc: KbDocument) -> dict:
    return {
        "id": doc.id,
        "kb_id": doc.kb_id,
        "name": doc.name,
        "size": _fmt_size(doc.size_bytes),
        "size_bytes": doc.size_bytes,
        "chunks": doc.chunk_count,
        "page_count": doc.page_count,
        "status": doc.status,
        "storage": doc.storage,
        "file_url": public_file_url(doc.file_key, doc.storage),
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat() if doc.created_at else "",
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else "",
    }
