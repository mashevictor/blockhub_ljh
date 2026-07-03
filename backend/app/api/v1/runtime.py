"""Runtime delivery — Web employee shell + APK download."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.models import AppRecord
from app.db.session import get_db
from app.services.file_storage import uploads_root

router = APIRouter(prefix="/runtime", tags=["runtime"])

APK_DIR = "apks"
DEFAULT_APK = f"{APK_DIR}/default.apk"


def _apk_path(public_id: str) -> Path:
    root = uploads_root()
    per_app = root / APK_DIR / f"{public_id}.apk"
    if per_app.is_file():
        return per_app
    default = root / DEFAULT_APK
    if default.is_file():
        return default
    return per_app


@router.get("/{public_id}")
def runtime_info(public_id: str, db: Session = Depends(get_db)) -> dict:
    """运行时元信息（Web / App 共用）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    apk = _apk_path(public_id)
    return {
        "public_id": app.public_id,
        "name": app.name,
        "deliver": app.deliver,
        "schema_url": app.schema_url,
        "icon_url": app.icon_url,
        "primary_color": app.primary_color,
        "web_ready": app.deliver in ("web", "both"),
        "apk_ready": apk.is_file() and app.deliver in ("app", "both"),
        "modules": app.modules,
        "capability_keys": app.capability_keys,
    }


@router.get("/{public_id}/download")
def download_apk(public_id: str, db: Session = Depends(get_db)) -> FileResponse:
    """下载 Android APK（优先 per-app 包，回退 default.apk）。"""
    app = db.query(AppRecord).filter(AppRecord.public_id == public_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="应用不存在")
    if app.deliver not in ("app", "both"):
        raise HTTPException(status_code=400, detail="该应用未开启 App 交付")

    apk = _apk_path(public_id)
    if not apk.is_file():
        raise HTTPException(
            status_code=503,
            detail="APK 正在构建中，请稍后重试或联系管理员执行 flutter-build-apk",
        )

    filename = f"{app.name.replace(' ', '_')}.apk"
    return FileResponse(
        path=apk,
        media_type="application/vnd.android.package-archive",
        filename=filename,
    )
