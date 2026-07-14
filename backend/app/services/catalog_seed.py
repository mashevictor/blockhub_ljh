from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, pack_meta
from app.data.hero_presets import CHIP_TEMPLATES, HERO_PRESETS, preset_role
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
    CatalogChipTemplate,
    CatalogHeroPreset,
    CatalogIndustryPack,
    CatalogIndustryScenario,
    CatalogOfficeGroup,
    CatalogOfficeScenario,
)


def _seed_hero_and_chips(db: Session) -> None:
    db.query(CatalogChipTemplate).delete()
    db.query(CatalogHeroPreset).delete()
    db.flush()

    for idx, preset in enumerate(HERO_PRESETS):
        db.add(
            CatalogHeroPreset(
                id=preset["id"],
                label=preset["label"],
                hint=preset["hint"],
                role=preset.get("role") or preset_role(preset),
                weight=int(preset.get("weight", 3)),
                color=preset.get("color", ""),
                prompt=preset["prompt"],
                picks=preset["picks"],
                flow_lines=preset["flow_lines"],
                sort_order=idx,
            )
        )

    for idx, chip in enumerate(CHIP_TEMPLATES):
        db.add(
            CatalogChipTemplate(
                id=str(uuid4()),
                text=chip["text"],
                prompt=chip["prompt"],
                picks=chip["picks"],
                scenario_names=chip.get("scenario_names", []),
                sort_order=idx,
            )
        )


def _seed_extra_scenarios(db: Session) -> int:
    """英雄区/快捷示例里的场景 id 若不在 114 清单中，补进 office 场景表。"""
    existing_ids = {row.id for row in db.query(CatalogOfficeScenario.id).all()}
    existing_names = {row.name for row in db.query(CatalogOfficeScenario.name).all()}
    added = 0

    def add_pick(pick: dict) -> None:
        nonlocal added
        if pick.get("type") != "scenario":
            return
        key = pick.get("key", "")
        label = pick.get("label", "")
        if not key or not label:
            return
        sid = key
        if sid in existing_ids:
            return
        if label in existing_names:
            return
        db.add(
            CatalogOfficeScenario(
                id=sid,
                name=label,
                category="英雄区推荐",
                category_icon="✨",
                agent="creation",
                auto_generate="来自英雄区/快捷示例的用户场景",
            )
        )
        existing_ids.add(sid)
        existing_names.add(label)
        added += 1

    for preset in HERO_PRESETS:
        for pick in preset["picks"]:
            add_pick(pick)
    for chip in CHIP_TEMPLATES:
        for pick in chip["picks"]:
            add_pick(pick)
    return added


def seed_catalog(db: Session, *, force: bool = False) -> dict[str, int]:
    """Load catalog + hero presets + chips into PostgreSQL."""
    existing = db.query(CatalogOfficeScenario).count()
    if existing > 0 and not force:
        sync_catalog_delta(db)
        return catalog_counts(db)

    db.query(CatalogIndustryScenario).delete()
    db.query(CatalogOfficeScenario).delete()
    db.query(CatalogCapability).delete()
    db.query(CatalogAgent).delete()
    db.query(CatalogOfficeGroup).delete()
    db.query(CatalogIndustryPack).delete()
    db.query(CatalogChipTemplate).delete()
    db.query(CatalogHeroPreset).delete()
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

    _seed_hero_and_chips(db)
    extra = _seed_extra_scenarios(db)
    db.commit()
    counts = catalog_counts(db)
    counts["extra_scenarios"] = extra
    counts["message"] = "114 base + hero extras in office table; hero_presets=30, chips=5"
    return counts


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
        "hero_presets": db.query(CatalogHeroPreset).count(),
        "chip_templates": db.query(CatalogChipTemplate).count(),
    }


def sync_industry_packs_delta(db: Session) -> int:
    """增量同步 20 行业深度包与场景，无需 force 全量重建。"""
    existing_packs = {row.key for row in db.query(CatalogIndustryPack.key).all()}
    existing_scene_keys = {
        (row.pack_key, row.name)
        for row in db.query(CatalogIndustryScenario.pack_key, CatalogIndustryScenario.name).all()
    }
    added = 0

    for idx, pack in enumerate(ALL_INDUSTRY_PACKS):
        if pack["key"] not in existing_packs:
            db.add(
                CatalogIndustryPack(
                    key=pack["key"],
                    name=pack["name"],
                    icon=pack.get("icon", ""),
                    color=pack.get("color", ""),
                    sort_order=idx,
                )
            )
            added += 1

    db.flush()

    next_idx = db.query(CatalogIndustryScenario).count() + 1
    for pack in ALL_INDUSTRY_PACKS:
        for scene in pack.get("scenes") or []:
            key = (pack["key"], scene["name"])
            if key in existing_scene_keys:
                continue
            sid = f"industry-{next_idx:03d}"
            while db.query(CatalogIndustryScenario).filter(CatalogIndustryScenario.id == sid).first():
                next_idx += 1
                sid = f"industry-{next_idx:03d}"
            db.add(
                CatalogIndustryScenario(
                    id=sid,
                    name=scene["name"],
                    category=scene["category"],
                    pack_key=pack["key"],
                    pack_name=pack["name"],
                    pack_icon=pack.get("icon", ""),
                    pack_color=pack.get("color", ""),
                    problem=scene.get("problem", ""),
                    pages=scene.get("pages", ""),
                    standard=scene.get("standard", "✓"),
                    agent=scene.get("agent", "approval"),
                )
            )
            existing_scene_keys.add(key)
            next_idx += 1
            added += 1

    return added


def sync_catalog_delta(db: Session) -> int:
    """增量同步 seed 中新增的 Agent/能力，无需 force 全量重建。"""
    existing_agents = {row.id for row in db.query(CatalogAgent.id).all()}
    existing_caps = {row.key for row in db.query(CatalogCapability.key).all()}
    added = 0

    for agent in AGENTS:
        if agent["id"] in existing_agents:
            continue
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
        added += 1

    for cap in CAPABILITIES:
        if cap["key"] in existing_caps:
            continue
        db.add(
            CatalogCapability(
                key=cap["key"],
                name=cap["name"],
                category=cap["category"],
                widget=cap.get("widget", ""),
                agent_id=cap["agent_id"],
            )
        )
        added += 1

    # 英雄区弹幕预设：新增或回写 picks/flow_lines（避免线上仍显示默认「一键生成」）
    existing_presets = {row.id: row for row in db.query(CatalogHeroPreset).all()}
    for idx, preset in enumerate(HERO_PRESETS):
        role = preset.get("role") or preset_role(preset)
        row = existing_presets.get(preset["id"])
        if row is None:
            db.add(
                CatalogHeroPreset(
                    id=preset["id"],
                    label=preset["label"],
                    hint=preset.get("hint", ""),
                    role=role,
                    weight=int(preset.get("weight", 3)),
                    color=preset.get("color", ""),
                    prompt=preset["prompt"],
                    picks=preset["picks"],
                    flow_lines=preset["flow_lines"],
                    sort_order=idx,
                )
            )
            added += 1
            continue
        changed = False
        for field, value in (
            ("label", preset["label"]),
            ("hint", preset.get("hint", "")),
            ("role", role),
            ("weight", int(preset.get("weight", 3))),
            ("color", preset.get("color", "")),
            ("prompt", preset["prompt"]),
            ("picks", preset["picks"]),
            ("flow_lines", preset["flow_lines"]),
            ("sort_order", idx),
        ):
            if getattr(row, field) != value:
                setattr(row, field, value)
                changed = True
        if changed:
            added += 1

    existing_chips = {row.text: row for row in db.query(CatalogChipTemplate).all()}
    for idx, chip in enumerate(CHIP_TEMPLATES):
        row = existing_chips.get(chip["text"])
        if row is None:
            db.add(
                CatalogChipTemplate(
                    id=str(uuid4()),
                    text=chip["text"],
                    prompt=chip["prompt"],
                    picks=chip["picks"],
                    scenario_names=chip.get("scenario_names", []),
                    sort_order=idx,
                )
            )
            added += 1
            continue
        changed = False
        for field, value in (
            ("prompt", chip["prompt"]),
            ("picks", chip["picks"]),
            ("scenario_names", chip.get("scenario_names", [])),
            ("sort_order", idx),
        ):
            if getattr(row, field) != value:
                setattr(row, field, value)
                changed = True
        if changed:
            added += 1

    industry_added = sync_industry_packs_delta(db)
    added += industry_added

    if added:
        db.commit()
    return added


def ensure_catalog_seeded(db: Session) -> dict[str, int]:
    if db.query(CatalogOfficeScenario).count() == 0:
        return seed_catalog(db)
    if db.query(CatalogHeroPreset).count() == 0:
        _seed_hero_and_chips(db)
        extra = _seed_extra_scenarios(db)
        db.commit()
        counts = catalog_counts(db)
        counts["extra_scenarios"] = extra
        sync_catalog_delta(db)
        return catalog_counts(db)
    sync_catalog_delta(db)
    return catalog_counts(db)
