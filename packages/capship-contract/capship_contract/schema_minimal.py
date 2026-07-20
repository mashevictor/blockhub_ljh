"""Minimal page_schema builder for contract acceptance tests."""

from __future__ import annotations

from typing import Any, Mapping

from .manifest import build_manifest
from .registry_core import CapabilityDef, core_capabilities_by_key


def build_page_schema(
    capability_keys: list[str],
    *,
    title: str = "CapShip App",
    web_template_id: str = "tabs_portal",
    app_ui_id: str = "bottom_tabs",
    entry_source: str = "capship_workbench",
    registry: Mapping[str, CapabilityDef] | None = None,
) -> dict[str, Any]:
    caps = dict(registry) if registry is not None else core_capabilities_by_key()
    keys = [k for k in capability_keys if k and k in caps]
    if not keys:
        keys = [k for k in ("chat_qa",) if k in caps]

    manifest = build_manifest(
        keys,
        web_template_id=web_template_id,
        app_ui_id=app_ui_id,
        registry=caps,
    )
    menu: list[dict[str, Any]] = []
    routes: list[dict[str, Any]] = []
    for key, route, widget in zip(manifest["capability_keys"], manifest["routes"], manifest["widgets"]):
        cap = caps[key]
        label = cap.menu_label or cap.name
        menu.append(
            {
                "key": key,
                "label": label,
                "icon": cap.menu_icon or "module",
                "route": route,
            }
        )
        routes.append(
            {
                "path": route,
                "widget": widget,
                "capability_key": key,
            }
        )

    return {
        "version": "1",
        "title": title,
        "meta": {
            "entry_source": entry_source,
            "web_template_id": web_template_id,
            "app_ui_id": app_ui_id,
        },
        "menu": menu,
        "routes": routes,
        "theme": {"template": web_template_id},
    }
