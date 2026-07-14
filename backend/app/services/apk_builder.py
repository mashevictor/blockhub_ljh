"""Per-app APK build queue — triggered after POST /creation/publish."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from app.core.config import settings
from app.services.apk_build_profiles import android_app_id_for_public_id, resolve_apk_build_profile
from app.services.file_storage import uploads_root

logger = logging.getLogger(__name__)

BuildStatus = Literal["pending", "building", "ready", "failed", "skipped"]

_BUILD_LOCK = threading.Lock()
_GRADLE_BUILD_LOCK = threading.Lock()
_ACTIVE_BUILDS: set[str] = set()

STATUS_DIR_NAME = ".build-status"
QUEUE_DIR_NAME = ".build-queue"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _bash_executable() -> str:
    for candidate in ("/bin/bash", "/usr/bin/bash"):
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    found = shutil.which("bash")
    if found:
        return found
    return "/bin/bash"


def _subprocess_path() -> str:
    """systemd 仅暴露 venv/bin 时，子进程仍需 /usr/bin、flutter 等。"""
    repo = _repo_root()
    parts = [
        str(repo / "backend" / ".venv" / "bin"),
        "/root/flutter/bin",
        "/opt/flutter/bin",
        "/usr/local/sbin",
        "/usr/local/bin",
        "/usr/sbin",
        "/usr/bin",
        "/sbin",
        "/bin",
    ]
    seen: set[str] = set()
    ordered: list[str] = []
    for p in parts + os.environ.get("PATH", "").split(":"):
        if p and p not in seen:
            seen.add(p)
            ordered.append(p)
    return ":".join(ordered)


def _subprocess_env() -> dict[str, str]:
    return {
        **os.environ,
        "PATH": _subprocess_path(),
        "BUILD_SKIP_STOP_SERVICES": "1",
    }


def _apk_dir() -> Path:
    path = uploads_root() / "apks"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _status_dir() -> Path:
    path = _apk_dir() / STATUS_DIR_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def _queue_dir() -> Path:
    path = _apk_dir() / QUEUE_DIR_NAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def per_app_apk_path(public_id: str) -> Path:
    return _apk_dir() / f"{public_id}.apk"


def per_app_apk_ready(public_id: str, *, deliver: str) -> bool:
    if deliver not in ("app", "both"):
        return False
    return per_app_apk_path(public_id).is_file()


def _status_path(public_id: str) -> Path:
    return _status_dir() / f"{public_id}.json"


def get_apk_build_status(public_id: str) -> BuildStatus:
    if per_app_apk_path(public_id).is_file():
        return "ready"
    raw = _read_status(public_id)
    if raw:
        status = str(raw.get("status", ""))
        if status in ("pending", "building", "ready", "failed", "skipped"):
            return status  # type: ignore[return-value]
    return "pending"


def get_apk_build_detail(public_id: str) -> dict[str, Any]:
    """Status payload for runtime UI / E2E (includes error + log path when failed)."""
    app_id = android_app_id_for_public_id(public_id)
    if per_app_apk_path(public_id).is_file():
        raw = _read_status(public_id) or {}
        return {
            "status": "ready",
            "public_id": public_id,
            "android_app_id": raw.get("android_app_id") or app_id,
            "build_fingerprint": raw.get("build_fingerprint"),
            "apk_bytes": per_app_apk_path(public_id).stat().st_size,
        }
    raw = _read_status(public_id)
    if raw:
        raw.setdefault("android_app_id", app_id)
        return raw
    return {"status": "pending", "public_id": public_id, "android_app_id": app_id}


def _read_status(public_id: str) -> dict[str, Any] | None:
    path = _status_path(public_id)
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_status(public_id: str, payload: dict[str, Any]) -> None:
    path = _status_path(public_id)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _spec_fingerprint(spec: dict[str, Any]) -> str:
    payload = {
        "android_app_id": spec.get("android_app_id"),
        "capability_keys": sorted(spec.get("capability_keys") or []),
        "app_ui_id": spec.get("app_ui_id"),
        "app_name": spec.get("app_name"),
        "voice_demo": bool(spec.get("voice_demo")),
        "primary_color": spec.get("primary_color"),
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def build_spec_from_app(app: dict[str, Any]) -> dict[str, Any]:
    keys = list(app.get("capability_keys") or [])
    public_id = str(app.get("id") or "")
    app_ui = (
        app.get("app_ui_id")
        or (app.get("build_manifest") or {}).get("meta", {}).get("app_ui_id")
        or (app.get("page_schema") or {}).get("meta", {}).get("app_ui_id")
    )
    profile = resolve_apk_build_profile(keys, app_ui_id=app_ui, public_id=public_id)
    api_base = f"{settings.public_base_url.rstrip('/')}{settings.api_prefix}"
    return {
        "public_id": public_id,
        "app_name": app.get("name") or "积木仓应用",
        "icon_url": app.get("icon_url") or "",
        "primary_color": app.get("primary_color") or "#4338ca",
        "capability_keys": keys,
        "build_manifest": app.get("build_manifest") or {},
        "deliver": app.get("deliver") or "both",
        "profile_id": profile.profile_id,
        "app_ui_id": profile.app_ui_id,
        "voice_demo": profile.voice_demo,
        "android_app_id": profile.android_app_id,
        "tenant_slug": profile.tenant_slug,
        "api_base_url": api_base,
        "build_fingerprint": "",  # filled in write_build_queue_spec
    }


def write_build_queue_spec(app: dict[str, Any]) -> Path:
    spec = build_spec_from_app(app)
    spec["build_fingerprint"] = _spec_fingerprint(spec)
    path = _queue_dir() / f"{spec['public_id']}.json"
    path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def _invalidate_stale_apk(public_id: str) -> None:
    path = per_app_apk_path(public_id)
    if path.is_file():
        try:
            path.unlink()
            logger.info("Removed stale APK for rebuild: %s", public_id)
        except OSError:
            logger.exception("Failed to remove stale APK %s", path)


def should_enqueue_apk_build(app: dict[str, Any]) -> bool:
    """Enqueue when no APK, or when publish fingerprint no longer matches last ready build."""
    deliver = app.get("deliver") or "both"
    if deliver not in ("app", "both"):
        return False
    public_id = app.get("id") or ""
    if not public_id:
        return False

    raw = _read_status(public_id)
    if raw and raw.get("status") == "building":
        return False

    spec = build_spec_from_app(app)
    fingerprint = _spec_fingerprint(spec)
    apk_exists = per_app_apk_path(public_id).is_file()
    if apk_exists and raw and raw.get("build_fingerprint") == fingerprint:
        return False
    if apk_exists and (not raw or raw.get("build_fingerprint") != fingerprint):
        # 旧包（无 fingerprint / 选型变更）→ 删掉后重建
        _invalidate_stale_apk(public_id)
        return True
    return True


def enqueue_apk_build(app: dict[str, Any]) -> BuildStatus:
    """Schedule a background APK build for a freshly published app."""
    public_id = app.get("id") or ""
    if not should_enqueue_apk_build(app):
        if per_app_apk_path(public_id).is_file():
            return "ready"
        return get_apk_build_status(public_id)

    profile = resolve_apk_build_profile(
        app.get("capability_keys") or [],
        app_ui_id=app.get("app_ui_id"),
        public_id=public_id,
    )
    path = write_build_queue_spec(app)
    try:
        spec = json.loads(path.read_text(encoding="utf-8"))
        fingerprint = spec.get("build_fingerprint") or ""
    except Exception:
        fingerprint = ""

    _write_status(public_id, {
        "status": "pending",
        "public_id": public_id,
        "profile_id": profile.profile_id,
        "android_app_id": profile.android_app_id,
        "build_fingerprint": fingerprint,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    })

    thread = threading.Thread(
        target=_run_build_job,
        args=(public_id,),
        name=f"apk-build-{public_id}",
        daemon=True,
    )
    thread.start()
    return "pending"


def _run_build_job(public_id: str) -> None:
    with _BUILD_LOCK:
        if public_id in _ACTIVE_BUILDS:
            return
        _ACTIVE_BUILDS.add(public_id)

    started = datetime.now(timezone.utc).isoformat()
    queue_path = _queue_dir() / f"{public_id}.json"
    android_id = android_app_id_for_public_id(public_id)
    fingerprint = ""
    try:
        if queue_path.is_file():
            q = json.loads(queue_path.read_text(encoding="utf-8"))
            android_id = str(q.get("android_app_id") or android_id)
            fingerprint = str(q.get("build_fingerprint") or "")
    except Exception:
        pass

    _write_status(public_id, {
        "status": "building",
        "public_id": public_id,
        "android_app_id": android_id,
        "build_fingerprint": fingerprint,
        "started_at": started,
    })

    script = _repo_root() / "scripts" / "flutter-build-from-publish.sh"
    log_path = _apk_dir() / ".build-status" / f"{public_id}.log"

    try:
        if not script.is_file():
            raise FileNotFoundError(f"Missing build script: {script}")

        env = _subprocess_env()
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with _GRADLE_BUILD_LOCK:
            # 勿用 capture_output=True — Gradle 输出量大时会填满 pipe 导致子进程永久阻塞
            with open(log_path, "w", encoding="utf-8") as log_f:
                proc = subprocess.run(
                    [_bash_executable(), str(script), public_id],
                    cwd=str(_repo_root()),
                    stdout=log_f,
                    stderr=subprocess.STDOUT,
                    timeout=3600,
                    env=env,
                )

        if proc.returncode != 0:
            tail = log_path.read_text(encoding="utf-8", errors="replace")[-4000:]
            raise RuntimeError(f"flutter-build-from-publish exited {proc.returncode}\n{tail}")

        if not per_app_apk_path(public_id).is_file():
            raise RuntimeError("Build finished but APK file missing")

        _write_status(public_id, {
            "status": "ready",
            "public_id": public_id,
            "android_app_id": android_id,
            "build_fingerprint": fingerprint,
            "started_at": started,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "apk_bytes": per_app_apk_path(public_id).stat().st_size,
        })
        logger.info("APK build ready for %s android_app_id=%s", public_id, android_id)
    except Exception as exc:
        logger.exception("APK build failed for %s", public_id)
        _write_status(public_id, {
            "status": "failed",
            "public_id": public_id,
            "started_at": started,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
            "log": str(log_path),
        })
    finally:
        with _BUILD_LOCK:
            _ACTIVE_BUILDS.discard(public_id)
