"""Page schema generator — capability_keys → page_schema JSON."""

from __future__ import annotations

from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES

MENU_ICONS: dict[str, str] = {
    "chat_qa": "chat",
    "chat_voice": "chat",
    "shanghai_voice": "mic",
    "shanghai_voice_stream": "mic",
    "approval_flow": "approval",
    "approval_inbox": "inbox",
    "kb_document": "book",
    "chart_dashboard": "chart",
    "notify_inapp": "bell",
}

MENU_LABELS: dict[str, str] = {
    "shanghai_voice": "上海话语音",
    "shanghai_voice_stream": "实时语音",
}


def _route_for(key: str) -> str:
    from app.services.build_manifest import _route_for as route_for

    cap = ALL_CAPABILITIES.get(key)
    widget = cap.widget if cap else key
    return route_for(key, widget)


def _schema_node_for(key: str) -> dict[str, Any]:
    cap = ALL_CAPABILITIES.get(key)
    if not cap:
        return {"id": key, "type": "section", "props": {"capability_key": key}}
    return {
        "id": key,
        "type": cap.widget.replace("Widget", "").lower() or key,
        "props": {
            "widget": cap.widget,
            "capability_key": key,
            "route": _route_for(key),
            "agent_id": cap.agent_id,
        },
    }


def generate_menu(capability_keys: list[str]) -> list[dict[str, str]]:
    menu: list[dict[str, str]] = []
    for key in capability_keys:
        cap = ALL_CAPABILITIES.get(key)
        if not cap:
            continue
        route = _route_for(key)
        menu.append(
            {
                "key": key,
                "label": MENU_LABELS.get(key, cap.name),
                "icon": MENU_ICONS.get(key, "module"),
                "route": route,
            }
        )
    if not menu:
        menu.append({"key": "home", "label": "首页", "icon": "home", "route": "/"})
    return menu


def generate_page_schema(
    *,
    app_id: str,
    app_name: str,
    capability_keys: list[str],
    primary_color: str = "#4338ca",
) -> dict[str, Any]:
    keys = [k for k in capability_keys if k]
    if not keys:
        keys = ["chat_qa"]

    children = [_schema_node_for(k) for k in keys]
    menu = generate_menu(keys)

    layout_type = "tabs" if len(children) > 1 else "single"

    return {
        "version": "1",
        "appId": app_id,
        "title": app_name,
        "theme": {"primaryColor": primary_color, "mode": "light"},
        "menu": menu,
        "capability_keys": keys,
        "root": {
            "id": "root",
            "type": "page",
            "props": {"layout": layout_type},
            "children": children,
        },
    }
