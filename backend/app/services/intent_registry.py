"""意图 Agent 发现的行业/能力动态注册到 Catalog。"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.data.capability_registry import ALL_CAPABILITIES, CapabilityDef
from app.db.models import CatalogCapability, CatalogIndustryPack, CatalogIndustryScenario

_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]{1,30}$")


def _slug(key: str, *, prefix: str = "") -> str:
    k = key.strip().lower().replace(" ", "_").replace("-", "_")
    k = re.sub(r"[^a-z0-9_]", "", k)
    if prefix and not k.startswith(prefix):
        k = f"{prefix}{k}"
    return k[:32]


def register_from_intent(db: Session, parsed: dict[str, Any]) -> dict[str, list[str]]:
    """将 new_industries / new_capabilities / new_scenes 写入 Catalog，返回已注册 key 列表。"""
    registered: dict[str, list[str]] = {"industries": [], "capabilities": [], "scenes": []}

    pack_by_key: dict[str, CatalogIndustryPack] = {}

    for raw in parsed.get("new_industries") or []:
        key = _slug(str(raw.get("key", "")), prefix="")
        if not _SLUG_RE.match(key):
            continue
        existing = db.query(CatalogIndustryPack).filter(CatalogIndustryPack.key == key).first()
        if existing:
            pack_by_key[key] = existing
            continue
        row = CatalogIndustryPack(
            key=key,
            name=str(raw.get("name", key))[:120],
            icon=str(raw.get("icon", "📦"))[:16],
            color=str(raw.get("color", "#6366f1"))[:32],
            sort_order=900 + len(registered["industries"]),
        )
        db.add(row)
        pack_by_key[key] = row
        registered["industries"].append(key)

    existing_scene = {
        (row.pack_key, row.name)
        for row in db.query(CatalogIndustryScenario.pack_key, CatalogIndustryScenario.name).all()
    }
    next_idx = db.query(CatalogIndustryScenario).count() + 1

    for raw in parsed.get("new_scenes") or []:
        pack_key = _slug(str(raw.get("pack_key", "")))
        name = str(raw.get("name", "")).strip()[:200]
        if not pack_key or not name or (pack_key, name) in existing_scene:
            continue
        pack = pack_by_key.get(pack_key) or db.query(CatalogIndustryPack).filter(
            CatalogIndustryPack.key == pack_key,
        ).first()
        if not pack:
            continue
        sid = f"industry-{next_idx:03d}"
        while db.query(CatalogIndustryScenario).filter(CatalogIndustryScenario.id == sid).first():
            next_idx += 1
            sid = f"industry-{next_idx:03d}"
        db.add(
            CatalogIndustryScenario(
                id=sid,
                name=name,
                category=str(raw.get("category", "业务场景"))[:64],
                pack_key=pack.key,
                pack_name=pack.name,
                pack_icon=pack.icon,
                pack_color=pack.color,
                problem=str(raw.get("problem", name))[:500],
                pages=str(raw.get("pages", "approval+form"))[:64],
                standard=str(raw.get("standard", "部分"))[:32],
                agent=str(raw.get("agent", "approval"))[:64],
            ),
        )
        existing_scene.add((pack_key, name))
        registered["scenes"].append(sid)
        next_idx += 1

    existing_caps = {row.key for row in db.query(CatalogCapability.key).all()}

    for raw in parsed.get("new_capabilities") or []:
        key = _slug(str(raw.get("key", "")), prefix="custom_")
        if not key.startswith("custom_"):
            key = f"custom_{key}"
        if key in existing_caps:
            registered["capabilities"].append(key)
            continue
        name = str(raw.get("name", key))[:120]
        category = str(raw.get("category", "扩展能力"))[:64]
        db.add(
            CatalogCapability(
                key=key,
                name=name,
                category=category,
                widget="CustomWidget",
                agent_id="creation",
            ),
        )
        existing_caps.add(key)
        registered["capabilities"].append(key)
        if key not in ALL_CAPABILITIES:
            ALL_CAPABILITIES[key] = CapabilityDef(
                key=key,
                name=name,
                category=category,
                widget="CustomWidget",
                agent_id="creation",
                keywords=tuple(raw.get("keywords") or [])[:8],
            )

    if registered["industries"] or registered["capabilities"] or registered["scenes"]:
        db.commit()

    return registered
