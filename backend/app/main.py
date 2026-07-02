from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import agents, approvals, catalog, chat, creation, health, kb, notifications, reports, stats
from app.core.config import settings

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.api_prefix)
app.include_router(catalog.router, prefix=settings.api_prefix)
app.include_router(agents.router, prefix=settings.api_prefix)
app.include_router(stats.router, prefix=settings.api_prefix)
app.include_router(creation.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(kb.router, prefix=settings.api_prefix)
app.include_router(approvals.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
app.include_router(notifications.router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "message": "TrackChat PaaS API",
        "version": settings.app_version,
        "docs": "/docs",
        "catalog": f"{settings.api_prefix}/catalog/summary",
    }
