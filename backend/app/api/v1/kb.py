from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.module_data import (
    KB_PIPELINE,
    _doc_store,
    _kb_store,
    kb_stats,
    search_kb,
)

router = APIRouter(prefix="/kb", tags=["kb"])


class SearchRequest(BaseModel):
    query: str
    kb_id: str | None = None


class CreateKbRequest(BaseModel):
    name: str
    description: str = ""


@router.get("/stats")
def get_stats() -> dict:
    return kb_stats()


@router.get("/pipeline")
def get_pipeline() -> dict:
    return {"steps": KB_PIPELINE}


@router.get("/bases")
def list_bases() -> dict:
    return {"items": _kb_store}


@router.post("/bases")
def create_base(body: CreateKbRequest) -> dict:
    kb = {
        "id": f"kb-{len(_kb_store)+1:03d}",
        "name": body.name,
        "description": body.description,
        "doc_count": 0,
        "chunk_count": 0,
        "status": "empty",
        "updated_at": "2026-07-01",
    }
    _kb_store.append(kb)
    return {"success": True, "kb": kb}


@router.get("/documents")
def list_documents(kb_id: str | None = None) -> dict:
    items = _doc_store if not kb_id else [d for d in _doc_store if d["kb_id"] == kb_id]
    return {"total": len(items), "items": items}


@router.get("/documents/{doc_id}")
def get_document(doc_id: str) -> dict:
    doc = next((d for d in _doc_store if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.post("/search")
def semantic_search(body: SearchRequest) -> dict:
    results = search_kb(body.query)
    return {"query": body.query, "total": len(results), "items": results}
