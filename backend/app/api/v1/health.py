from fastapi import APIRouter

from app.core.redis_client import redis_ping

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    redis_ok = redis_ping()
    return {
        "status": "ok",
        "service": "TrackChat PaaS API",
        "redis": "ok" if redis_ok else "unavailable",
    }
