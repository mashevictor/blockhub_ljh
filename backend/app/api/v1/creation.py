from typing import Annotated

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, get_optional_user
from app.data.module_data import CREATION_WIZARD_STEPS, INDUSTRY_PACK_OPTIONS
from app.db.models import User
from app.db.session import get_db
from app.services.app_store import list_published_apps, persist_published_app
from app.services import catalog_store
from app.services.file_storage import read_bytes, save_app_icon_data_url, uploads_root
from app.services.flow_module_api import generate_flow_module_apis
from app.services.module_suggest import suggest_modules
from app.services.publish_email import send_publish_delivery_email
from app.services.email_service import smtp_configured

router = APIRouter(prefix="/creation", tags=["creation"])
logger = logging.getLogger(__name__)


class FeasibilityRequest(BaseModel):
    industry_key: str
    scenario_ids: list[str]


class SuggestModulesRequest(BaseModel):
    text: str
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
def suggest_modules_api(body: SuggestModulesRequest) -> dict:
    return suggest_modules(body.text, force_llm=body.force_llm)


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


@router.post("/feasibility")
def feasibility_check(body: FeasibilityRequest) -> dict:
    pack = next((p for p in INDUSTRY_PACK_OPTIONS if p["key"] == body.industry_key), None)
    return {
        "feasible": True,
        "score": 92,
        "industry": pack["name"] if pack else body.industry_key,
        "scenario_count": len(body.scenario_ids),
        "capabilities": ["chat_qa", "approval_flow", "kb_document", "chart_dashboard"],
        "warnings": [],
        "summary": f"已选择 {len(body.scenario_ids)} 个场景，系统将自动生成 Page Schema 并编排 4 项 Capability。",
    }


@router.post("/publish")
def publish_app(
    body: PublishRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
) -> dict:
    try:
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
        apk_path = uploads_root() / "apks" / f"{app['id']}.apk"
        default_apk = uploads_root() / "apks" / "default.apk"
        deliver = app.get("deliver", "both")
        apk_ready = (apk_path.is_file() or default_apk.is_file()) and deliver in ("app", "both")

        email_sent = False
        if body.contact_email and settings.publish_email_enabled:
            try:
                email_sent = send_publish_delivery_email(body.contact_email, app, deliver=deliver)
            except Exception:
                logger.exception("publish email failed for %s (app still published)", body.contact_email)

        return {
            "success": True,
            "app": app,
            "runtime": {
                "web_url": app.get("web_url"),
                "download_url": app.get("download_url"),
                "deliver": deliver,
                "apk_ready": apk_ready,
            },
            "notification": {
                "email": body.contact_email or None,
                "email_sent": email_sent,
                "email_configured": smtp_configured(),
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("POST /creation/publish failed")
        detail = str(exc).lower()
        if "icon_url" in detail or "primary_color" in detail or "undefinedcolumn" in detail.replace(" ", ""):
            raise HTTPException(
                status_code=503,
                detail="数据库 schema 过旧，请在服务器执行: cd /root/blockhub && bash scripts/repair-db.sh",
            ) from exc
        raise HTTPException(status_code=500, detail="发布失败，请稍后重试或联系管理员查看 API 日志") from exc


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
