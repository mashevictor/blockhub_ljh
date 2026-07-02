from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_optional_user
from app.data.module_data import CREATION_WIZARD_STEPS, INDUSTRY_PACK_OPTIONS
from app.db.models import User
from app.db.session import get_db
from app.services.app_store import list_published_apps, persist_published_app
from app.services import catalog_store
from app.services.module_suggest import suggest_modules

router = APIRouter(prefix="/creation", tags=["creation"])


class FeasibilityRequest(BaseModel):
    industry_key: str
    scenario_ids: list[str]


class SuggestModulesRequest(BaseModel):
    text: str
    force_llm: bool = False


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
    )
    return {"success": True, "app": app}


@router.get("/apps")
def get_created_apps(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    tenant_id = current_user.tenant_id if current_user.role != "admin" else None
    return {"items": list_published_apps(db, tenant_id=tenant_id)}
