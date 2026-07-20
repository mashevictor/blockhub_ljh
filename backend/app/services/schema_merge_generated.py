"""将 AI 生成页合并进 AppRecord.page_schema / build_manifest.meta。

优先按 capability_key / id 补丁已有 compose 场景节点（gen_*），避免重复菜单。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.services.app_store import get_app_by_public_id


def _page_props(page: dict[str, Any], *, key: str, title: str, route: str) -> dict[str, Any]:
    props: dict[str, Any] = {
        "widget": "GeneratedPageWidget",
        "capability_key": key,
        "route": route,
        "source": "generated",
        "title": title,
        "summary": page.get("summary") or "",
        "blocks": page.get("blocks") or [],
        "codegen_pending": False,
    }
    interactive = page.get("interactive")
    if isinstance(interactive, dict):
        props["interactive"] = interactive
        props["page_mock"] = {
            "interactive": interactive,
            "ui_kind": "tool_pad",
            "form_title": title,
        }
    return props


def _patch_child(child: dict[str, Any], page: dict[str, Any]) -> dict[str, Any]:
    key = str(page.get("key") or "")
    title = str(page.get("title") or key)
    route = str(page.get("route") or f"/gen/{key}")
    base = _page_props(page, key=key, title=title, route=route)
    props = dict(child.get("props") or {})
    props.update(base)
    return {
        **child,
        "type": "generated_page",
        "props": props,
    }


def merge_generated_into_app(
    db: Session,
    *,
    public_id: str,
    generated: dict[str, Any],
) -> bool:
    record = get_app_by_public_id(db, public_id)
    if not record:
        return False

    schema = dict(record.page_schema or {})
    root = dict(schema.get("root") or {})
    children = list(root.get("children") or [])
    menu = list(schema.get("menu") or [])
    keys = list(schema.get("capability_keys") or [])

    existing_routes = {str(m.get("route")) for m in menu if isinstance(m, dict)}
    existing_ids = {str(c.get("id")) for c in children if isinstance(c, dict)}

    for page in generated.get("generated_pages") or []:
        if not isinstance(page, dict):
            continue
        key = str(page.get("key") or "").strip()
        if not key:
            continue
        title = str(page.get("title") or key)
        route = str(page.get("route") or f"/gen/{key}")
        if not route.startswith("/"):
            route = f"/{route}"

        patched = False
        for i, child in enumerate(children):
            if not isinstance(child, dict):
                continue
            props = child.get("props") if isinstance(child.get("props"), dict) else {}
            cap = str(props.get("capability_key") or "")
            cid = str(child.get("id") or "")
            if cap == key or cid == key:
                children[i] = _patch_child(child, {**page, "key": key, "route": route, "title": title})
                patched = True
                break

        if patched:
            for j, item in enumerate(menu):
                if not isinstance(item, dict):
                    continue
                if str(item.get("capability_key") or "") == key or str(item.get("key") or "") == key:
                    menu[j] = {
                        **item,
                        "label": item.get("label") or title,
                        "capability_key": key,
                    }
                    break
            if key not in keys:
                keys.append(key)
            continue

        if key in existing_ids or route in existing_routes:
            continue

        children.append(
            {
                "id": key,
                "type": "generated_page",
                "props": _page_props(page, key=key, title=title, route=route),
            }
        )
        menu.append(
            {
                "key": key,
                "label": title,
                "icon": "sparkles",
                "route": route,
                "capability_key": key,
            }
        )
        if key not in keys:
            keys.append(key)
        existing_ids.add(key)
        existing_routes.add(route)

    root["children"] = children
    schema["root"] = root
    schema["menu"] = menu
    schema["capability_keys"] = keys
    meta = dict(schema.get("meta") or {})
    meta["generated"] = {
        "pages": generated.get("generated_pages") or [],
        "flutter_screens": generated.get("generated_flutter_screens") or [],
        "llm": bool(generated.get("llm")),
    }
    schema["meta"] = meta

    manifest = dict(record.build_manifest or {})
    mmeta = dict(manifest.get("meta") or {})
    mmeta["generated_flutter_screens"] = generated.get("generated_flutter_screens") or []
    manifest["meta"] = mmeta

    record.page_schema = schema
    record.build_manifest = manifest
    record.capability_keys = keys
    db.add(record)
    db.commit()
    return True


def apply_generated_pages_to_schema(
    schema: dict[str, Any],
    generated_pages: list[dict[str, Any]],
) -> dict[str, Any]:
    """纯函数：把 generated_pages 合并进内存 schema（供 Runtime 草稿轮询）。"""
    next_schema = dict(schema or {})
    root = dict(next_schema.get("root") or {})
    children = list(root.get("children") or [])
    menu = list(next_schema.get("menu") or [])
    keys = list(next_schema.get("capability_keys") or [])

    for page in generated_pages:
        if not isinstance(page, dict):
            continue
        key = str(page.get("key") or "").strip()
        if not key:
            continue
        title = str(page.get("title") or key)
        route = str(page.get("route") or f"/gen/{key}")
        patched = False
        for i, child in enumerate(children):
            if not isinstance(child, dict):
                continue
            props = child.get("props") if isinstance(child.get("props"), dict) else {}
            if str(props.get("capability_key") or "") == key or str(child.get("id") or "") == key:
                children[i] = _patch_child(child, {**page, "key": key, "route": route, "title": title})
                patched = True
                break
        if patched:
            if key not in keys:
                keys.append(key)
            continue
        children.append(
            {
                "id": key,
                "type": "generated_page",
                "props": _page_props(page, key=key, title=title, route=route),
            }
        )
        if not any(isinstance(m, dict) and str(m.get("capability_key") or "") == key for m in menu):
            menu.append(
                {
                    "key": key,
                    "label": title,
                    "icon": "sparkles",
                    "route": route,
                    "capability_key": key,
                }
            )
        if key not in keys:
            keys.append(key)

    root["children"] = children
    next_schema["root"] = root
    next_schema["menu"] = menu
    next_schema["capability_keys"] = keys
    return next_schema
