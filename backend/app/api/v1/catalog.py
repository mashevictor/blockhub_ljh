from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import catalog_store

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/summary")
def catalog_summary(db: Annotated[Session, Depends(get_db)]) -> dict:
    return catalog_store.catalog_summary(db)


@router.get("/office")
def list_office(
    db: Annotated[Session, Depends(get_db)],
    category: str | None = Query(None, description="Filter by category name"),
    q: str | None = Query(None, description="Search by scenario name"),
    lite: bool = Query(False, description="Minimal fields for Home list (faster)"),
    limit: int = Query(50, description="分页大小", ge=1, le=500),
    offset: int = Query(0, description="分页偏移", ge=0),
) -> dict:
    items, groups = catalog_store.list_office_scenarios(db, category=category, q=q, lite=lite)
    total = len(items)
    return {"total": total, "items": items[offset:offset + limit], "groups": groups, "limit": limit, "offset": offset}


@router.get("/office/groups")
def office_groups(db: Annotated[Session, Depends(get_db)]) -> dict:
    groups = catalog_store.list_office_groups(db)
    total = sum(len(g.get("items", [])) for g in groups)
    return {"groups": groups, "total_scenarios": total}


@router.get("/industry")
def list_industry(
    db: Annotated[Session, Depends(get_db)],
    pack: str | None = Query(None, description="Filter by pack key: mfg|sales|med|game"),
    category: str | None = Query(None, description="Filter by sub-category e.g. 临床知识"),
    q: str | None = Query(None, description="Search by scenario name"),
    lite: bool = Query(False, description="Minimal fields for Home list (faster)"),
    limit: int = Query(50, description="分页大小", ge=1, le=500),
    offset: int = Query(0, description="分页偏移", ge=0),
) -> dict:
    items, packs = catalog_store.list_industry_scenarios(db, pack=pack, category=category, q=q, lite=lite)
    total = len(items)
    return {"total": total, "items": items[offset:offset + limit], "packs": packs, "limit": limit, "offset": offset}


@router.get("/industry/{pack_key}")
def industry_pack_detail(pack_key: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    detail = catalog_store.get_industry_pack_detail(db, pack_key)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Industry pack '{pack_key}' not found")
    return detail


@router.get("/scenarios")
def list_all_scenarios(
    db: Annotated[Session, Depends(get_db)],
    type: str | None = Query(None, description="office|industry"),
    q: str | None = Query(None),
    limit: int = Query(20, description="分页大小", ge=1, le=500),
    offset: int = Query(0, description="分页偏移", ge=0),
) -> dict:
    items = catalog_store.list_all_scenarios(db, type=type, q=q)
    total = len(items)
    return {"total": total, "items": items[offset:offset + limit], "limit": limit, "offset": offset}


@router.get("/modules")
def list_capabilities(db: Annotated[Session, Depends(get_db)]) -> dict:
    items, by_category = catalog_store.list_capabilities(db)
    return {"total": len(items), "items": items, "by_category": by_category}


@router.get("/hero-presets")
def hero_presets(db: Annotated[Session, Depends(get_db)]) -> dict:
    items = catalog_store.list_hero_presets(db)
    return {"total": len(items), "items": items, "source": "database"}


@router.get("/chip-templates")
def chip_templates(db: Annotated[Session, Depends(get_db)]) -> dict:
    items = catalog_store.list_chip_templates(db)
    return {"total": len(items), "items": items, "source": "database"}
