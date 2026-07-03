"""Redis connection helper — optional; API runs without Redis if unreachable."""

from __future__ import annotations

import logging
from functools import lru_cache

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache
def get_redis() -> redis.Redis | None:
    if not settings.redis_url:
        return None
    try:
        client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        return client
    except Exception:
        logger.warning("Redis unavailable at %s", settings.redis_url)
        return None


def redis_ping() -> bool:
    client = get_redis()
    if client is None:
        return False
    try:
        return client.ping()
    except Exception:
        return False
