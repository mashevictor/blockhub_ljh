"""Resolve capability_keys from scenarios, modules, and explicit keys."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.data.schema_templates import resolve_capability_keys
from app.services.effective_capability_registry import (
    CapabilityAssemblyMeta,
    hydrate_approved_custom_capabilities,
    is_registry_key,
)


def _collect_requested(
    *,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    def add(key: str) -> None:
        k = (key or "").strip()
        if not k or k in seen:
            return
        seen.add(k)
        ordered.append(k)

    if capability_keys:
        for k in capability_keys:
            add(str(k))
    if modules:
        for m in modules:
            if isinstance(m, dict) and m.get("key"):
                add(str(m["key"]))
    return ordered


def resolve_publish_capability_keys(
    *,
    scenario_names: list[str] | None,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
    industry_key: str = "office",
    db: Session | None = None,
    tenant_id: str | None = None,
) -> list[str]:
    result = resolve_publish_capability_keys_detailed(
        scenario_names=scenario_names,
        capability_keys=capability_keys,
        modules=modules,
        industry_key=industry_key,
        db=db,
        tenant_id=tenant_id,
    )
    return result.resolved_keys


def resolve_publish_capability_keys_detailed(
    *,
    scenario_names: list[str] | None,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
    industry_key: str = "office",
    db: Session | None = None,
    tenant_id: str | None = None,
) -> CapabilityAssemblyMeta:
    if db is not None and tenant_id:
        hydrate_approved_custom_capabilities(db, tenant_id)

    requested = _collect_requested(capability_keys=capability_keys, modules=modules)
    explicit_ok = [k for k in requested if is_registry_key(k)]
    dropped = [k for k in requested if not is_registry_key(k)]

    resolved_raw = resolve_capability_keys(
        scenario_names=scenario_names,
        explicit_keys=explicit_ok or None,
        industry_key=industry_key,
    )
    resolved = [k for k in resolved_raw if is_registry_key(k)]
    orphan = [k for k in resolved_raw if k not in resolved]
    all_dropped = list(dict.fromkeys([*dropped, *orphan]))
    scenario_added = [k for k in resolved if k not in explicit_ok]

    return CapabilityAssemblyMeta(
        requested_keys=requested,
        resolved_keys=resolved,
        dropped_keys=all_dropped,
        scenario_added_keys=scenario_added,
    )
