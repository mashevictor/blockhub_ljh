from fastapi import APIRouter, HTTPException, Query

from app.data.seed import (
    CAPABILITIES,
    INDUSTRY_PACKS,
    INDUSTRY_SCENARIOS,
    OFFICE_GROUPS,
    OFFICE_SCENARIOS,
)

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/summary")
def catalog_summary() -> dict:
    return {
        "office_count": len(OFFICE_SCENARIOS),
        "industry_count": len(INDUSTRY_SCENARIOS),
        "total": len(OFFICE_SCENARIOS) + len(INDUSTRY_SCENARIOS),
        "capability_count": len(CAPABILITIES),
        "industry_packs": len(INDUSTRY_PACKS),
        "office_groups": len(OFFICE_GROUPS),
    }


@router.get("/office")
def list_office(
    category: str | None = Query(None, description="Filter by category name"),
    q: str | None = Query(None, description="Search by scenario name"),
) -> dict:
    items = OFFICE_SCENARIOS
    if category:
        items = [s for s in items if s["category"] == category]
    if q:
        items = [s for s in items if q.lower() in s["name"].lower()]
    return {"total": len(items), "items": items, "groups": OFFICE_GROUPS}


@router.get("/office/groups")
def office_groups() -> dict:
    return {"groups": OFFICE_GROUPS, "total_scenarios": len(OFFICE_SCENARIOS)}


@router.get("/industry")
def list_industry(
    pack: str | None = Query(None, description="Filter by pack key: mfg|sales|med|game"),
    category: str | None = Query(None, description="Filter by sub-category e.g. 临床知识"),
    q: str | None = Query(None, description="Search by scenario name"),
) -> dict:
    items = INDUSTRY_SCENARIOS
    if pack:
        items = [s for s in items if s["pack_key"] == pack]
    if category:
        items = [s for s in items if s["category"] == category]
    if q:
        items = [s for s in items if q.lower() in s["name"].lower()]
    return {"total": len(items), "items": items, "packs": INDUSTRY_PACKS}


@router.get("/industry/{pack_key}")
def industry_pack_detail(pack_key: str) -> dict:
    pack = next((p for p in INDUSTRY_PACKS if p["key"] == pack_key), None)
    if not pack:
        raise HTTPException(status_code=404, detail=f"Industry pack '{pack_key}' not found")
    scenes = [s for s in INDUSTRY_SCENARIOS if s["pack_key"] == pack_key]
    return {"pack": pack, "scenes": scenes, "total": len(scenes)}


@router.get("/scenarios")
def list_all_scenarios(
    type: str | None = Query(None, description="office|industry"),
    q: str | None = Query(None),
) -> dict:
    items = []
    if type in (None, "office"):
        items.extend(OFFICE_SCENARIOS)
    if type in (None, "industry"):
        items.extend(INDUSTRY_SCENARIOS)
    if q:
        items = [s for s in items if q.lower() in s["name"].lower()]
    return {"total": len(items), "items": items}


@router.get("/modules")
def list_capabilities() -> dict:
    by_category: dict[str, list] = {}
    for cap in CAPABILITIES:
        by_category.setdefault(cap["category"], []).append(cap)
    return {"total": len(CAPABILITIES), "items": CAPABILITIES, "by_category": by_category}
