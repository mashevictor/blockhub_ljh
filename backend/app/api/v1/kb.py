import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import KbDocument, User
from app.db.session import SessionLocal, get_db
from app.services.kb_store import (
    KB_PIPELINE,
    create_base,
    create_uploaded_document,
    get_document,
    index_document,
    kb_stats,
    list_bases,
    list_documents,
    search_chunks,
)
from app.services.object_storage import load_kb_bytes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kb", tags=["kb"])

ALLOWED_SUFFIXES = {".pdf", ".txt", ".md", ".markdown"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


class SearchRequest(BaseModel):
    query: str
    kb_id: str | None = None
    top_k: int = Field(default=5, ge=1, le=20)


class CreateKbRequest(BaseModel):
    name: str
    description: str = ""


def _run_index_task(doc_id: str) -> None:
    db = SessionLocal()
    try:
        index_document(db, doc_id)
    except Exception:
        logger.exception("Background index failed for %s", doc_id)
    finally:
        db.close()


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return kb_stats(db, user.tenant_id)


@router.get("/pipeline")
def get_pipeline() -> dict:
    return {"steps": KB_PIPELINE}


@router.get("/bases")
def list_kb_bases(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return {"items": list_bases(db, user.tenant_id)}


@router.post("/bases")
def create_kb_base(
    body: CreateKbRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if not body.name.strip():
        raise HTTPException(400, "知识库名称不能为空")
    kb = create_base(db, user, body.name, body.description)
    return {"success": True, "kb": kb}


@router.get("/documents")
def list_kb_documents(
    kb_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = list_documents(db, user.tenant_id, kb_id)
    return {"total": len(items), "items": items}


@router.get("/documents/{doc_id}")
def get_kb_document(
    doc_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    doc = get_document(db, user.tenant_id, doc_id)
    if not doc:
        raise HTTPException(404, "文档不存在")
    from app.services.kb_store import _doc_dict

    return _doc_dict(doc)


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    kb_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    filename = (file.filename or "document").strip()
    lower = filename.lower()
    if not any(lower.endswith(s) for s in ALLOWED_SUFFIXES):
        raise HTTPException(400, "仅支持 PDF、TXT、Markdown 文件")

    data = await file.read()
    if not data:
        raise HTTPException(400, "文件为空")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "文件超过 20MB 限制")

    try:
        doc = create_uploaded_document(
            db,
            user,
            kb_id=kb_id,
            filename=filename,
            data=data,
            mime_type=file.content_type or "application/octet-stream",
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc

    background_tasks.add_task(_run_index_task, doc["id"])
    return {"success": True, "document": doc}


@router.post("/documents/{doc_id}/reindex")
def reindex_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    doc = get_document(db, user.tenant_id, doc_id)
    if not doc:
        raise HTTPException(404, "文档不存在")
    background_tasks.add_task(_run_index_task, doc_id)
    return {"success": True, "document_id": doc_id, "status": "processing"}


@router.post("/search")
def semantic_search(
    body: SearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    hits = search_chunks(
        db,
        user.tenant_id,
        body.query,
        kb_id=body.kb_id,
        top_k=body.top_k,
    )
    items = [
        {
            "doc_id": h.document_id,
            "doc_name": h.doc_name,
            "chunk_index": h.chunk_index,
            "snippet": h.content if len(h.content) <= 300 else f"{h.content[:300]}…",
            "score": h.score,
        }
        for h in hits
    ]
    return {"query": body.query, "total": len(items), "items": items}


@router.get("/files/{file_key:path}")
def download_kb_file(
    file_key: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    if not file_key.startswith(f"kb/{user.tenant_id}/"):
        raise HTTPException(403, "无权访问该文件")
    doc = (
        db.query(KbDocument)
        .filter(KbDocument.file_key == file_key, KbDocument.tenant_id == user.tenant_id)
        .first()
    )
    if not doc:
        raise HTTPException(404, "文件不存在")
    try:
        data = load_kb_bytes(doc.file_key, doc.storage)
    except FileNotFoundError as exc:
        raise HTTPException(404, "文件不存在") from exc
    media = doc.mime_type or "application/octet-stream"
    return Response(content=data, media_type=media)
