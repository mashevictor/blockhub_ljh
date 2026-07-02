from __future__ import annotations

from sqlalchemy.orm import Session

from app.data.seed import (
    AGENTS,
    CAPABILITIES,
    INDUSTRY_PACKS,
    INDUSTRY_SCENARIOS,
    OFFICE_GROUPS,
    OFFICE_SCENARIOS,
)
from app.db.models import (
    CatalogAgent,
    CatalogCapability,
    CatalogIndustryPack,
    CatalogIndustryScenario,
    CatalogOfficeGroup,
    CatalogOfficeScenario,
)


def seed_catalog(db: Session, *, force: bool = False) -> dict[str, int]:
    """Load 114 scenarios + capabilities + agents from seed.py into PostgreSQL."""
    existing = db.query(CatalogOfficeScenario).count()
    if existing > 0 and not force:
        return catalog_counts(db)

    db.query(CatalogIndustryScenario).delete()
    db.query(CatalogOfficeScenario).delete()
    db.query(CatalogCapability).delete()
    db.query(CatalogAgent).delete()
    db.query(CatalogOfficeGroup).delete()
    db.query(CatalogIndustryPack).delete()
    db.flush()

    for agent in AGENTS:
        db.add(
            CatalogAgent(
                id=agent["id"],
                name=agent["name"],
                icon=agent.get("icon", ""),
                color=agent.get("color", ""),
                status=agent.get("status", "active"),
                description=agent.get("description", ""),
                pipeline=agent.get("pipeline", ""),
                capability_keys=agent.get("capabilities", []),
                office_count=int(agent.get("office_count", 0)),
                industry_count=int(agent.get("industry_count", 0)),
            )
        )

    for cap in CAPABILITIES:
        db.add(
            CatalogCapability(
                key=cap["key"],
                name=cap["name"],
                category=cap["category"],
                widget=cap.get("widget", ""),
                agent_id=cap["agent_id"],
            )
        )

    for idx, group in enumerate(OFFICE_GROUPS):
        db.add(
            CatalogOfficeGroup(
                id=f"group-{idx + 1:02d}",
                category=group["category"],
                icon=group.get("icon", ""),
                agent=group.get("agent", ""),
                items=group.get("items", []),
                sort_order=idx,
            )
        )

    for idx, pack in enumerate(INDUSTRY_PACKS):
        db.add(
            CatalogIndustryPack(
                key=pack["key"],
                name=pack["name"],
                icon=pack.get("icon", ""),
                color=pack.get("color", ""),
                sort_order=idx,
            )
        )

    for scenario in OFFICE_SCENARIOS:
        db.add(
            CatalogOfficeScenario(
                id=scenario["id"],
                name=scenario["name"],
                category=scenario["category"],
                category_icon=scenario.get("category_icon", ""),
                agent=scenario.get("agent", ""),
                auto_generate=scenario.get("auto_generate", ""),
            )
        )

    for scenario in INDUSTRY_SCENARIOS:
        db.add(
            CatalogIndustryScenario(
                id=scenario["id"],
                name=scenario["name"],
                category=scenario["category"],
                pack_key=scenario["pack_key"],
                pack_name=scenario.get("pack_name", ""),
                pack_icon=scenario.get("pack_icon", ""),
                pack_color=scenario.get("pack_color", ""),
                problem=scenario.get("problem", ""),
                pages=scenario.get("pages", ""),
                standard=scenario.get("standard", ""),
                agent=scenario.get("agent", ""),
            )
        )

    db.commit()
    return catalog_counts(db)


def catalog_counts(db: Session) -> dict[str, int]:
    office = db.query(CatalogOfficeScenario).count()
    industry = db.query(CatalogIndustryScenario).count()
    return {
        "agents": db.query(CatalogAgent).count(),
        "capabilities": db.query(CatalogCapability).count(),
        "office_scenarios": office,
        "industry_scenarios": industry,
        "total_scenarios": office + industry,
        "office_groups": db.query(CatalogOfficeGroup).count(),
        "industry_packs": db.query(CatalogIndustryPack).count(),
    }


def ensure_catalog_seeded(db: Session) -> dict[str, int]:
    if db.query(CatalogOfficeScenario).count() == 0:
        return seed_catalog(db)
    return catalog_counts(db)
