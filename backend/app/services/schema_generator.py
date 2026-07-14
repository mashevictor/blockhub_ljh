"""Page schema generator — capability_keys + web_template → page_schema JSON."""

from __future__ import annotations

from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES
from app.data.delivery_templates import normalize_web_template_id
from app.services import effective_capability_registry as _effective_registry  # noqa: F401 — bootstrap seed caps


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
                "label": cap.menu_label or cap.name,
                "icon": cap.menu_icon or "module",
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
    web_template_id: str = "tabs_portal",
    app_ui_id: str = "bottom_tabs",
) -> dict[str, Any]:
    keys = [k for k in capability_keys if k]
    if not keys:
        keys = ["chat_qa"]

    tpl = normalize_web_template_id(web_template_id)
    children = [_schema_node_for(k) for k in keys]
    menu = generate_menu(keys)

    if tpl == "landing_single":
        layout_type = "landing"
        # 落地页：顶部英雄 + 能力区块，菜单仍保留便于跳转
        children = [
            {
                "id": "landing_hero",
                "type": "landing_hero",
                "props": {
                    "widget": "LandingHeroWidget",
                    "title": app_name,
                    "subtitle": f"共 {len(keys)} 项能力 · 打开即可用",
                    "primaryColor": primary_color,
                },
            },
            *children,
        ]
    elif tpl == "sidebar_admin":
        layout_type = "sidebar"
    else:
        layout_type = "tabs" if len(keys) > 1 else "single"

    return {
        "version": "1",
        "appId": app_id,
        "title": app_name,
        "theme": {
            "primaryColor": primary_color,
            "mode": "light",
            "templateId": tpl,
        },
        "menu": menu,
        "capability_keys": keys,
        "meta": {
            "web_template_id": tpl,
            "app_ui_id": app_ui_id,
        },
        "root": {
            "id": "root",
            "type": "page",
            "props": {"layout": layout_type, "templateId": tpl},
            "children": children,
        },
    }


def validate_page_schema(schema: dict[str, Any]) -> None:
    """Lightweight W3 schema validation for generated runtime contracts."""
    required_top = ("version", "appId", "title", "menu", "capability_keys", "root")
    for key in required_top:
        if key not in schema:
            raise ValueError(f"page_schema missing required field: {key}")

    root = schema.get("root")
    if not isinstance(root, dict):
        raise ValueError("page_schema.root must be an object")
    if root.get("type") != "page":
        raise ValueError("page_schema.root.type must be 'page'")

    children = root.get("children")
    if not isinstance(children, list) or not children:
        raise ValueError("page_schema.root.children must be a non-empty list")

    menu = schema.get("menu")
    if not isinstance(menu, list) or not menu:
        raise ValueError("page_schema.menu must be a non-empty list")

    routes = set()
    for item in menu:
        if not isinstance(item, dict):
            raise ValueError("page_schema.menu items must be objects")
        route = item.get("route")
        if not isinstance(route, str) or not route.startswith("/"):
            raise ValueError("page_schema.menu route must start with '/'")
        routes.add(route)

    for node in children:
        if not isinstance(node, dict):
            raise ValueError("page_schema child nodes must be objects")
        if node.get("type") in ("landing_hero", "generated_page"):
            continue
        props = node.get("props")
        if props is not None and not isinstance(props, dict):
            raise ValueError("page_schema child props must be an object")
