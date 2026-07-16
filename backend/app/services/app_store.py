from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models import AppRecord, PublishRecord, Tenant, User
from app.services.app_urls import app_download_url, app_qr_payload, app_web_url
from app.services.build_manifest import build_manifest
from app.services.capability_resolver import resolve_publish_capability_keys_detailed
from app.services.db_seed import DEFAULT_TENANT_SLUG
from app.services.schema_generator import generate_page_schema, validate_page_schema

PLAZA_VISIBILITY_VALUES = frozenset({"none", "public", "org", "dept", "users"})


def _default_tenant(db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.slug == DEFAULT_TENANT_SLUG).first()
    if tenant:
        return tenant
    tenant = Tenant(name="TrackChat 演示租户", slug=DEFAULT_TENANT_SLUG)
    db.add(tenant)
    db.flush()
    return tenant


def get_app_by_public_id(db: Session, public_id: str) -> AppRecord | None:
    if not public_id:
        return None
    return db.query(AppRecord).filter(AppRecord.public_id == public_id).first()


def app_record_to_dict(record: AppRecord) -> dict[str, Any]:
    from app.services.apk_build_profiles import android_app_id_for_public_id

    return {
        "id": record.public_id,
        "name": record.name,
        "icon_url": record.icon_url,
        "primary_color": record.primary_color,
        "industry_key": record.industry_key,
        "scenarios": record.scenarios,
        "capability_keys": record.capability_keys,
        "modules": record.modules,
        "schema_url": record.schema_url,
        "page_schema": record.page_schema,
        "build_manifest": record.build_manifest,
        "web_url": app_web_url(record.public_id),
        "download_url": app_download_url(record.public_id),
        "app_qr": app_qr_payload(record.public_id),
        "android_app_id": android_app_id_for_public_id(record.public_id),
        "status": record.status,
        "created_at": record.created_at.isoformat() if record.created_at else "",
        "audience": record.audience,
        "deliver": record.deliver,
        "source": record.source,
        "prompt": record.prompt,
        "contact_email": record.contact_email,
        "contact_phone": record.contact_phone,
        "plaza_visibility": record.plaza_visibility,
        "plaza_dept_name": record.plaza_dept_name,
        "plaza_published_at": record.plaza_published_at.isoformat() if record.plaza_published_at else None,
    }


def _plaza_at_label(visibility: str, dept_name: str) -> str:
    if visibility == "public":
        return "@公开"
    if visibility == "org":
        return "@全公司"
    if visibility == "dept":
        return f"@{dept_name}" if dept_name else "@部门"
    if visibility == "users":
        return "@指定成员"
    return ""


def _module_labels(record: AppRecord) -> list[str]:
    if record.modules:
        return [str(m.get("label", m.get("key", ""))) for m in record.modules[:6] if isinstance(m, dict)]
    return [str(s) for s in (record.scenarios or [])[:6]]


def plaza_feed_item_from_record(record: AppRecord, db: Session | None = None) -> dict[str, Any]:
    visibility = record.plaza_visibility if record.plaza_visibility in ("public", "dept") else "public"
    published_at = record.plaza_published_at or record.created_at
    author = (record.contact_email.split("@")[0] if record.contact_email else "") or "创作者"
    modules = _module_labels(record)
    mod_text = " · ".join(modules)
    summary = f"{len(modules) or len(record.scenarios or [])} 项能力"
    if mod_text:
        summary += f"：{mod_text}"
    summary += "。Web + App 双端可访问。"
    if record.plaza_visibility == "dept" and record.plaza_dept_name:
        summary = f"范围可见 · {record.plaza_dept_name}内可访问 · {summary}"

    likes, comments = 0, 0
    if db is not None:
        from app.services.plaza_interactions import plaza_interaction_counts

        likes, comments = plaza_interaction_counts(db, record.public_id)

    return {
        "id": f"db-{record.public_id}",
        "appKey": record.public_id,
        "authorName": author,
        "authorInitial": author[:1] or "创",
        "authorMeta": "积木仓",
        "publishedAt": published_at.isoformat() if published_at else "",
        "visibility": visibility,
        "atLabel": _plaza_at_label(record.plaza_visibility, record.plaza_dept_name),
        "appName": record.name,
        "modules": modules,
        "summary": summary,
        "webUrl": app_web_url(record.public_id),
        "likes": likes,
        "comments": comments,
        "reposts": 0,
        "plaza_visibility": record.plaza_visibility,
        "plaza_dept_name": record.plaza_dept_name,
    }


def persist_published_app(
    db: Session,
    *,
    name: str,
    industry_key: str,
    scenarios: list[str],
    audience: str,
    deliver: str,
    source: str,
    prompt: str,
    contact_email: str,
    contact_phone: str,
    capability_keys: list[str],
    modules: list[dict],
    user: User | None = None,
    payload: dict[str, Any] | None = None,
    icon_url: str = "",
    primary_color: str = "#4338ca",
    app_id: str = "",
    web_template_id: str = "tabs_portal",
    app_ui_id: str = "bottom_tabs",
    assemble_full_scenes: bool = False,
) -> dict[str, Any]:
    from app.data.delivery_templates import normalize_app_ui_id, normalize_web_template_id
    from app.data.industry_packs_all import pack_meta
    from app.services.scene_capability_map import assemble_industry_pack

    existing = get_app_by_public_id(db, app_id) if app_id else None
    tenant_id = user.tenant_id if user else None
    web_tpl = normalize_web_template_id(web_template_id)
    app_ui = normalize_app_ui_id(app_ui_id)

    menu_plan: list[dict[str, Any]] | None = None
    scene_groups: list[dict[str, Any]] | None = None
    industry_assembly: dict[str, Any] | None = None
    # 行业包：按场景清单装配（industry 来源或显式 assemble_full_scenes）
    use_scene_pack = assemble_full_scenes or source in ("industry", "industry_pack", "industry_site")
    if use_scene_pack and pack_meta(industry_key):
        # 无有效场景名 / 仅「自定义应用」→ 全量；否则按所选场景
        meaningful = [s for s in scenarios if s and s != "自定义应用"]
        industry_assembly = assemble_industry_pack(
            industry_key,
            scene_names=meaningful or None,
        )
        if industry_assembly.get("scene_count", 0) > 0:
            capability_keys = list(
                dict.fromkeys([*(capability_keys or []), *industry_assembly["capability_keys"]])
            )
            # 场景模块优先；保留调用方额外 modules
            scene_mods = list(industry_assembly.get("modules") or [])
            extra = [m for m in (modules or []) if m.get("source") != "industry_scene"]
            modules = scene_mods + extra
            scenarios = list(industry_assembly.get("scenario_names") or scenarios)
            menu_plan = list(industry_assembly.get("menu_plan") or [])
            scene_groups = list(industry_assembly.get("groups") or [])

    assembly = resolve_publish_capability_keys_detailed(
        scenario_names=scenarios,
        capability_keys=capability_keys,
        modules=modules,
        industry_key=industry_key,
        db=db,
        tenant_id=tenant_id,
    )
    keys = assembly.resolved_keys
    page_schema = generate_page_schema(
        app_id=app_id or "pending",
        app_name=name,
        capability_keys=keys,
        primary_color=primary_color or "#4338ca",
        web_template_id=web_tpl,
        app_ui_id=app_ui,
        menu_plan=menu_plan,
        scene_groups=scene_groups,
    )
    validate_page_schema(page_schema)
    manifest = build_manifest(
        keys,
        deliver=deliver,
        web_template_id=web_tpl,
        app_ui_id=app_ui,
    )

    if existing:
        page_schema["appId"] = existing.public_id
        existing.name = name
        existing.industry_key = industry_key
        existing.icon_url = icon_url or existing.icon_url
        existing.primary_color = primary_color or existing.primary_color
        existing.scenarios = scenarios
        existing.capability_keys = keys
        existing.modules = modules
        existing.page_schema = page_schema
        existing.build_manifest = manifest
        existing.audience = audience
        existing.deliver = deliver
        existing.source = source
        existing.prompt = prompt[:500] if prompt else ""
        existing.contact_email = contact_email
        existing.contact_phone = contact_phone
        existing.status = "published"
        db.add(
            PublishRecord(
                app_id=existing.id,
                user_id=user.id if user else None,
                action="republish",
                payload=payload or {},
            )
        )
        db.commit()
        db.refresh(existing)
        out = app_record_to_dict(existing)
        out["capability_assembly"] = assembly.to_dict()
        if industry_assembly:
            out["industry_scene_assembly"] = {
                "scene_count": industry_assembly.get("scene_count"),
                "groups": industry_assembly.get("groups"),
                "pack_name": industry_assembly.get("pack_name"),
            }
        out["web_template_id"] = web_tpl
        out["app_ui_id"] = app_ui
        out["pending_codegen_keys"] = list(assembly.dropped_keys)
        return out

    tenant = user.tenant if user else _default_tenant(db)
    public_id = uuid4().hex[:8]
    page_schema["appId"] = public_id
    record = AppRecord(
        public_id=public_id,
        tenant_id=tenant.id,
        name=name,
        industry_key=industry_key,
        icon_url=icon_url,
        primary_color=primary_color or "#4338ca",
        scenarios=scenarios,
        capability_keys=keys,
        modules=modules,
        schema_url=f"/runtime/{public_id}",
        page_schema=page_schema,
        build_manifest=manifest,
        status="published",
        audience=audience,
        deliver=deliver,
        source=source,
        prompt=prompt[:500] if prompt else "",
        contact_email=contact_email,
        contact_phone=contact_phone,
        created_by_id=user.id if user else None,
    )
    db.add(record)
    db.flush()
    db.add(
        PublishRecord(
            app_id=record.id,
            user_id=user.id if user else None,
            action="publish",
            payload=payload or {},
        )
    )
    db.commit()
    db.refresh(record)
    out = app_record_to_dict(record)
    out["capability_assembly"] = assembly.to_dict()
    if industry_assembly:
        out["industry_scene_assembly"] = {
            "scene_count": industry_assembly.get("scene_count"),
            "groups": industry_assembly.get("groups"),
            "pack_name": industry_assembly.get("pack_name"),
        }
    out["web_template_id"] = web_tpl
    out["app_ui_id"] = app_ui
    out["pending_codegen_keys"] = list(assembly.dropped_keys)
    return out


def publish_app_to_plaza(
    db: Session,
    *,
    public_id: str,
    visibility: str,
    dept_name: str = "",
) -> dict[str, Any] | None:
    if visibility not in PLAZA_VISIBILITY_VALUES:
        visibility = "none"
    record = get_app_by_public_id(db, public_id)
    if not record:
        return None
    record.plaza_visibility = visibility
    record.plaza_dept_name = dept_name if visibility == "dept" else ""
    record.plaza_published_at = datetime.now(timezone.utc)
    db.add(
        PublishRecord(
            app_id=record.id,
            user_id=None,
            action="plaza_publish",
            payload={"visibility": visibility, "dept_name": dept_name},
        )
    )
    db.commit()
    db.refresh(record)
    return app_record_to_dict(record)


def list_plaza_feed_apps(db: Session, *, limit: int = 50) -> list[dict[str, Any]]:
    rows = (
        db.query(AppRecord)
        .filter(
            AppRecord.plaza_visibility.in_(["public", "dept"]),
            AppRecord.status == "published",
        )
        .order_by(AppRecord.plaza_published_at.desc().nullslast(), AppRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return [plaza_feed_item_from_record(row, db) for row in rows]


def list_published_apps(db: Session, *, tenant_id: str | None = None) -> list[dict[str, Any]]:
    query = db.query(AppRecord).order_by(AppRecord.created_at.desc())
    if tenant_id:
        query = query.filter(AppRecord.tenant_id == tenant_id)
    return [app_record_to_dict(row) for row in query.all()]
