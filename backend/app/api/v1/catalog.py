from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.exc import ProgrammingError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.api_error import raise_api_error
from app.db.session import get_db
from app.services import catalog_store
from app.services.catalog_seed import ensure_catalog_seeded, seed_catalog
from app.services.i18n_catalog import (
    localize_capabilities,
    localize_hero,
    localize_industry_pack,
    localize_industry_pack_detail,
    resolve_request_locale,
)
from app.services.industry_site import list_all_sites

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/summary")
def catalog_summary(db: Annotated[Session, Depends(get_db)]) -> dict[str, Any]:
    try:
        return catalog_store.catalog_summary(db)
    except (ProgrammingError, SQLAlchemyError):
        try:
            db.rollback()
        except Exception:
            pass
        try:
            ensure_catalog_seeded(db)
            return catalog_store.catalog_summary(db)
        except (ProgrammingError, SQLAlchemyError) as exc:
            try:
                db.rollback()
            except Exception:
                pass
            try:
                seed_catalog(db, force=True)
                return catalog_store.catalog_summary(db)
            except Exception:
                # 本机无 PostgreSQL 时返回静态目录概览，避免首页空白
                office, _ = catalog_store.list_office_scenarios_static(lite=True)
                industry, _ = catalog_store.list_industry_scenarios_static(lite=True)
                heroes = catalog_store.list_hero_presets_static()
                return {
                    "office_scenario_count": len(office),
                    "industry_scenario_count": len(industry),
                    "hero_preset_count": len(heroes),
                    "chip_template_count": len(catalog_store.list_chip_templates_static()),
                    "source": "static",
                    "detail": f"数据库不可用，已使用静态 catalog（{exc.__class__.__name__}）",
                }


@router.get("/office")
def list_office(
    db: Annotated[Session, Depends(get_db)],
    category: str | None = Query(None, description="Filter by category name"),
    q: str | None = Query(None, description="Search by scenario name"),
    lite: bool = Query(False, description="Minimal fields for Home list (faster)"),
    limit: int = Query(50, description="分页大小", ge=1, le=500),
    offset: int = Query(0, description="分页偏移", ge=0),
) -> dict:
    try:
        items, groups = catalog_store.list_office_scenarios(db, category=category, q=q, lite=lite)
        source = "database"
    except SQLAlchemyError:
        try:
            db.rollback()
        except Exception:
            pass
        items, groups = catalog_store.list_office_scenarios_static(category=category, q=q, lite=lite)
        source = "static"
    total = len(items)
    return {
        "total": total,
        "items": items[offset:offset + limit],
        "groups": groups,
        "limit": limit,
        "offset": offset,
        "source": source,
    }


@router.get("/office/groups")
def office_groups(db: Annotated[Session, Depends(get_db)]) -> dict:
    try:
        groups = catalog_store.list_office_groups(db)
    except SQLAlchemyError:
        try:
            db.rollback()
        except Exception:
            pass
        groups = []
    total = sum(len(g.get("items", [])) for g in groups)
    return {"groups": groups, "total_scenarios": total}


@router.get("/industry")
def list_industry(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    pack: str | None = Query(None, description="Filter by pack key: mfg|sales|med|game"),
    category: str | None = Query(None, description="Filter by sub-category e.g. 临床知识"),
    q: str | None = Query(None, description="Search by scenario name"),
    lite: bool = Query(False, description="Minimal fields for Home list (faster)"),
    limit: int = Query(50, description="分页大小", ge=1, le=500),
    offset: int = Query(0, description="分页偏移", ge=0),
    lang: str | None = Query(None, description="Override Accept-Language (zh-CN|en-US)"),
) -> dict:
    locale = resolve_request_locale(request, lang)
    try:
        items, packs = catalog_store.list_industry_scenarios(db, pack=pack, category=category, q=q, lite=lite)
        source = "database"
    except SQLAlchemyError:
        try:
            db.rollback()
        except Exception:
            pass
        items, packs = catalog_store.list_industry_scenarios_static(pack=pack, category=category, q=q, lite=lite)
        source = "static"
    packs = [localize_industry_pack(p, locale) for p in (packs or [])]
    total = len(items)
    return {
        "total": total,
        "items": items[offset:offset + limit],
        "packs": packs,
        "limit": limit,
        "offset": offset,
        "source": source,
        "locale": locale,
    }


@router.get("/industry-sites")
def industry_sites_index(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    lang: str | None = Query(None, description="Override Accept-Language (zh-CN|en-US)"),
) -> dict:
    """20 个行业深度包独立站索引。"""
    locale = resolve_request_locale(request, lang)
    packs: list[dict[str, Any]] = []
    try:
        packs = catalog_store.list_industry_packs(db)
    except SQLAlchemyError:
        db.rollback()
    packs = [localize_industry_pack(p, locale) for p in packs]
    items = list_all_sites(packs)
    return {"total": len(items), "items": items, "source": "database" if packs else "static", "locale": locale}


@router.get("/industry/{pack_key}")
def industry_pack_detail(
    pack_key: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    enrich: bool = Query(False, description="使用大模型丰富行业方案文案"),
    lang: str | None = Query(None, description="Override Accept-Language (zh-CN|en-US)"),
) -> dict:
    detail: dict[str, Any] | None = None
    try:
        detail = catalog_store.get_industry_pack_detail(db, pack_key, enrich=enrich)
    except SQLAlchemyError:
        db.rollback()
    if not detail:
        detail = catalog_store.get_industry_pack_detail_static(pack_key, enrich=enrich)
    if not detail:
        raise_api_error(404, "INDUSTRY_PACK_NOT_FOUND", pack=pack_key)
    locale = resolve_request_locale(request, lang)
    return localize_industry_pack_detail(detail, locale)

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
def list_capabilities(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    lang: str | None = Query(None, description="Override Accept-Language (zh-CN|en-US)"),
) -> dict:
    locale = resolve_request_locale(request, lang)
    items, _ = catalog_store.list_capabilities(db)
    items, by_category = localize_capabilities(items, locale)
    return {
        "total": len(items),
        "items": items,
        "by_category": by_category,
        "locale": locale,
    }


@router.get("/hero-presets")
def hero_presets(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    lang: str | None = Query(None, description="Override Accept-Language (zh-CN|en-US)"),
) -> dict:
    locale = resolve_request_locale(request, lang)
    source = "static"
    items: list[dict[str, Any]] = []
    try:
        items = catalog_store.list_hero_presets(db)
        if items:
            source = "database"
    except SQLAlchemyError:
        try:
            db.rollback()
        except Exception:
            pass
        items = []
    if not items:
        items = catalog_store.list_hero_presets_static()
        source = "static"
    items = [localize_hero(i, locale) for i in items]
    return {"total": len(items), "items": items, "source": source, "locale": locale}


@router.get("/chip-templates")
def chip_templates(db: Annotated[Session, Depends(get_db)]) -> dict:
    try:
        items = catalog_store.list_chip_templates(db)
        if items:
            return {"total": len(items), "items": items, "source": "database"}
    except SQLAlchemyError:
        try:
            db.rollback()
        except Exception:
            pass
    items = catalog_store.list_chip_templates_static()
    return {"total": len(items), "items": items, "source": "static"}
