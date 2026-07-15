"""Tenant runtime config for Web / Flutter clients."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import AppRecord, ApprovalRecord, Tenant, User
from app.services.apk_builder import get_apk_build_status, per_app_apk_ready
from app.services.db_seed import DEFAULT_TENANT_SLUG

DEFAULT_TENANT_CONFIG: dict[str, Any] = {
    "app_name": "TrackChat",
    "app_icon_url": "",
    "primary_color": "#4338ca",
    "theme": "light",
    "api_base_url": "",
    "menu": [
        {"key": "home", "label": "首页", "icon": "home"},
        {"key": "chat", "label": "智能问答", "icon": "chat"},
        {"key": "approval", "label": "审批", "icon": "approval"},
    ],
    "features": {
        "chat_sse": True,
        "offline_cache": False,
    },
}


def _merge_config(base: dict[str, Any], override: dict[str, Any] | None) -> dict[str, Any]:
    if not override:
        return dict(base)
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def ensure_tenant_config(db: Session, tenant: Tenant) -> dict[str, Any]:
    base = dict(DEFAULT_TENANT_CONFIG)
    base["api_base_url"] = f"{settings.public_base_url.rstrip('/')}{settings.api_prefix}"
    if tenant.config_json:
        return _merge_config(base, tenant.config_json)
    tenant.config_json = base
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant.config_json or base


def get_tenant_config(
    db: Session,
    *,
    tenant_slug: str = DEFAULT_TENANT_SLUG,
    app_public_id: str | None = None,
) -> dict[str, Any]:
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        tenant = Tenant(name="TrackChat 演示租户", slug=tenant_slug)
        db.add(tenant)
        db.flush()

    config = ensure_tenant_config(db, tenant)
    payload: dict[str, Any] = {
        "tenant_slug": tenant.slug,
        "tenant_name": tenant.name,
        **config,
    }

    # 按应用打开运行时时跳过全局 COUNT（三表全表统计会拖慢 /config）
    if not app_public_id:
        apps_count = db.query(AppRecord).filter(AppRecord.tenant_id == tenant.id).count()
        approvals_count = db.query(ApprovalRecord).filter(ApprovalRecord.tenant_id == tenant.id).count()
        users_count = db.query(User).filter(User.tenant_id == tenant.id).count()
        payload["stats"] = {
            "apps": apps_count,
            "approvals": approvals_count,
            "users": users_count,
        }

    if app_public_id:
        app = (
            db.query(AppRecord)
            .filter(AppRecord.public_id == app_public_id, AppRecord.tenant_id == tenant.id)
            .first()
        )
        if app:
            deliver = app.deliver or "both"
            base_url = settings.public_base_url.rstrip("/")
            # 运行时壳只需要文件是否存在；不读 build log / detail
            apk_ready = per_app_apk_ready(app.public_id, deliver=deliver)
            apk_status = get_apk_build_status(app.public_id) if deliver in ("app", "both") else "skipped"
            payload["app"] = {
                "id": app.public_id,
                "name": app.name,
                "schema_url": app.schema_url,
                "deliver": deliver,
                "modules": app.modules,
                "capability_keys": app.capability_keys,
                "web_url": f"{base_url}/r/{app.public_id}",
                "download_url": f"{base_url}/r/{app.public_id}/download",
                "apk_ready": apk_ready,
                "apk_build_status": apk_status,
            }
            payload["deliver"] = deliver
            payload["web_url"] = f"{base_url}/r/{app.public_id}"
            payload["download_url"] = f"{base_url}/r/{app.public_id}/download"
            payload["apk_ready"] = apk_ready
            payload["apk_build_status"] = apk_status
            payload["app_name"] = app.name
            if app.icon_url:
                payload["app_icon_url"] = app.icon_url
            if app.primary_color:
                payload["primary_color"] = app.primary_color
            if app.page_schema and isinstance(app.page_schema, dict):
                menu = app.page_schema.get("menu")
                if menu:
                    payload["menu"] = menu

    return payload


def update_tenant_config(
    db: Session,
    *,
    tenant_slug: str,
    patch: dict[str, Any],
) -> dict[str, Any]:
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if not tenant:
        tenant = Tenant(name="TrackChat 演示租户", slug=tenant_slug)
        db.add(tenant)
        db.flush()

    allowed_keys = {
        "app_name",
        "app_icon_url",
        "primary_color",
        "theme",
        "menu",
        "features",
    }
    current = ensure_tenant_config(db, tenant)
    merged = dict(current)
    for key, value in patch.items():
        if key not in allowed_keys:
            continue
        if key == "menu" and isinstance(value, list):
            merged["menu"] = value
        elif key == "features" and isinstance(value, dict):
            merged["features"] = {**merged.get("features", {}), **value}
        else:
            merged[key] = value

    tenant.config_json = merged
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return get_tenant_config(db, tenant_slug=tenant_slug)
