from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    CatalogAgent,
    CatalogCapability,
    CatalogIndustryPack,
    CatalogIndustryScenario,
    CatalogOfficeGroup,
    CatalogOfficeScenario,
)


def _office_to_dict(row: CatalogOfficeScenario, *, lite: bool = False) -> dict[str, Any]:
    base = {
        "id": row.id,
        "name": row.name,
        "category": row.category,
        "category_icon": row.category_icon,
        "agent": row.agent,
        "type": "office",
    }
    if lite:
        return base
    return {**base, "auto_generate": row.auto_generate}


def _industry_to_dict(row: CatalogIndustryScenario, *, lite: bool = False) -> dict[str, Any]:
    base = {
        "id": row.id,
        "name": row.name,
        "category": row.category,
        "pack_key": row.pack_key,
        "pack_name": row.pack_name,
        "pack_icon": row.pack_icon,
        "problem": row.problem,
        "standard": row.standard,
        "agent": row.agent,
        "type": "industry",
    }
    if lite:
        return base
    return {**base, "pack_color": row.pack_color, "pages": row.pages}


def catalog_summary(db: Session) -> dict[str, int]:
    office = db.query(CatalogOfficeScenario).count()
    industry = db.query(CatalogIndustryScenario).count()
    return {
        "office_count": office,
        "industry_count": industry,
        "total": office + industry,
        "capability_count": db.query(CatalogCapability).count(),
        "industry_packs": db.query(CatalogIndustryPack).count(),
        "office_groups": db.query(CatalogOfficeGroup).count(),
        "source": "database",
    }


def list_office_scenarios(
    db: Session,
    *,
    category: str | None = None,
    q: str | None = None,
    lite: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    query = db.query(CatalogOfficeScenario).order_by(CatalogOfficeScenario.id)
    if category:
        query = query.filter(CatalogOfficeScenario.category == category)
    rows = query.all()
    if q:
        rows = [r for r in rows if q.lower() in r.name.lower()]
    items = [_office_to_dict(r, lite=lite) for r in rows]
    groups = [] if lite else list_office_groups(db)
    return items, groups


def list_office_groups(db: Session) -> list[dict[str, Any]]:
    rows = db.query(CatalogOfficeGroup).order_by(CatalogOfficeGroup.sort_order).all()
    return [
        {
            "category": row.category,
            "icon": row.icon,
            "agent": row.agent,
            "items": row.items,
        }
        for row in rows
    ]


def list_industry_scenarios(
    db: Session,
    *,
    pack: str | None = None,
    category: str | None = None,
    q: str | None = None,
    lite: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    query = db.query(CatalogIndustryScenario).order_by(CatalogIndustryScenario.id)
    if pack:
        query = query.filter(CatalogIndustryScenario.pack_key == pack)
    if category:
        query = query.filter(CatalogIndustryScenario.category == category)
    rows = query.all()
    if q:
        rows = [r for r in rows if q.lower() in r.name.lower()]
    items = [_industry_to_dict(r, lite=lite) for r in rows]
    packs = [] if lite else list_industry_packs(db)
    return items, packs


def list_industry_packs(db: Session) -> list[dict[str, Any]]:
    rows = db.query(CatalogIndustryPack).order_by(CatalogIndustryPack.sort_order).all()
    return [
        {
            "key": row.key,
            "name": row.name,
            "icon": row.icon,
            "color": row.color,
        }
        for row in rows
    ]


def get_industry_pack_detail(db: Session, pack_key: str) -> dict[str, Any] | None:
    pack = db.query(CatalogIndustryPack).filter(CatalogIndustryPack.key == pack_key).first()
    if not pack:
        return None
    scenes = (
        db.query(CatalogIndustryScenario)
        .filter(CatalogIndustryScenario.pack_key == pack_key)
        .order_by(CatalogIndustryScenario.id)
        .all()
    )
    return {
        "pack": {
            "key": pack.key,
            "name": pack.name,
            "icon": pack.icon,
            "color": pack.color,
        },
        "scenes": [_industry_to_dict(s) for s in scenes],
        "total": len(scenes),
    }


def list_all_scenarios(
    db: Session,
    *,
    type: str | None = None,
    q: str | None = None,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if type in (None, "office"):
        office_items, _ = list_office_scenarios(db, q=q)
        items.extend(office_items)
    if type in (None, "industry"):
        industry_items, _ = list_industry_scenarios(db, q=q)
        items.extend(industry_items)
    return items


def list_capabilities(db: Session) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    rows = db.query(CatalogCapability).order_by(CatalogCapability.key).all()
    items = [
        {
            "key": row.key,
            "name": row.name,
            "category": row.category,
            "widget": row.widget,
            "agent_id": row.agent_id,
        }
        for row in rows
    ]
    by_category: dict[str, list[dict[str, Any]]] = {}
    for item in items:
        by_category.setdefault(item["category"], []).append(item)
    return items, by_category


def list_agents(db: Session) -> list[dict[str, Any]]:
    rows = db.query(CatalogAgent).order_by(CatalogAgent.id).all()
    return [
        {
            "id": row.id,
            "name": row.name,
            "icon": row.icon,
            "color": row.color,
            "status": row.status,
            "description": row.description,
            "pipeline": row.pipeline,
            "capabilities": row.capability_keys,
            "office_count": row.office_count,
            "industry_count": row.industry_count,
        }
        for row in rows
    ]


def get_agent(db: Session, agent_id: str) -> dict[str, Any] | None:
    row = db.query(CatalogAgent).filter(CatalogAgent.id == agent_id).first()
    if not row:
        return None
    caps = db.query(CatalogCapability).filter(CatalogCapability.agent_id == agent_id).all()
    return {
        "agent": {
            "id": row.id,
            "name": row.name,
            "icon": row.icon,
            "color": row.color,
            "status": row.status,
            "description": row.description,
            "pipeline": row.pipeline,
            "capabilities": row.capability_keys,
            "office_count": row.office_count,
            "industry_count": row.industry_count,
        },
        "capabilities": [
            {
                "key": c.key,
                "name": c.name,
                "category": c.category,
                "widget": c.widget,
                "agent_id": c.agent_id,
            }
            for c in caps
        ],
    }


def scenario_name_map(db: Session) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in db.query(CatalogOfficeScenario).all():
        mapping[row.id] = row.name
    for row in db.query(CatalogIndustryScenario).all():
        mapping[row.id] = row.name
    return mapping
