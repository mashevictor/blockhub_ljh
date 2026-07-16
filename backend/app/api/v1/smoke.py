"""冒烟测试 API — 服务器上 curl 即可看弹幕全链路。"""

from __future__ import annotations

from fastapi import APIRouter, Query, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.danmaku_smoke import run_danmaku_smoke

router = APIRouter(prefix="/smoke", tags=["smoke"])


def _optional_db() -> Session | None:
    db: Session | None = None
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        return db
    except Exception:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass
        return None


@router.get("/danmaku")
def smoke_danmaku(
    request: Request,
    suggest: bool = Query(False, description="额外跑 suggest_modules（较慢）"),
    probe_db: bool = Query(True, description="探测各能力 store.list_*（需数据库）"),
) -> dict:
    """弹幕 Hero 全链路冒烟：注册表 / Web 包 / 路由 / 列表 store / 标签匹配。

    服务器查看::

        curl -sS https://blockhub.club/api/v1/smoke/danmaku | python3 -m json.tool
    """
    db = _optional_db() if probe_db else None
    try:
        return run_danmaku_smoke(
            app=request.app,
            db=db,
            probe_db=bool(db) and probe_db,
            probe_suggest=suggest,
            api_prefix=settings.api_prefix or "/api/v1",
        )
    finally:
        if db is not None:
            try:
                db.close()
            except Exception:
                pass


@router.get("")
def smoke_index() -> dict:
    return {
        "endpoints": [
            {
                "path": "/api/v1/smoke/danmaku",
                "desc": "首页弹幕全部能力与接口冒烟",
            }
        ]
    }
