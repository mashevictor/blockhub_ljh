"""Runtime delivery — Web employee shell + APK download + 模块流 mock API。"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user, require_admin
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
logger = logging.getLogger(__name__)


class RuntimeSchemaPatch(BaseModel):
    page_schema: dict[str, Any]
    merge_meta: dict[str, Any] | None = None
    base_rev: int | None = Field(default=None, description="客户端基于的 schema_rev；冲突返回 409")
    force: bool = False
    source: str = "compose"
    # 非管理员禁止直接写正式 schema；管理员可直接发布
    direct_publish: bool = Field(
        default=False,
        description="仅管理员：跳过审批直接写正式 page_schema",
    )


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


class SchemaChangeUpsert(BaseModel):
    page_schema: dict[str, Any]
    summary: str | None = None
    change_id: str | None = None


class SchemaChangeReview(BaseModel):
    comment: str = ""
    force: bool = False


class SchemaChangeSubmit(BaseModel):
    change_id: str | None = None
    page_schema: dict[str, Any] | None = None
    summary: str | None = None


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
    from app.services.capability_blueprint import resolve_app_scoped_keys

    schema = app.page_schema if isinstance(app.page_schema, dict) else None
    keys = resolve_app_scoped_keys(
        capability_keys=list(app.capability_keys or []),
        page_schema=schema,
    )
    slim_manifest = build_manifest(keys, deliver=app.deliver or "web")
    # modules 也按本应用 keys 过滤，避免行业全量装配残留
    key_set = set(keys)
    modules = [
        m
        for m in (app.modules or [])
        if isinstance(m, dict) and str(m.get("key") or m.get("capability_key") or "") in key_set
    ]
    return build_developer_blueprint(
        BlueprintBuild(
            capability_keys=keys,
            modules=modules,
            build_manifest=slim_manifest,
            page_schema=schema,
            scope="app",
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
            scope="preview_pack",
            app={
                "public_id": f"preview-{pack}",
                "name": f"{pack} 行业 Runtime 预览（非独立站）",
                "industry_key": pack,
            },
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
            scope="preview_pack",
            app={
                "public_id": f"preview-{pack}",
                "name": f"{pack} 行业 Runtime 预览（非独立站）",
                "industry_key": pack,
            },
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
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """下载应用契约包：管理员或已获批用户。"""
    from app.services.code_download_access import can_download_code

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if user.tenant_id != app.tenant_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权下载其他租户契约包")
    if not can_download_code(user, app):
        raise HTTPException(status_code=403, detail="请先申请下载权限，由管理员批准后再下载")
    from app.services.plan_usage import assert_and_count_code_download

    assert_and_count_code_download(db, user)
    blueprint = _blueprint_for_app(app)
    data = build_code_zip(blueprint)
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="blockhub-{public_id}-contract.zip"'
        },
    )


@router.get("/{public_id}/developer/code-access")
def get_code_access(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.services.code_download_access import access_status

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_view_developer(user, app)
    return access_status(user, app)


@router.post("/{public_id}/developer/code-access/request")
def request_code_access(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    from app.services.code_download_access import request_access

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_view_developer(user, app)
    return request_access(db, user, app)


@router.post("/{public_id}/developer/code-access/{target_user_id}/approve")
def approve_code_access(
    public_id: str,
    target_user_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_admin)],
) -> dict:
    from app.services.code_download_access import approve_access

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if user.tenant_id != app.tenant_id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权操作其他租户")
    try:
        return approve_access(db, user, app, target_user_id)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e


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
def runtime_schema(
    public_id: str,
    db: Session = Depends(get_db),
    user: Annotated[User | None, Depends(get_optional_user)] = None,
    view: str | None = Query(
        None,
        description="formal=强制正式版；personal/auto=作者登录时优先个人 draft/pending",
    ),
) -> dict:
    """Page schema for runtime-web / Flutter。

    公开读策略（产品定案）：
    - **正式版** formal：可匿名读取（广场预览 / 分享链 / 冒烟）
    - **个人草稿** personal：必须登录；未登录请求 personal → 401
    - 写操作一律需登录（PATCH / schema/changes 等）
    """
    from app.services.web_capability_gate import sanitize_page_schema
    from app.data.industry_packs_all import pack_meta

    want_personal = (view or "auto").lower() in ("auto", "personal", "draft", "mine")
    if want_personal and (view or "").lower() != "formal" and user is None:
        # 明确要个人视图但未登录：勿静默回落正式版造成「以为改了其实没改」
        if (view or "").lower() in ("personal", "draft", "mine"):
            raise HTTPException(status_code=401, detail="查看个人草稿请先登录")

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")

    def _enrich_industry_meta(schema: dict) -> dict:
        meta = schema.setdefault("meta", {})
        if not isinstance(meta, dict):
            return schema
        ik = str(meta.get("industry_key") or app.industry_key or "").strip()
        if ik and not meta.get("industry_key"):
            meta["industry_key"] = ik
        if ik and not meta.get("industry_name"):
            pack = pack_meta(ik) or {}
            meta["industry_name"] = pack.get("name") or ik
            theme = schema.setdefault("theme", {})
            if isinstance(theme, dict) and not theme.get("industryName"):
                theme["industryName"] = meta["industry_name"]
        return schema

    formal_raw = (
        dict(app.page_schema)
        if app.page_schema
        else generate_page_schema(
            app_id=app.public_id,
            app_name=app.name,
            capability_keys=app.capability_keys or [],
            primary_color=app.primary_color or "#4338ca",
        )
    )
    formal = _enrich_industry_meta(sanitize_page_schema(formal_raw))
    base = {
        "public_id": app.public_id,
        **schema_meta(app),
        "schema_view": "formal",
    }

    want_personal = (view or "auto").lower() in ("auto", "personal", "draft", "mine")
    if want_personal and user is not None and (view or "").lower() != "formal":
        from app.services import schema_change_approval as sca

        open_change = sca.get_author_open_change(db, app, user=user)
        if open_change and isinstance(open_change.page_schema, dict) and open_change.page_schema:
            personal = _enrich_industry_meta(sanitize_page_schema(dict(open_change.page_schema)))
            personal["appId"] = app.public_id
            return {
                **base,
                "page_schema": personal,
                "schema_view": "personal_draft",
                "change_id": open_change.id,
                "change_status": open_change.status,
                "change_summary": open_change.summary or "",
                "formal_schema_rev": int(getattr(app, "schema_rev", None) or 1),
            }

    return {**base, "page_schema": formal}


@router.patch("/{public_id}/schema")
def patch_runtime_schema(
    public_id: str,
    body: RuntimeSchemaPatch,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """直接写正式 page_schema：仅管理员。

    普通用户请走 /schema/changes 草稿 → 提交审批 → 管理员通过。
    """
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "SCHEMA_APPROVAL_REQUIRED",
                "message": "改页需先保存草稿并提交审批，管理员通过后才会影响正式 Runtime",
            },
        )
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
    result = commit_schema_revision(
        db,
        app,
        user=user,
        page_schema=schema,
        base_rev=body.base_rev,
        source=body.source or "compose",
        force=body.force,
    )
    # 直接发布后关闭排队中的草稿/待审批，避免 Composer「待审批」徽章与通知不同步
    try:
        from app.services import schema_change_approval as sca

        supersede = sca.supersede_open_changes_after_publish(
            db,
            app,
            user=user,
            published_rev=int(result.get("schema_rev") or getattr(app, "schema_rev", 0) or 0),
            reason="管理员已直接发布正式版",
        )
        if supersede.get("closed_count"):
            result = {
                **result,
                "superseded_changes": supersede["closed_count"],
                "supersede_detail": supersede,
            }
    except Exception as exc:
        logger.exception(
            "schema direct publish supersede failed public_id=%s actor=%s",
            app.public_id,
            user.id,
        )
        result = {**result, "supersede_error": str(exc)[:200]}
    return result


@router.get("/{public_id}/schema/changes")
def list_schema_changes(
    public_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    status: str | None = Query(None),
    limit: int = Query(30, ge=1, le=100),
) -> dict:
    """草稿 / 待审批 / 已审变更列表（绑个人账号；管理员看全量）。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return sca.list_changes(db, app, user=user, status=status, limit=limit)


@router.post("/{public_id}/schema/changes")
def upsert_schema_change_draft(
    public_id: str,
    body: SchemaChangeUpsert,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """保存个人草稿（不写正式 schema，不影响业务）。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    schema = dict(body.page_schema or {})
    schema["appId"] = app.public_id
    try:
        validate_page_schema(schema)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return sca.upsert_draft(
        db,
        app,
        user=user,
        page_schema=schema,
        summary=body.summary,
        change_id=body.change_id,
    )


@router.post("/{public_id}/schema/changes/submit")
def submit_schema_change(
    public_id: str,
    body: SchemaChangeSubmit,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """提交审批：可先带 page_schema 落草稿再 pending；通知租户管理员。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    change_id = body.change_id
    if body.page_schema is not None:
        schema = dict(body.page_schema)
        schema["appId"] = app.public_id
        try:
            validate_page_schema(schema)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        draft = sca.upsert_draft(
            db,
            app,
            user=user,
            page_schema=schema,
            summary=body.summary,
            change_id=change_id,
        )
        change_id = draft["change"]["id"]
    if not change_id:
        raise HTTPException(status_code=400, detail="缺少 change_id 或 page_schema")
    return sca.submit_change(db, app, user=user, change_id=change_id)


@router.post("/{public_id}/schema/changes/{change_id}/approve")
def approve_schema_change(
    public_id: str,
    change_id: str,
    body: SchemaChangeReview,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """管理员通过 → 写入正式 page_schema + 版本历史（影响业务）。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return sca.approve_change(
        db, app, user=user, change_id=change_id, comment=body.comment, force=body.force
    )


@router.post("/{public_id}/schema/changes/{change_id}/reject")
def reject_schema_change(
    public_id: str,
    change_id: str,
    body: SchemaChangeReview,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """管理员驳回。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return sca.reject_change(db, app, user=user, change_id=change_id, comment=body.comment)


@router.post("/{public_id}/schema/changes/{change_id}/cancel")
def cancel_schema_change(
    public_id: str,
    change_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """作者取消草稿/待审。"""
    from app.services import schema_change_approval as sca

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    return sca.cancel_change(db, app, user=user, change_id=change_id)


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
    """回滚到历史版本（产生新 rev，非破坏历史）。仅管理员。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    _assert_can_edit_runtime_app(user, app)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="仅管理员可回滚正式版本")
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
    try:
        from app.services.web_capability_gate import filter_web_ready_keys

        keys = filter_web_ready_keys(keys) or ["chat_qa"]
    except Exception:
        pass
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
def runtime_manifest(
    public_id: str,
    db: Session = Depends(get_db),
    user: Annotated[User | None, Depends(get_optional_user)] = None,
    view: str | None = Query(None),
) -> dict:
    """Build manifest — Web/App package list for modular assembly。

    作者有个人草稿时，按草稿 capability_keys 现算 manifest，保证单侧新增菜单能 boot 到包。
    """
    from app.services.web_capability_gate import filter_web_ready_keys, sanitize_page_schema

    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")

    page_for_keys: dict | None = None
    schema_view = "formal"
    want_personal = (view or "auto").lower() in ("auto", "personal", "draft", "mine")
    if want_personal and user is not None and (view or "").lower() != "formal":
        from app.services import schema_change_approval as sca

        open_change = sca.get_author_open_change(db, app, user=user)
        if open_change and isinstance(open_change.page_schema, dict) and open_change.page_schema:
            page_for_keys = sanitize_page_schema(dict(open_change.page_schema))
            schema_view = "personal_draft"

    if page_for_keys is None and isinstance(app.page_schema, dict):
        page_for_keys = sanitize_page_schema(dict(app.page_schema))

    keys = filter_web_ready_keys(list(app.capability_keys or []))
    if page_for_keys:
        schema_keys = [str(k) for k in (page_for_keys.get("capability_keys") or []) if k]
        if schema_keys:
            keys = filter_web_ready_keys(schema_keys)
    if not keys:
        keys = ["chat_qa"]
    manifest = build_manifest(keys, deliver=app.deliver or "both")
    return {
        "public_id": app.public_id,
        "build_manifest": manifest,
        "schema_view": schema_view,
        "capability_keys": keys,
    }


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
