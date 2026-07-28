"""Structured API errors: detail = { code, params } for frontend t('error.' + code)."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException


def api_detail(code: str, **params: Any) -> dict[str, Any]:
    """Build FastAPI HTTPException detail payload."""
    body: dict[str, Any] = {"code": code}
    cleaned = {k: v for k, v in params.items() if v is not None}
    if cleaned:
        body["params"] = cleaned
    return body


def raise_api_error(status_code: int, code: str, **params: Any) -> None:
    """Raise HTTPException with structured i18n-ready detail."""
    raise HTTPException(status_code=status_code, detail=api_detail(code, **params))
