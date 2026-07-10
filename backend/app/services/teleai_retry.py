from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


async def teleai_retry(
    fn: Callable[[], Awaitable[T]],
    *,
    attempts: int = 3,
    base_delay: float = 0.4,
    label: str = "teleai",
) -> T:
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return await fn()
        except Exception as exc:
            last_exc = exc
            if attempt >= attempts:
                break
            await asyncio.sleep(base_delay * attempt)
    assert last_exc is not None
    raise last_exc


async def teleai_stream_with_retry(
    factory: Callable[[], AsyncIterator[T]],
    *,
    attempts: int = 3,
    base_delay: float = 0.4,
) -> AsyncIterator[T]:
    last_exc: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            async for item in factory():
                yield item
            return
        except Exception as exc:
            last_exc = exc
            if attempt >= attempts:
                break
            await asyncio.sleep(base_delay * attempt)
    assert last_exc is not None
    raise last_exc
