"""Resolve capability_keys from scenarios, modules, and explicit keys."""

from __future__ import annotations

from app.data.capability_registry import ALL_CAPABILITIES
from app.data.schema_templates import resolve_capability_keys


def _registry_keys(keys: list[str]) -> list[str]:
    """Only keys present in ALL_CAPABILITIES can be assembled into page_schema."""
    return [k for k in keys if k and k in ALL_CAPABILITIES]


def resolve_publish_capability_keys(
    *,
    scenario_names: list[str] | None,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
    industry_key: str = "office",
) -> list[str]:
    explicit: list[str] = []
    if capability_keys:
        explicit.extend(capability_keys)
    if modules:
        for m in modules:
            if isinstance(m, dict) and m.get("key"):
                explicit.append(str(m["key"]))

    return resolve_capability_keys(
        scenario_names=scenario_names,
        explicit_keys=_registry_keys(explicit) or None,
        industry_key=industry_key,
    )
