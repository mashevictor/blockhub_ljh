"""Build manifest — Web/App package list from capability_keys."""

from __future__ import annotations

from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES

# Convention-based web package names (physical packages under packages/)
WEB_PKG_PREFIX = "@blockhub/web-capability"


def _web_pkg(key: str) -> str:
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
        widgets.append(cap.widget)
        routes.append(_route_for(key, cap.widget))
        web_pkgs.append(_web_pkg(key))
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
