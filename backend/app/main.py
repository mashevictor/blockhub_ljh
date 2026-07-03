from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from app.api.v1 import agents, approvals, auth, catalog, chat, creation, health, kb, notifications, reports, seed, stats
from app.core.config import settings
from app.core.deps import get_current_user
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


@app.exception_handler(OperationalError)
async def database_unavailable(_: Request, __: OperationalError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"detail": "数据库不可用，请启动 PostgreSQL（docker compose up -d postgres）"},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_auth = [Depends(get_current_user)]

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(seed.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(creation.router, prefix=settings.api_prefix)
app.include_router(agents.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(stats.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(chat.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(kb.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(approvals.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(reports.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(notifications.router, prefix=settings.api_prefix, dependencies=_auth)


@app.get("/")
def root() -> dict:
    return {
        "message": "TrackChat PaaS API",
        "version": settings.app_version,
        "docs": "/docs",
        "catalog": f"{settings.api_prefix}/catalog/summary",
    }
