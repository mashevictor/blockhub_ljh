from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.data.industry_packs_all import pack_meta, scene_count_for_pack
from app.services.industry_enrich import enrich_industry_pack
from app.services.industry_site import build_site_config, list_all_sites
from app.db.models import (
    CatalogAgent,
    CatalogCapability,
    CatalogChipTemplate,
    CatalogHeroPreset,
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


def catalog_summary(db: Session) -> dict[str, Any]:
    office = db.query(CatalogOfficeScenario).count()
    industry = db.query(CatalogIndustryScenario).count()
    hero = db.query(CatalogHeroPreset).count()
    chips = db.query(CatalogChipTemplate).count()
    agents = db.query(CatalogAgent).count()
    return {
        "office_count": office,
        "industry_count": industry,
        "total": office + industry,
        "base_scenario_total": 145,
        "capability_count": db.query(CatalogCapability).count(),
        "agent_count": agents,
        "industry_packs": db.query(CatalogIndustryPack).count(),
        "office_groups": db.query(CatalogOfficeGroup).count(),
        "hero_preset_count": hero,
        "chip_template_count": chips,
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


def get_industry_pack_detail(
    db: Session,
    pack_key: str,
    *,
    enrich: bool = False,
) -> dict[str, Any] | None:
    meta = pack_meta(pack_key)
    pack = db.query(CatalogIndustryPack).filter(CatalogIndustryPack.key == pack_key).first()

    if pack_key == "office":
        office_rows = db.query(CatalogOfficeScenario).order_by(CatalogOfficeScenario.id).all()
        scene_dicts = [
            {
                "id": row.id,
                "name": row.name,
                "category": row.category,
                "problem": f"{row.category}标准办公场景",
                "pages": "approval+chat",
                "standard": "✓",
                "agent": row.agent.split("+")[0] if row.agent else "approval",
                "type": "office",
            }
            for row in office_rows
        ]
        pack_info = {
            "key": "office",
            "name": meta["name"] if meta else "通用办公",
            "icon": meta.get("icon", "🏢") if meta else "🏢",
            "color": meta.get("color", "#6366f1") if meta else "#6366f1",
            "tagline": meta.get("tagline", "") if meta else "",
        }
    else:
        if not pack:
            meta_fb = pack_meta(pack_key)
            if not meta_fb:
                return None
            pack_info = {
                "key": pack_key,
                "name": meta_fb["name"],
                "icon": meta_fb.get("icon", ""),
                "color": meta_fb.get("color", ""),
                "tagline": meta_fb.get("tagline", ""),
            }
            scene_dicts = [
                {
                    "id": f"{pack_key}-{i:02d}",
                    "name": s["name"],
                    "category": s["category"],
                    "problem": s.get("problem", ""),
                    "pages": s.get("pages", ""),
                    "standard": s.get("standard", "✓"),
                    "agent": s.get("agent", "approval"),
                    "type": "industry",
                }
                for i, s in enumerate(meta_fb.get("scenes") or [], start=1)
            ]
        else:
            industry_rows = (
                db.query(CatalogIndustryScenario)
                .filter(CatalogIndustryScenario.pack_key == pack_key)
                .order_by(CatalogIndustryScenario.id)
                .all()
            )
            scene_dicts = [_industry_to_dict(s) for s in industry_rows]
            pack_info = {
                "key": pack.key,
                "name": pack.name,
                "icon": pack.icon,
                "color": pack.color,
                "tagline": meta.get("tagline", "") if meta else "",
            }
            if not scene_dicts and meta:
                scene_dicts = [
                    {
                        "id": f"{pack_key}-{i:02d}",
                        "name": s["name"],
                        "category": s["category"],
                        "problem": s.get("problem", ""),
                        "pages": s.get("pages", ""),
                        "standard": s.get("standard", "✓"),
                        "agent": s.get("agent", "approval"),
                        "type": "industry",
                    }
                    for i, s in enumerate(meta.get("scenes") or [], start=1)
                ]

    grouped: dict[str, list[dict[str, Any]]] = {}
    for s in scene_dicts:
        cat = s.get("category") or "其他"
        grouped.setdefault(cat, []).append(s)

    detail: dict[str, Any] = {
        "pack": pack_info,
        "scenes": scene_dicts,
        "groups": [{"category": k, "items": v} for k, v in grouped.items()],
        "total": len(scene_dicts),
        "full_pack": True,
        "site": build_site_config(pack_key, pack_info),
    }

    if enrich:
        detail["enrichment"] = enrich_industry_pack(
            pack_key,
            scenes=scene_dicts,
            force_llm=True,
        )
    else:
        detail["enrichment"] = enrich_industry_pack(pack_key, scenes=scene_dicts, force_llm=False)

    return detail


def get_industry_pack_detail_static(
    pack_key: str,
    *,
    enrich: bool = False,
) -> dict[str, Any] | None:
    """无 PostgreSQL 时从 industry_packs_all / seed 静态构建独立站详情。"""
    from app.data.seed import OFFICE_SCENARIOS

    meta = pack_meta(pack_key)
    if not meta:
        return None

    pack_info = {
        "key": pack_key,
        "name": meta["name"],
        "icon": meta.get("icon", ""),
        "color": meta.get("color", ""),
        "tagline": meta.get("tagline", ""),
    }

    if pack_key == "office":
        scene_dicts = [
            {
                "id": row["id"],
                "name": row["name"],
                "category": row["category"],
                "problem": f"{row['category']}标准办公场景",
                "pages": "approval+chat",
                "standard": "✓",
                "agent": row["agent"].split("+")[0] if row.get("agent") else "approval",
                "type": "office",
            }
            for row in OFFICE_SCENARIOS
        ]
    else:
        scene_dicts = [
            {
                "id": f"{pack_key}-{i:02d}",
                "name": s["name"],
                "category": s["category"],
                "problem": s.get("problem", ""),
                "pages": s.get("pages", ""),
                "standard": s.get("standard", "✓"),
                "agent": s.get("agent", "approval"),
                "type": "industry",
            }
            for i, s in enumerate(meta.get("scenes") or [], start=1)
        ]

    grouped: dict[str, list[dict[str, Any]]] = {}
    for s in scene_dicts:
        cat = s.get("category") or "其他"
        grouped.setdefault(cat, []).append(s)

    detail: dict[str, Any] = {
        "pack": pack_info,
        "scenes": scene_dicts,
        "groups": [{"category": k, "items": v} for k, v in grouped.items()],
        "total": len(scene_dicts),
        "full_pack": True,
        "site": build_site_config(pack_key, pack_info),
        "source": "static",
    }
    detail["enrichment"] = enrich_industry_pack(
        pack_key,
        scenes=scene_dicts,
        force_llm=enrich,
    )
    return detail


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


def scenario_name_by_label(db: Session) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for row in db.query(CatalogOfficeScenario).all():
        mapping[row.name] = row.name
    for row in db.query(CatalogIndustryScenario).all():
        mapping[row.name] = row.name
    return mapping


def list_hero_presets(db: Session) -> list[dict[str, Any]]:
    rows = db.query(CatalogHeroPreset).order_by(CatalogHeroPreset.sort_order).all()
    return [
        {
            "id": row.id,
            "label": row.label,
            "hint": row.hint,
            "role": row.role,
            "weight": row.weight,
            "color": row.color,
            "prompt": row.prompt,
            "picks": row.picks,
            "flowLines": row.flow_lines,
        }
        for row in rows
    ]


def list_hero_presets_static() -> list[dict[str, Any]]:
    """无 PostgreSQL 时从内置 HERO_PRESETS 返回，保证 Home 首页可开。"""
    from app.data.hero_presets import HERO_PRESETS, preset_role

    return [
        {
            "id": p["id"],
            "label": p["label"],
            "hint": p["hint"],
            "role": p.get("role") or preset_role(p),
            "weight": p.get("weight", 3),
            "color": p["color"],
            "prompt": p["prompt"],
            "picks": p.get("picks") or [],
            "flowLines": p.get("flow_lines") or [],
        }
        for p in HERO_PRESETS
    ]


def list_office_scenarios_static(
    *,
    category: str | None = None,
    q: str | None = None,
    lite: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    from app.data.seed import OFFICE_SCENARIOS

    items: list[dict[str, Any]] = []
    for row in OFFICE_SCENARIOS:
        if category and row.get("category") != category:
            continue
        name = row.get("name") or ""
        if q and q.lower() not in name.lower():
            continue
        base = {
            "id": row["id"],
            "name": name,
            "category": row.get("category", ""),
            "category_icon": row.get("category_icon", ""),
            "agent": row.get("agent", ""),
            "type": "office",
        }
        items.append(base if lite else {**base, "auto_generate": row.get("auto_generate", True)})
    return items, []


def list_industry_scenarios_static(
    *,
    pack: str | None = None,
    category: str | None = None,
    q: str | None = None,
    lite: bool = False,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    from app.data.industry_packs_all import ALL_INDUSTRY_PACKS

    items: list[dict[str, Any]] = []
    for pack_row in ALL_INDUSTRY_PACKS:
        pack_key = pack_row.get("key") or ""
        if pack and pack_key != pack:
            continue
        for i, scene in enumerate(pack_row.get("scenes") or [], start=1):
            cat = scene.get("category") or "其他"
            if category and cat != category:
                continue
            name = scene.get("name") or ""
            if q and q.lower() not in name.lower():
                continue
            base = {
                "id": f"{pack_key}-{i:02d}",
                "name": name,
                "category": cat,
                "pack_key": pack_key,
                "pack_name": pack_row.get("name", ""),
                "pack_icon": pack_row.get("icon", ""),
                "problem": scene.get("problem", ""),
                "standard": scene.get("standard", "✓"),
                "agent": scene.get("agent", "approval"),
                "type": "industry",
            }
            items.append(base)
    return items, []


def list_chip_templates(db: Session) -> list[dict[str, Any]]:
    rows = db.query(CatalogChipTemplate).order_by(CatalogChipTemplate.sort_order).all()
    return [
        {
            "id": row.id,
            "text": row.text,
            "prompt": row.prompt,
            "picks": row.picks,
            "scenarioNames": row.scenario_names,
        }
        for row in rows
    ]


def list_chip_templates_static() -> list[dict[str, Any]]:
    from app.data.hero_presets import CHIP_TEMPLATES

    return [
        {
            "id": c.get("id") or f"chip-{i}",
            "text": c["text"],
            "prompt": c.get("prompt", ""),
            "picks": c.get("picks") or [],
            "scenarioNames": c.get("scenario_names") or c.get("scenarioNames") or [],
        }
        for i, c in enumerate(CHIP_TEMPLATES, start=1)
    ]
