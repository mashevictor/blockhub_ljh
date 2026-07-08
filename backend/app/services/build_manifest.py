"""Build manifest — Web/App package list from capability_keys."""

from __future__ import annotations

from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES

# Convention-based web package names (physical packages under packages/)
WEB_PKG_PREFIX = "@blockhub/web-capability"

# Keys whose folder name differs from slug (must match runtime-web/vite aliases)
WEB_PKG_OVERRIDES: dict[str, str] = {
    "chat_qa": f"{WEB_PKG_PREFIX}-chat",
    "chat_voice": f"{WEB_PKG_PREFIX}-chat",
    "shanghai_voice": f"{WEB_PKG_PREFIX}-voice",
    "shanghai_voice_stream": f"{WEB_PKG_PREFIX}-voice",
    "approval_flow": f"{WEB_PKG_PREFIX}-approval",
    "approval_inbox": f"{WEB_PKG_PREFIX}-approval",
    "kb_document": f"{WEB_PKG_PREFIX}-kb",
    "chart_dashboard": f"{WEB_PKG_PREFIX}-dashboard",
    "chart_funnel": f"{WEB_PKG_PREFIX}-dashboard",
    "notify_inapp": f"{WEB_PKG_PREFIX}-dashboard",
}


def _web_pkg(key: str) -> str | None:
    if key in WEB_PKG_OVERRIDES:
        return WEB_PKG_OVERRIDES[key]
    cap = ALL_CAPABILITIES.get(key)
    if not cap or not cap.widget:
        return None
    slug = key.replace("_", "-")
    return f"{WEB_PKG_PREFIX}-{slug}"


def _flutter_pkg(key: str) -> str:
    cap = ALL_CAPABILITIES.get(key)
    if cap and cap.flutter_pkg:
        return cap.flutter_pkg.split("+")[0].strip().split()[0]
    return f"capability_{key}"


def _route_for(key: str, widget: str) -> str:
    routes = {
        "shanghai_voice": "/voice",
        "shanghai_voice_stream": "/voice",
        "chat_qa": "/chat",
        "chat_voice": "/chat",
        "approval_flow": "/approval",
        "approval_inbox": "/inbox",
        "kb_document": "/kb",
        "chart_dashboard": "/dashboard",
        "notify_inapp": "/notifications",
    }
    return routes.get(key, f"/{key.replace('_', '-')}")


def build_manifest(
    capability_keys: list[str],
    *,
    deliver: str = "both",
) -> dict[str, Any]:
    keys = [k for k in capability_keys if k]
    if not keys:
        keys = ["chat_qa"]

    widgets: list[str] = []
    routes: list[str] = []
    web_pkgs: list[str] = []
    flutter_pkgs: list[str] = []
    agents: list[str] = []

    for key in keys:
        cap = ALL_CAPABILITIES.get(key)
        if not cap:
            continue
        pkg = _web_pkg(key)
        widgets.append(cap.widget)
        routes.append(_route_for(key, cap.widget))
        if pkg and pkg not in web_pkgs:
            web_pkgs.append(pkg)
        fp = _flutter_pkg(key)
        if fp and fp not in flutter_pkgs:
            flutter_pkgs.append(fp)
        if cap.agent_id and cap.agent_id not in agents:
            agents.append(cap.agent_id)

    return {
        "version": "1",
        "capability_keys": keys,
        "widgets": widgets,
        "routes": routes,
        "web_pkgs": web_pkgs,
        "flutter_pkgs": flutter_pkgs,
        "agents": agents,
        "deliver": deliver,
    }
