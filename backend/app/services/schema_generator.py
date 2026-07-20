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


def _scene_route(scene_key: str) -> str:
    slug = scene_key.replace("_", "-")
    return f"/s/{slug}" if not slug.startswith("/") else slug


def generate_menu_from_plan(menu_plan: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """场景菜单计划 → (menu, children)。每场景独立入口，可复用同一 capability widget。"""
    menu: list[dict[str, Any]] = []
    children: list[dict[str, Any]] = []
    for item in menu_plan:
        if not isinstance(item, dict):
            continue
        cap_key = str(item.get("capability_key") or item.get("key") or "").strip()
        if not cap_key:
            continue
        scene_key = str(item.get("key") or cap_key).strip()
        label = str(item.get("label") or cap_key)
        category = str(item.get("category") or "")
        route = str(item.get("route") or "").strip() or _scene_route(scene_key)
        if not route.startswith("/"):
            route = f"/{route}"
        icon = str(item.get("icon") or "module")
        node = _schema_node_for(cap_key)
        node["id"] = scene_key
        props = dict(node.get("props") or {})
        props["route"] = route
        props["scene_label"] = label
        if category:
            props["category"] = category
        if item.get("standard"):
            props["standard"] = item["standard"]
        for passthrough in (
            "approval_type",
            "default_category",
            "form_headline",
            "form_hint",
            "form_fields",
            "page_kind",
        ):
            if item.get(passthrough) is not None:
                props[passthrough] = item[passthrough]
        node["props"] = props
        children.append(node)
        menu.append(
            {
                "key": scene_key,
                "label": label,
                "icon": icon,
                "route": route,
                "category": category,
                "capability_key": cap_key,
            }
        )
    if not menu:
        return generate_menu(["chat_qa"]), [_schema_node_for("chat_qa")]
    return menu, children


def generate_page_schema(
    *,
    app_id: str,
    app_name: str,
    capability_keys: list[str],
    primary_color: str = "#4338ca",
    web_template_id: str = "tabs_portal",
    app_ui_id: str = "bottom_tabs",
    menu_plan: list[dict[str, Any]] | None = None,
    scene_groups: list[dict[str, Any]] | None = None,
    entry_source: str | None = None,
    microsite_id: str | None = None,
    publish_source: str | None = None,
) -> dict[str, Any]:
    keys = [k for k in capability_keys if k]
    if not keys:
        keys = ["chat_qa"]

    tpl = normalize_web_template_id(web_template_id)
    if menu_plan:
        menu, children = generate_menu_from_plan(menu_plan)
        # 保证 capability_keys 覆盖菜单引用
        for item in menu:
            ck = str(item.get("capability_key") or "")
            if ck and ck not in keys:
                keys.append(ck)
    else:
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
                    "subtitle": f"共 {len(menu)} 项场景 · 打开即可用",
                    "primaryColor": primary_color,
                },
            },
            *children,
        ]
    elif tpl == "sidebar_admin":
        layout_type = "sidebar"
    else:
        layout_type = "tabs" if len(menu) > 1 else "single"

    meta: dict[str, Any] = {
        "web_template_id": tpl,
        "app_ui_id": app_ui_id,
    }
    if scene_groups:
        meta["scene_groups"] = scene_groups
    if menu_plan:
        meta["menu_plan"] = menu_plan

    # 入口分流：industry_site（独立站模板皮肤）vs capship_workbench（弹幕/模块默认壳）
    entry = (entry_source or "").strip()
    if not entry:
        src = (publish_source or "").strip().lower()
        if src in ("industry", "industry_pack", "industry_site", "microsite"):
            entry = "industry_site"
        else:
            entry = "capship_workbench"
    meta["entry_source"] = entry
    if publish_source:
        meta["publish_source"] = publish_source
    mid = (microsite_id or "").strip()
    if mid:
        meta["microsite_id"] = mid

    # 独立站：强制侧栏场景工作台（标题首页 + 单场景），避免 landing/tabs 能力墙
    if entry == "industry_site":
        tpl = "sidebar_admin"
        layout_type = "sidebar"
        children = [c for c in children if c.get("type") != "landing_hero"]
        meta["web_template_id"] = tpl

    theme: dict[str, Any] = {
        "primaryColor": primary_color,
        "mode": "light",
        "templateId": tpl,
    }
    if mid:
        theme["micrositeId"] = mid
        theme["skin"] = mid

    return {
        "version": "1",
        "appId": app_id,
        "title": app_name,
        "theme": theme,
        "menu": menu,
        "capability_keys": keys,
        "meta": meta,
        "root": {
            "id": "root",
            "type": "page",
            "props": {"layout": "sidebar" if entry == "industry_site" else layout_type, "templateId": tpl},
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
