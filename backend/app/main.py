from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.v1 import (
    agents,
    approvals,
    audit,
    auth,
    catalog,
    chat,
    contracts,
    creation,
    demo_booking,
    device_repair,
    health,
    integration,
    inventory_count,
    kb,
    member_loyalty,
    med_triage,
    nurse_shift,
    game_support,
    school_notice,
    homework_qa,
    property_repair,
    site_patrol,
    class_schedule,
    hotel_booking,
    study_coach,
    delivery_order,
    house_viewing,
    campaign_ops,
    fitness_checkin,
    travel_plan,
    legal_case,
    gov_service,
    pet_clinic,
    deco_material,
    wedding_plan,
    notifications,
    quality_inspect,
    reports,
    runtime,
    seed,
    share,
    stats,
    tenant,
    voice_agent,
)
from app.core.config import settings
from app.core.deps import get_current_user, require_admin
from app.core.rate_limit import RateLimitMiddleware
from app.db.session import SessionLocal
from app.services.catalog_seed import ensure_catalog_seeded
from app.services.db_seed import ensure_seed_data


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        ensure_seed_data(db)
        ensure_catalog_seeded(db)
    except Exception:
        import logging

        logging.getLogger("uvicorn.error").exception(
            "Startup seed failed — API will still run; check DB and run POST /api/v1/seed"
        )
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)


@app.exception_handler(OperationalError)
async def database_unavailable(_: Request, __: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "数据库不可用，请启动 PostgreSQL（docker compose up -d postgres）"},
    )


# 允许通过环境变量 cors_origins 配置跨域来源。
# 若包含 "*" 表示允许任意来源（适用于「生成的网页可被任意站点托管」的场景）；
# 此时关闭凭据，因为浏览器不允许 "*" 与 credentials 同时使用。
_cors_raw = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
_allow_all = "*" in _cors_raw
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else _cors_raw,
    allow_credentials=False if _allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_auth = [Depends(get_current_user)]
_admin = [Depends(require_admin)]

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(tenant.router, prefix=settings.api_prefix)
app.include_router(runtime.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(seed.router, prefix=settings.api_prefix, dependencies=_admin)
app.include_router(creation.router, prefix=settings.api_prefix)
app.include_router(demo_booking.router, prefix=settings.api_prefix)
app.include_router(share.router, prefix=settings.api_prefix)
app.include_router(agents.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(stats.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(chat.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(contracts.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(kb.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(approvals.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(device_repair.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(quality_inspect.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(inventory_count.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(member_loyalty.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(med_triage.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(nurse_shift.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(game_support.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(school_notice.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(homework_qa.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(property_repair.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(site_patrol.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(class_schedule.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(hotel_booking.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(study_coach.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(travel_plan.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(legal_case.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(gov_service.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(pet_clinic.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(deco_material.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(wedding_plan.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(fitness_checkin.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(campaign_ops.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(house_viewing.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(delivery_order.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(reports.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(notifications.router, prefix=settings.api_prefix, dependencies=_auth)
# integration：ingress/webhook 公开验签；其余路由在 router 内依赖 get_current_user
app.include_router(integration.router, prefix=settings.api_prefix)
app.include_router(audit.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(voice_agent.router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "message": "TrackChat PaaS API",
        "version": settings.app_version,
        "docs": "/docs",
        "catalog": f"{settings.api_prefix}/catalog/summary",
    }
