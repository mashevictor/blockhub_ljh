from typing import Annotated

import logging
import threading

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user, require_admin
from app.data.module_data import CREATION_WIZARD_STEPS, INDUSTRY_PACK_OPTIONS
from app.data.schema_templates import feasibility_for_scenarios, list_templates
from app.db.models import User
from app.db.session import get_db
from app.services.app_store import (
    get_app_by_public_id,
    list_plaza_feed_apps,
    list_published_apps,
    persist_published_app,
    plaza_feed_item_from_record,
    publish_app_to_plaza,
)
from app.services import catalog_store
from app.services.apk_builder import enqueue_apk_build, get_apk_build_status, per_app_apk_ready
from app.services.file_storage import read_bytes, save_app_icon_data_url, uploads_root
from app.services.flow_module_api import generate_flow_module_apis
from app.services.module_suggest import suggest_modules
from app.services.publish_email import send_publish_delivery_email
from app.services.email_service import smtp_configured
from app.services.plaza_interactions import (
    add_plaza_comment,
    list_plaza_comments,
    toggle_plaza_like,
    user_liked,
)
from app.services.custom_capability_store import (
    list_custom_capabilities,
    propose_capability,
    review_capability,
)

router = APIRouter(prefix="/creation", tags=["creation"])
logger = logging.getLogger(__name__)


class FeasibilityRequest(BaseModel):
    industry_key: str
    scenario_ids: list[str] = []
    scenario_names: list[str] = []


class SuggestModulesRequest(BaseModel):
    text: str | None = ""
    force_llm: bool = False


class FlowModuleNodeIn(BaseModel):
    node_id: str
    label: str
    kind: str  # ingress | module | egress
    note: str = ""


class FlowModuleApisRequest(BaseModel):
    app_slug: str
    app_name: str
    nodes: list[FlowModuleNodeIn]


class PublishModuleItem(BaseModel):
    key: str
    label: str
    kind: str = "module"
    icon_key: str = ""
    source: str = "user"


class PublishRequest(BaseModel):
    name: str
    industry_key: str
    app_id: str = ""
    scenario_ids: list[str] = []
    scenario_names: list[str] = []
    capability_keys: list[str] = []
    modules: list[PublishModuleItem] = []
    audience: str = "both"
    deliver: str = "both"
    source: str = "industry"
    prompt: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    icon_url: str = ""
    primary_color: str = "#4338ca"


class PlazaPublishRequest(BaseModel):
    app_id: str
    visibility: str
    dept_name: str = ""


class PlazaLikeRequest(BaseModel):
    user_key: str = "anonymous"


class PlazaCommentRequest(BaseModel):
    author_name: str = "访客"
    text: str


class CustomCapabilityPropose(BaseModel):
    key: str
    name: str
    category: str = "自定义"
    description: str = ""
    keywords: list[str] = []


class CustomCapabilityReview(BaseModel):
    action: str  # approve | reject


@router.post("/feasibility")
def feasibility_check(body: FeasibilityRequest, db: Session = Depends(get_db)) -> dict:
    all_scenarios = catalog_store.scenario_name_map(db)
    names = [all_scenarios.get(sid, sid) for sid in body.scenario_ids]
    names.extend(body.scenario_names)
    return feasibility_for_scenarios(
        industry_key=body.industry_key,
        scenario_names=names,
    )


@router.get("/schema-templates")
def schema_templates_api(industry: str | None = None) -> dict:
    items = list_templates(industry)
    return {"total": len(items), "items": items}


@router.post("/custom-capabilities")
def propose_custom_capability(
    body: CustomCapabilityPropose,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    item = propose_capability(
        db,
        current_user,
        key=body.key,
        name=body.name,
        category=body.category,
        description=body.description,
        keywords=body.keywords,
    )
    return {"success": True, "item": item}


@router.get("/custom-capabilities")
def list_custom_capabilities_api(
    status: str | None = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    items = list_custom_capabilities(db, current_user.tenant_id, status=status)
    return {"total": len(items), "items": items}


@router.post("/custom-capabilities/{capability_id}/review")
def review_custom_capability_api(
    capability_id: str,
    body: CustomCapabilityReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> dict:
    item = review_capability(
        db,
        current_user.tenant_id,
        capability_id,
        action=body.action,
        reviewer=current_user,
    )
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "item": item}


class UploadIconRequest(BaseModel):
    data_url: str


@router.get("/wizard")
def wizard_meta() -> dict:
    return {"steps": CREATION_WIZARD_STEPS, "industry_packs": INDUSTRY_PACK_OPTIONS}


@router.get("/scenarios")
def scenarios_for_industry(
    industry_key: str = "office",
    db: Session = Depends(get_db),
) -> dict:
    if industry_key == "office":
        items, _ = catalog_store.list_office_scenarios(db, lite=True)
        payload = [{"id": s["id"], "name": s["name"], "category": s["category"]} for s in items]
    else:
        items, _ = catalog_store.list_industry_scenarios(db, pack=industry_key, lite=False)
        payload = [
            {"id": s["id"], "name": s["name"], "category": s["category"], "standard": s.get("standard", "")}
            for s in items
        ]
    return {"industry_key": industry_key, "total": len(payload), "items": payload}


@router.get("/capabilities")
def get_capabilities(db: Session = Depends(get_db)) -> dict:
    items, by_category = catalog_store.list_capabilities(db)
    return {"total": len(items), "items": items, "by_category": by_category, "source": "database"}


@router.post("/suggest-modules")
def suggest_modules_api(
    body: SuggestModulesRequest,
    db: Session = Depends(get_db),
) -> dict:
    text = (body.text or "").strip()
    if len(text) < 2:
        return {
            "items": [],
            "confidence": 0.0,
            "used_llm": False,
            "agent": "",
            "supplemented": [],
            "registered": {"industries": [], "capabilities": [], "scenes": []},
            "validation": None,
            "top_score": 0.0,
        }
    return suggest_modules(text, force_llm=body.force_llm, db=db)


@router.post("/flow-module-apis")
def flow_module_apis_api(body: FlowModuleApisRequest) -> dict:
    """为数据流各节点（含输入/输出）生成模拟 REST API，优先 DeepSeek。"""
    if not body.nodes:
        raise HTTPException(status_code=400, detail="nodes 不能为空")
    return generate_flow_module_apis(
        app_slug=body.app_slug,
        app_name=body.app_name,
        nodes=[n.model_dump() for n in body.nodes],
    )


@router.post("/publish")
def publish_app(
    body: PublishRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
) -> dict:
    try:
        has_description = len(body.prompt.strip()) >= 2
        has_selection = bool(body.scenario_ids or body.scenario_names or body.capability_keys or body.modules)
        if not has_description and not has_selection:
            raise HTTPException(status_code=400, detail="请先选择功能模块或填写至少 2 个字的应用描述")

        names: list[str] = []
        all_scenarios = catalog_store.scenario_name_map(db)
        for sid in body.scenario_ids:
            names.append(all_scenarios.get(sid, sid))
        if body.scenario_names:
            names.extend(body.scenario_names)
        if not names:
            names = ["自定义应用"]
        app = persist_published_app(
            db,
            name=body.name,
            industry_key=body.industry_key,
            app_id=body.app_id.strip(),
            scenarios=names,
            audience=body.audience,
            deliver=body.deliver,
            source=body.source,
            prompt=body.prompt,
            contact_email=body.contact_email,
            contact_phone=body.contact_phone,
            capability_keys=body.capability_keys,
            modules=[m.model_dump() for m in body.modules],
            user=current_user,
            payload=body.model_dump(),
            icon_url=body.icon_url,
            primary_color=body.primary_color,
        )
        deliver = app.get("deliver", "both")
        public_id = app["id"]
        apk_ready = per_app_apk_ready(public_id, deliver=deliver)
        build_status = get_apk_build_status(public_id)
        if deliver in ("app", "both") and not apk_ready:
            build_status = enqueue_apk_build(app)

        email_sent = False
        if body.contact_email and settings.publish_email_enabled:
            contact_email = body.contact_email
            app_snapshot = dict(app)
            deliver_snapshot = deliver

            def _send_publish_email() -> None:
                try:
                    send_publish_delivery_email(contact_email, app_snapshot, deliver=deliver_snapshot)
                except Exception:
                    logger.exception("publish email failed for %s (app still published)", contact_email)

            threading.Thread(
                target=_send_publish_email,
                name=f"publish-mail-{public_id}",
                daemon=True,
            ).start()

        return {
            "success": True,
            "app": app,
            "page_schema": app.get("page_schema"),
            "build_manifest": app.get("build_manifest"),
            "runtime": {
                "web_url": app.get("web_url"),
                "download_url": app.get("download_url"),
                "deliver": deliver,
                "apk_ready": apk_ready,
                "apk_build_status": build_status,
            },
            "notification": {
                "email": body.contact_email or None,
                "email_sent": email_sent,
                "email_configured": smtp_configured(),
            },
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OperationalError as exc:
        logger.exception("POST /creation/publish database unavailable")
        raise HTTPException(status_code=503, detail="数据库不可用，请确认 PostgreSQL 已启动并完成迁移") from exc
    except Exception as exc:
        logger.exception("POST /creation/publish failed")
        detail = str(exc).lower()
        if (
            "icon_url" in detail
            or "primary_color" in detail
            or "plaza_visibility" in detail
            or "undefinedcolumn" in detail.replace(" ", "")
        ):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请在服务器执行: cd /root/blockhub && bash scripts/repair-db.sh",
            ) from exc
        raise HTTPException(status_code=500, detail="发布失败，请稍后重试或联系管理员查看 API 日志") from exc


@router.post("/plaza/publish")
def plaza_publish(body: PlazaPublishRequest, db: Session = Depends(get_db)) -> dict:
    app_id = body.app_id.strip()
    if not app_id:
        raise HTTPException(status_code=400, detail="app_id 不能为空")
    if not get_app_by_public_id(db, app_id):
        raise HTTPException(status_code=404, detail="应用不存在，请先完成发布")
    try:
        app = publish_app_to_plaza(
            db,
            public_id=app_id,
            visibility=body.visibility,
            dept_name=body.dept_name.strip(),
        )
    except Exception as exc:
        logger.exception("POST /creation/plaza/publish failed")
        detail = str(exc).lower()
        if "plaza_visibility" in detail or "undefinedcolumn" in detail.replace(" ", ""):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请在服务器执行: cd /root/blockhub && bash scripts/repair-db.sh",
            ) from exc
        raise HTTPException(status_code=500, detail="广场发布失败") from exc
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    record = get_app_by_public_id(db, app_id)
    feed_item = plaza_feed_item_from_record(record, db) if record else plaza_feed_item_from_api(app, db)
    return {"success": True, "app": app, "feed_item": feed_item}


@router.post("/plaza/feed/{app_id}/like")
def plaza_feed_like(app_id: str, body: PlazaLikeRequest, db: Session = Depends(get_db)) -> dict:
    if not get_app_by_public_id(db, app_id.strip()):
        raise HTTPException(status_code=404, detail="应用不存在")
    try:
        return toggle_plaza_like(db, app_public_id=app_id.strip(), user_key=body.user_key)
    except Exception as exc:
        logger.exception("POST /creation/plaza/feed/like failed")
        detail = str(exc).lower()
        if "plaza_feed" in detail or "undefinedcolumn" in detail.replace(" ", ""):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请执行 alembic upgrade head（012_plaza_feed_interactions）",
            ) from exc
        raise HTTPException(status_code=500, detail="点赞失败") from exc


@router.post("/plaza/feed/{app_id}/comment")
def plaza_feed_comment(app_id: str, body: PlazaCommentRequest, db: Session = Depends(get_db)) -> dict:
    if not get_app_by_public_id(db, app_id.strip()):
        raise HTTPException(status_code=404, detail="应用不存在")
    try:
        return add_plaza_comment(
            db,
            app_public_id=app_id.strip(),
            author_name=body.author_name,
            text=body.text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("POST /creation/plaza/feed/comment failed")
        detail = str(exc).lower()
        if "plaza_feed" in detail or "undefinedcolumn" in detail.replace(" ", ""):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请执行 alembic upgrade head（012_plaza_feed_interactions）",
            ) from exc
        raise HTTPException(status_code=500, detail="评论失败") from exc


@router.get("/plaza/feed/{app_id}/comments")
def plaza_feed_comments(app_id: str, db: Session = Depends(get_db)) -> dict:
    if not get_app_by_public_id(db, app_id.strip()):
        raise HTTPException(status_code=404, detail="应用不存在")
    try:
        items = list_plaza_comments(db, app_public_id=app_id.strip())
        liked = user_liked(db, app_public_id=app_id.strip(), user_key="anonymous")
        return {"items": items, "total": len(items), "user_liked": liked}
    except Exception as exc:
        logger.exception("GET /creation/plaza/feed/comments failed")
        raise HTTPException(status_code=500, detail="加载评论失败") from exc


@router.get("/plaza/feed")
def plaza_feed(db: Session = Depends(get_db)) -> dict:
    try:
        items = list_plaza_feed_apps(db)
    except Exception as exc:
        logger.exception("GET /creation/plaza/feed failed")
        detail = str(exc).lower()
        if "plaza_visibility" in detail or "undefinedcolumn" in detail.replace(" ", ""):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请在服务器执行: cd /root/blockhub && bash scripts/repair-db.sh",
            ) from exc
        raise HTTPException(status_code=500, detail="加载广场失败") from exc
    return {"total": len(items), "items": items}


def plaza_feed_item_from_api(app: dict, db: Session | None = None) -> dict:
    visibility = app.get("plaza_visibility", "none")
    dept = app.get("plaza_dept_name", "")
    at_label = "@公开" if visibility == "public" else f"@{dept}" if visibility == "dept" and dept else "@部门"
    modules = [str(m.get("label", "")) for m in (app.get("modules") or [])[:6] if isinstance(m, dict)]
    if not modules:
        modules = [str(s) for s in (app.get("scenarios") or [])[:6]]
    author = (app.get("contact_email") or "").split("@")[0] or "创作者"
    likes, comments = 0, 0
    if db is not None and app.get("id"):
        from app.services.plaza_interactions import plaza_interaction_counts

        likes, comments = plaza_interaction_counts(db, str(app["id"]))
    return {
        "id": f"db-{app['id']}",
        "appKey": app["id"],
        "authorName": author,
        "authorInitial": author[:1] or "创",
        "authorMeta": "积木仓",
        "visibility": visibility if visibility in ("public", "dept") else "public",
        "atLabel": at_label,
        "appName": app["name"],
        "modules": modules,
        "summary": f"{len(modules)} 项能力 · Web + App 双端可访问。",
        "webUrl": app.get("web_url", ""),
        "publishedAt": app.get("plaza_published_at") or app.get("created_at"),
        "likes": likes,
        "comments": comments,
        "reposts": 0,
        "plaza_visibility": visibility,
        "plaza_dept_name": dept,
    }


@router.post("/upload-icon")
def upload_app_icon(body: UploadIconRequest) -> dict:
    """上传应用图标（PNG/JPEG base64），返回可写入 publish 的 icon_url。"""
    try:
        icon_url = save_app_icon_data_url(body.data_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"success": True, "icon_url": icon_url}


@router.get("/files/{file_key:path}")
def serve_creation_file(file_key: str) -> Response:
    if ".." in file_key or not file_key.startswith("app-icons/"):
        raise HTTPException(status_code=404, detail="Not found")
    try:
        data = read_bytes(file_key)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Not found") from None
    media = "image/png"
    if file_key.endswith(".jpg") or file_key.endswith(".jpeg"):
        media = "image/jpeg"
    elif file_key.endswith(".webp"):
        media = "image/webp"
    return Response(content=data, media_type=media)


@router.get("/apps")
def get_created_apps(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    tenant_id = current_user.tenant_id if current_user.role != "admin" else None
    return {"items": list_published_apps(db, tenant_id=tenant_id)}
