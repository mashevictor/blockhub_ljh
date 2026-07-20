"""Build manifest from capability keys + registry map."""

from __future__ import annotations

from typing import Any, Mapping

from .registry_core import CapabilityDef, core_capabilities_by_key
from .vendor import pub_pkg_prefix, web_pkg_prefix


def _web_pkg(cap: CapabilityDef | None, key: str, prefix: str) -> str | None:
    if not cap or not cap.widget:
        return None
    if cap.category == "Flutter工具" and cap.flutter_pkg:
        return None
    if cap.web_pkg:
        return cap.web_pkg
    slug = key.replace("_", "-")
    return f"{prefix}-{slug}"


def _flutter_pkg(cap: CapabilityDef | None, key: str) -> str:
    prefix = pub_pkg_prefix()
    if cap and cap.flutter_pkg:
        raw = cap.flutter_pkg.split("+")[0].strip().split()[0]
        if "+" in cap.flutter_pkg or "/" in cap.flutter_pkg or not raw.startswith(prefix.rstrip("_")):
            return f"{prefix.rstrip('_')}_{key}" if not prefix.endswith("_") else f"{prefix}{key}"
        return raw
    if prefix.endswith("_"):
        return f"{prefix}{key}"
    return f"{prefix}_{key}"


def _route_for(cap: CapabilityDef | None, key: str) -> str:
    if cap and cap.route:
        return cap.route
    return f"/{key.replace('_', '-')}"


def build_manifest(
    capability_keys: list[str],
    *,
    deliver: str = "both",
    web_template_id: str = "tabs_portal",
    app_ui_id: str = "bottom_tabs",
    registry: Mapping[str, CapabilityDef] | None = None,
    pkg_prefix: str | None = None,
) -> dict[str, Any]:
    caps = dict(registry) if registry is not None else core_capabilities_by_key()
    prefix = (pkg_prefix or web_pkg_prefix()).rstrip("-")
    keys = [k for k in capability_keys if k]
    if not keys:
        keys = ["chat_qa"]

    widgets: list[str] = []
    routes: list[str] = []
    web_pkgs: list[str] = []
    flutter_pkgs: list[str] = []
    agents: list[str] = []

    for key in keys:
        cap = caps.get(key)
        if not cap:
            continue
        pkg = _web_pkg(cap, key, prefix)
        widgets.append(cap.widget)
        routes.append(_route_for(cap, key))
        if pkg and pkg not in web_pkgs:
            web_pkgs.append(pkg)
        fp = _flutter_pkg(cap, key)
        if fp and fp not in flutter_pkgs:
            flutter_pkgs.append(fp)
        if cap.agent_id and cap.agent_id not in agents:
            agents.append(cap.agent_id)

    return {
        "version": "1",
        "capability_keys": keys,
        "meta": {
            "web_template_id": web_template_id,
            "app_ui_id": app_ui_id,
        },
        "widgets": widgets,
        "routes": routes,
        "web_pkgs": web_pkgs,
        "flutter_pkgs": flutter_pkgs,
        "agents": agents,
        "deliver": deliver,
    }
