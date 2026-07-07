"""Resolve capability_keys from scenarios, modules, and explicit keys."""

from __future__ import annotations

from app.data.schema_templates import resolve_capability_keys


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
        explicit_keys=explicit or None,
        industry_key=industry_key,
    )
