"""将 AI 生成页合并进 AppRecord.page_schema / build_manifest.meta。"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.db.models import AppRecord
from app.services.app_store import get_app_by_public_id


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
        key = str(page.get("key") or "")
        route = str(page.get("route") or f"/gen/{key}")
        title = str(page.get("title") or key)
        if key in existing_ids or route in existing_routes:
            continue
        children.append(
            {
                "id": key,
                "type": "generated_page",
                "props": {
                    "widget": "GeneratedPageWidget",
                    "capability_key": key,
                    "route": route,
                    "source": "generated",
                    "title": title,
                    "summary": page.get("summary") or "",
                    "blocks": page.get("blocks") or [],
                },
            }
        )
        menu.append(
            {
                "key": key,
                "label": title,
                "icon": "sparkles",
                "route": route,
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
    # 保留官方 keys；生成 key 也可能记入 capability_keys 便于菜单
    record.capability_keys = keys
    db.add(record)
    db.commit()
    return True
