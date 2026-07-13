"""Build manifest — Web/App package list from capability_keys."""

from __future__ import annotations

from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES
from app.services import effective_capability_registry as _effective_registry  # noqa: F401 — bootstrap seed caps

# Convention-based web package names (physical packages under packages/)
WEB_PKG_PREFIX = "@blockhub/web-capability"


def _web_pkg(key: str) -> str | None:
    cap = ALL_CAPABILITIES.get(key)
    if not cap or not cap.widget:
        return None
    # Flutter 工具能力默认无 Web 包，避免 manifest 列出不存在的 web-capability-flutter-*
    if cap.category == "Flutter工具" and cap.flutter_pkg:
        return None
    # 优先用注册表显式字段；留空走约定 web-capability-{slug}
    if cap.web_pkg:
        return cap.web_pkg
    slug = key.replace("_", "-")
    return f"{WEB_PKG_PREFIX}-{slug}"


def _flutter_pkg(key: str) -> str:
    cap = ALL_CAPABILITIES.get(key)
    if cap and cap.flutter_pkg:
        return cap.flutter_pkg.split("+")[0].strip().split()[0]
    return f"capability_{key}"


def _route_for(key: str, widget: str) -> str:
    cap = ALL_CAPABILITIES.get(key)
    # 优先用注册表显式字段；留空走约定 /{slug}
    if cap and cap.route:
        return cap.route
    return f"/{key.replace('_', '-')}"


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
