"""Runtime delivery — Web employee shell + APK download + 模块流 mock API。"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.db.models import AppRecord, User
from app.db.session import get_db
from app.services.apk_builder import get_apk_build_detail, get_apk_build_status, per_app_apk_path, per_app_apk_ready
from app.services.build_manifest import build_manifest
from app.services.capability_blueprint import (
    PREVIEW_PACK_KEYS,
    BlueprintBuild,
    build_code_zip,
    build_developer_blueprint,
)
from app.services.schema_generator import generate_page_schema, validate_page_schema
from app.services.schema_versioning import (
    commit_schema_revision,
    list_revisions,
    restore_revision,
    schema_meta,
)
from app.services.tenant_config import get_tenant_config

router = APIRouter(prefix="/runtime", tags=["runtime"])


class RuntimeSchemaPatch(BaseModel):
    page_schema: dict[str, Any]
    merge_meta: dict[str, Any] | None = None
    base_rev: int | None = Field(default=None, description="客户端基于的 schema_rev；冲突返回 409")
    force: bool = False
    source: str = "compose"


class RuntimeModulesPatch(BaseModel):
    capability_keys: list[str] = Field(default_factory=list)
    modules: list[dict[str, Any]] = Field(default_factory=list)
    rebuild_schema: bool = True
    menu_plan: list[dict[str, Any]] | None = None
    base_rev: int | None = None
    force: bool = False
    source: str = "modules"


class RuntimeSchemaRestore(BaseModel):
    rev: int
    base_rev: int | None = None
    force: bool = False


def _assert_can_edit_runtime_app(user: User, app: AppRecord) -> None:
    if user.tenant_id != app.tenant_id:
        raise HTTPException(status_code=403, detail="无权编辑其他租户的应用")
    # 同租户登录用户可编排（与 publish 一致：租户内协作）


def _assert_can_view_developer(user: User, app: AppRecord) -> None:
    if user.role == "admin":
        return
    if user.tenant_id != app.tenant_id:
        raise HTTPException(status_code=403, detail="无权查看其他租户的开发者契约")


def _blueprint_for_app(app: AppRecord) -> dict:
    keys = list(app.capability_keys or [])
    if not keys and isinstance(app.page_schema, dict):
        keys = list(app.page_schema.get("capability_keys") or [])
    manifest = app.build_manifest if isinstance(app.build_manifest, dict) else None
    if not manifest:
        manifest = build_manifest(keys or ["chat_qa"], deliver=app.deliver or "web")
    return build_developer_blueprint(
        BlueprintBuild(
            capability_keys=keys or ["chat_qa"],
            modules=list(app.modules or []),
            build_manifest=manifest,
            page_schema=app.page_schema if isinstance(app.page_schema, dict) else None,
            app={
                "public_id": app.public_id,
                "name": app.name,
                "industry_key": app.industry_key,
                "deliver": app.deliver,
            },
        )
    )


@router.get("/developer/preview")
def developer_preview_blueprint(
    user: Annotated[User, Depends(get_current_user)],
    pack: str = Query("mfg", description="行业预览包，如 mfg"),
) -> dict:
    """制造业等独立站 Runtime 预览：库表 / 接口 / 代码路径（需登录）。"""
    _ = user
    keys = PREVIEW_PACK_KEYS.get(pack)
    if not keys:
        raise HTTPException(status_code=404, detail=f"未知预览包: {pack}")
    return build_developer_blueprint(
        BlueprintBuild(
            capability_keys=keys,
            modules=[],
            build_manifest=build_manifest(keys, deliver="web"),
            pack=pack,
            app={"public_id": f"preview-{pack}", "name": f"{pack} Runtime 预览", "industry_key": pack},
        )
    )


@router.get("/developer/preview/code.zip")
def download_preview_code_zip(
    user: Annotated[User, Depends(require_admin)],
    pack: str = Query("mfg"),
) -> Response:
    """下载预览包开发者 zip（仅管理员）。"""
    _ = user
    keys = PREVIEW_PACK_KEYS.get(pack)
    if not keys:
        raise HTTPException(status_code=404, detail=f"未知预览包: {pack}")
    blueprint = build_developer_blueprint(
        BlueprintBuild(
            capability_keys=keys,
            modules=[],
            build_manifest=build_manifest(keys, deliver="web"),
            pack=pack,
            app={"public_id": f"preview-{pack}", "name": f"{pack} Runtime 预览", "industry_key": pack},
        )
    )
    data = build_code_zip(blueprint)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="blockhub-{pack}-developer.zip"'},
    )


@router.get("/{public_id}/developer")
def developer_app_blueprint(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """已发布应用：库表字段 / REST / 代码路径（需登录且同租户）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_view_developer(user, app)
    return _blueprint_for_app(app)


@router.get("/{public_id}/developer/code.zip")
def download_app_code_zip(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_admin)],
) -> Response:
    """下载应用开发者 zip（仅管理员）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if user.tenant_id != app.tenant_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权下载其他租户源码包")
    blueprint = _blueprint_for_app(app)
    data = build_code_zip(blueprint)
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="blockhub-{public_id}-developer.zip"'
        },
    )


APK_DIR = "apks"


def _apk_path(public_id: str) -> Path:
    """仅返回 per-app APK 路径，不再回退 default.apk。"""
    return per_app_apk_path(public_id)


def _mock_flow_response(
    *,
    app_slug: str,
    path: str,
    method: str,
    body: Any,
    node_hint: str,
) -> dict:
    return {
        "ok": True,
        "mock": True,
        "app_slug": app_slug,
        "path": f"/api/v1/runtime/{app_slug}/{path}",
        "method": method,
        "node": node_hint,
        "received": body,
        "sample_output": {"status": "processed", "trace_id": "mock-trace-001"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def _read_body(request: Request) -> Any:
    if request.method in ("GET", "HEAD"):
        return None
    try:
        return await request.json()
    except Exception:
        raw = await request.body()
        return raw.decode("utf-8", errors="replace") if raw else None


@router.get("/{public_id}/schema")
def runtime_schema(public_id: str, db: Session = Depends(get_db)) -> dict:
    """Page schema for runtime-web / Flutter（含 schema_rev 供协作）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if not app.page_schema:
        schema = generate_page_schema(
            app_id=app.public_id,
            app_name=app.name,
            capability_keys=app.capability_keys or [],
            primary_color=app.primary_color or "#4338ca",
        )
        return {"public_id": app.public_id, "page_schema": schema, **schema_meta(app)}
    return {"public_id": app.public_id, "page_schema": app.page_schema, **schema_meta(app)}


@router.patch("/{public_id}/schema")
def patch_runtime_schema(
    public_id: str,
    body: RuntimeSchemaPatch,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """写回 page_schema（乐观锁：传 base_rev；冲突 409）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    schema = dict(body.page_schema or {})
    schema["appId"] = app.public_id
    if body.merge_meta:
        meta = dict(schema.get("meta") or {})
        meta.update(body.merge_meta)
        schema["meta"] = meta
    try:
        validate_page_schema(schema)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return commit_schema_revision(
        db,
        app,
        user=user,
        page_schema=schema,
        base_rev=body.base_rev,
        source=body.source or "compose",
        force=body.force,
    )


@router.get("/{public_id}/schema/revisions")
def runtime_schema_revisions(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(30, ge=1, le=100),
) -> dict:
    """修订历史（同租户可看）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return {
        "public_id": public_id,
        **schema_meta(app),
        "items": list_revisions(db, public_id, limit=limit),
    }


@router.post("/{public_id}/schema/restore")
def runtime_schema_restore(
    public_id: str,
    body: RuntimeSchemaRestore,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """回滚到历史版本（产生新 rev，非破坏历史）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return restore_revision(
        db,
        app,
        user=user,
        rev=body.rev,
        base_rev=body.base_rev,
        force=body.force,
    )


@router.patch("/{public_id}/modules")
def patch_runtime_modules(
    public_id: str,
    body: RuntimeModulesPatch,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """更新 capability_keys / modules，可选重建 schema + manifest（带乐观锁）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)

    keys = [str(k).strip() for k in (body.capability_keys or []) if str(k).strip()]
    if not keys:
        keys = list(app.capability_keys or []) or ["chat_qa"]
    modules = list(body.modules) if body.modules else list(app.modules or [])
    app.capability_keys = keys
    app.modules = modules

    manifest = build_manifest(keys, deliver=app.deliver or "both")
    app.build_manifest = manifest

    if body.rebuild_schema:
        meta = dict((app.page_schema or {}).get("meta") or {})
        menu_plan = body.menu_plan or meta.get("menu_plan")
        schema = generate_page_schema(
            app_id=app.public_id,
            app_name=app.name,
            capability_keys=keys,
            primary_color=app.primary_color or "#4338ca",
            web_template_id=str(meta.get("web_template_id") or "tabs_portal"),
            app_ui_id=str(meta.get("app_ui_id") or "bottom_tabs"),
            menu_plan=menu_plan if isinstance(menu_plan, list) else None,
            scene_groups=meta.get("scene_groups") if isinstance(meta.get("scene_groups"), list) else None,
        )
        # 保留流程编排等 meta
        if meta.get("module_flow"):
            schema.setdefault("meta", {})["module_flow"] = meta["module_flow"]
        try:
            validate_page_schema(schema)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        result = commit_schema_revision(
            db,
            app,
            user=user,
            page_schema=schema,
            base_rev=body.base_rev,
            source=body.source or "modules",
            force=body.force,
        )
        result["modules"] = app.modules
        result["build_manifest"] = app.build_manifest
        return result

    db.add(app)
    db.commit()
    db.refresh(app)
    return {
        "success": True,
        "public_id": app.public_id,
        "capability_keys": app.capability_keys,
        "modules": app.modules,
        "page_schema": app.page_schema,
        "build_manifest": app.build_manifest,
        **schema_meta(app),
    }


@router.get("/{public_id}/config")
def runtime_config(public_id: str, db: Session = Depends(get_db)) -> dict:
    """Runtime shell config (alias of tenant config scoped to app)."""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    return get_tenant_config(db, tenant_slug="demo", app_public_id=public_id)


@router.get("/{public_id}/manifest")
def runtime_manifest(public_id: str, db: Session = Depends(get_db)) -> dict:
    """Build manifest — Web/App package list for modular assembly."""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if not app.build_manifest:
        from app.services.build_manifest import build_manifest as build_manifest_fn

        manifest = build_manifest_fn(app.capability_keys or [], deliver=app.deliver)
        return {"public_id": app.public_id, "build_manifest": manifest}
    return {"public_id": app.public_id, "build_manifest": app.build_manifest}


@router.get("/{public_id}")
def runtime_info(public_id: str, db: Session = Depends(get_db)) -> dict:
    """运行时元信息（Web / App 共用）。默认不含巨型 schema/manifest，避免拖慢首屏。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    from app.services.apk_build_profiles import android_app_id_for_public_id

    build_status = get_apk_build_status(public_id)
    build_detail = get_apk_build_detail(public_id)
    return {
        "public_id": app.public_id,
        "name": app.name,
        "deliver": app.deliver,
        "schema_url": app.schema_url,
        "icon_url": app.icon_url,
        "primary_color": app.primary_color,
        "web_url": f"{settings.public_base_url.rstrip('/')}/r/{app.public_id}",
        "download_url": f"{settings.public_base_url.rstrip('/')}/r/{app.public_id}/download",
        "web_ready": app.deliver in ("web", "both"),
        "apk_ready": per_app_apk_ready(app.public_id, deliver=app.deliver),
        "apk_build_status": build_status,
        "apk_build_error": build_detail.get("error"),
        "apk_build_log": build_detail.get("log"),
        "android_app_id": build_detail.get("android_app_id")
        or android_app_id_for_public_id(app.public_id),
        "modules": app.modules,
        "capability_keys": app.capability_keys,
    }


@router.get("/{public_id}/download")
def download_apk(public_id: str, db: Session = Depends(get_db)) -> FileResponse:
    """下载 Android APK（仅 per-app 包，不存在则 503）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if app.deliver not in ("app", "both"):
        raise HTTPException(status_code=400, detail="该应用未开启 App 交付")

    apk = _apk_path(public_id)
    if not apk.is_file():
        raise HTTPException(
            status_code=503,
            detail="专属 APK 尚未构建完成，请稍后重试或联系管理员执行 flutter-build-from-publish",
        )

    filename = f"{app.name.replace(' ', '_')}.apk"
    return FileResponse(
        path=apk,
        media_type="application/vnd.android.package-archive",
        filename=filename,
    )


@router.api_route("/{app_slug}/ingress", methods=["GET", "POST", "PUT"])
async def mock_ingress_root_api(app_slug: str, request: Request) -> dict:
    """兼容大模型生成的裸 /ingress（无 action）→ 等同 webhook。"""
    body = await _read_body(request)
    return _mock_flow_response(
        app_slug=app_slug,
        path="ingress/webhook",
        method=request.method,
        body=body,
        node_hint="ingress",
    )


@router.api_route("/{app_slug}/ingress/{action}", methods=["GET", "POST", "PUT"])
async def mock_ingress_api(app_slug: str, action: str, request: Request) -> dict:
    """模块数据流 — 业务输入节点 mock。"""
    body = await _read_body(request)
    # 常见误写：/ingress/output、/ingress/input
    mapped = {"input": "webhook", "in": "webhook", "output": "dispatch", "out": "dispatch"}.get(
        action.lower(), action
    )
    return _mock_flow_response(
        app_slug=app_slug,
        path=f"ingress/{mapped}",
        method=request.method,
        body=body,
        node_hint="ingress",
    )


@router.api_route("/{app_slug}/egress", methods=["GET", "POST", "PUT"])
async def mock_egress_root_api(app_slug: str, request: Request) -> dict:
    """兼容裸 /egress → 等同 collect。"""
    body = await _read_body(request)
    return _mock_flow_response(
        app_slug=app_slug,
        path="egress/collect",
        method=request.method,
        body=body,
        node_hint="egress",
    )


@router.api_route("/{app_slug}/egress/{action}", methods=["GET", "POST", "PUT"])
async def mock_egress_api(app_slug: str, action: str, request: Request) -> dict:
    """模块数据流 — 触达输出节点 mock。"""
    body = await _read_body(request)
    mapped = {"input": "collect", "in": "collect", "output": "deliver", "out": "deliver"}.get(
        action.lower(), action
    )
    return _mock_flow_response(
        app_slug=app_slug,
        path=f"egress/{mapped}",
        method=request.method,
        body=body,
        node_hint="egress",
    )


@router.api_route("/{app_slug}/modules/{module_slug}/{action}", methods=["GET", "POST", "PUT"])
async def mock_module_api(
    app_slug: str,
    module_slug: str,
    action: str,
    request: Request,
) -> dict:
    """模块数据流 — 中间模块 mock。"""
    body = await _read_body(request)
    return _mock_flow_response(
        app_slug=app_slug,
        path=f"modules/{module_slug}/{action}",
        method=request.method,
        body=body,
        node_hint=module_slug,
    )
