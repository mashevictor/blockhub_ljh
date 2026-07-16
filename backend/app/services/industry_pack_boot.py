"""行业包 Runtime 启动 — 与发布装配同源（assemble_industry_pack → schema + manifest）。"""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.data.industry_packs_all import pack_meta
from app.services.build_manifest import build_manifest
from app.services.scene_capability_map import assemble_industry_pack
from app.services.schema_generator import generate_page_schema, validate_page_schema


def preview_public_id(pack_key: str) -> str:
    return f"preview-{pack_key}"


def boot_industry_pack(pack_key: str) -> dict[str, Any]:
    """行业包真 Runtime 启动数据（预览 / 方案站入口，与发布后装配一致）。"""
    meta = pack_meta(pack_key)
    if not meta:
        raise ValueError(f"未知行业包: {pack_key}")

    assembly = assemble_industry_pack(pack_key)
    if not assembly.get("scene_count"):
        raise ValueError(f"行业包 {pack_key} 无可装配场景")

    pack_name = str(assembly.get("pack_name") or meta.get("name") or pack_key)
    color = str(meta.get("color") or "#4338ca")
    keys = list(assembly["capability_keys"])
    menu_plan = list(assembly.get("menu_plan") or [])
    scene_groups = list(assembly.get("groups") or [])
    virtual_id = preview_public_id(pack_key)

    schema = generate_page_schema(
        app_id=virtual_id,
        app_name=f"{pack_name}工作台",
        capability_keys=keys,
        primary_color=color,
        web_template_id="tabs_portal",
        app_ui_id="bottom_tabs",
        menu_plan=menu_plan,
        scene_groups=scene_groups,
    )
    meta_block = dict(schema.get("meta") or {})
    meta_block.update(
        {
            "industry_pack": pack_key,
            "preview_pack": True,
            "assemble_source": "industry_pack_boot",
        }
    )
    schema["meta"] = meta_block
    validate_page_schema(schema)

    manifest = build_manifest(keys, deliver="web")
    base_url = settings.public_base_url.rstrip("/")
    api_base = f"{base_url}{settings.api_prefix}"

    config: dict[str, Any] = {
        "tenant_slug": "demo",
        "tenant_name": "TrackChat 演示租户",
        "app_name": f"{pack_name}工作台",
        "primary_color": color,
        "theme": "light",
        "api_base_url": api_base,
        "deliver": "web",
        "menu": schema["menu"],
        "apk_ready": False,
        "apk_build_status": "skipped",
        "features": {"chat_sse": True, "offline_cache": False},
        "industry_pack": pack_key,
        "preview_pack": True,
        "web_url": f"{base_url}/r/preview/{pack_key}",
    }

    return {
        "pack_key": pack_key,
        "pack_name": pack_name,
        "public_id": virtual_id,
        "page_schema": schema,
        "build_manifest": manifest,
        "config": config,
        "assembly": {
            "scene_count": assembly["scene_count"],
            "scenario_names": assembly.get("scenario_names") or [],
            "capability_keys": keys,
        },
    }


def resolve_preview_pack_keys(pack_key: str) -> list[str]:
    """开发者契约预览：从装配结果派生 capability_keys（禁止硬编码列表）。"""
    return list(boot_industry_pack(pack_key)["assembly"]["capability_keys"])
