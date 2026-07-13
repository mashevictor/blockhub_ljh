"""Per-app APK build queue — triggered after POST /creation/publish."""

from __future__ import annotations

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
from app.services.apk_build_profiles import resolve_apk_build_profile
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
    if per_app_apk_path(public_id).is_file():
        return {
            "status": "ready",
            "public_id": public_id,
            "apk_bytes": per_app_apk_path(public_id).stat().st_size,
        }
    raw = _read_status(public_id)
    if raw:
        return raw
    return {"status": "pending", "public_id": public_id}


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


def build_spec_from_app(app: dict[str, Any]) -> dict[str, Any]:
    keys = list(app.get("capability_keys") or [])
    profile = resolve_apk_build_profile(keys)
    api_base = f"{settings.public_base_url.rstrip('/')}{settings.api_prefix}"
    return {
        "public_id": app["id"],
        "app_name": app.get("name") or "积木仓应用",
        "icon_url": app.get("icon_url") or "",
        "primary_color": app.get("primary_color") or "#4338ca",
        "capability_keys": keys,
        "build_manifest": app.get("build_manifest") or {},
        "deliver": app.get("deliver") or "both",
        "profile_id": profile.profile_id,
        "voice_demo": profile.voice_demo,
        "android_app_id": profile.android_app_id,
        "tenant_slug": profile.tenant_slug,
        "api_base_url": api_base,
    }


def write_build_queue_spec(app: dict[str, Any]) -> Path:
    spec = build_spec_from_app(app)
    path = _queue_dir() / f"{spec['public_id']}.json"
    path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def should_enqueue_apk_build(app: dict[str, Any]) -> bool:
    deliver = app.get("deliver") or "both"
    if deliver not in ("app", "both"):
        return False
    public_id = app.get("id") or ""
    if not public_id:
        return False
    if per_app_apk_path(public_id).is_file():
        return False
    status = get_apk_build_status(public_id)
    if status == "building":
        return False
    return True


def enqueue_apk_build(app: dict[str, Any]) -> BuildStatus:
    """Schedule a background APK build for a freshly published app."""
    public_id = app.get("id") or ""
    if not should_enqueue_apk_build(app):
        if per_app_apk_path(public_id).is_file():
            return "ready"
        return get_apk_build_status(public_id)

    write_build_queue_spec(app)
    _write_status(public_id, {
        "status": "pending",
        "public_id": public_id,
        "profile_id": resolve_apk_build_profile(app.get("capability_keys") or []).profile_id,
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
    _write_status(public_id, {
        "status": "building",
        "public_id": public_id,
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
            "started_at": started,
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "apk_bytes": per_app_apk_path(public_id).stat().st_size,
        })
        logger.info("APK build ready for %s", public_id)
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
