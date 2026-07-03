"""IP-based rate limiting — Redis when available, in-memory fallback."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.redis_client import get_redis

_memory: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _check_rate_limit(key: str, limit: int, window: int) -> bool:
    """Return True if request is allowed."""
    client = get_redis()
    now = time.time()
    if client:
        redis_key = f"rl:{key}"
        pipe = client.pipeline()
        pipe.incr(redis_key)
        pipe.ttl(redis_key)
        count, ttl = pipe.execute()
        if ttl == -1:
            client.expire(redis_key, window)
        return int(count) <= limit

    bucket = _memory[key]
    cutoff = now - window
    _memory[key] = [t for t in bucket if t > cutoff]
    if len(_memory[key]) >= limit:
        return False
    _memory[key].append(now)
    return True


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Throttle sensitive auth endpoints."""

    PATHS = {
        "/api/v1/auth/send-code": (10, 60),
        "/api/v1/auth/login": (30, 60),
        "/api/v1/auth/login-otp": (20, 60),
    }

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled:
            return await call_next(request)

        path = request.url.path.rstrip("/") or "/"
        for prefix, (limit, window) in self.PATHS.items():
            if path == prefix.rstrip("/") or path.startswith(prefix):
                ip = _client_ip(request)
                key = f"{path}:{ip}"
                if not _check_rate_limit(key, limit, window):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "请求过于频繁，请稍后再试"},
                    )
                break
        return await call_next(request)
