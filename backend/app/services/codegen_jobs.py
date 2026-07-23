"""异步 codegen 任务队列（文件 + 线程，对齐 apk_builder）。"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.codegen_deepseek import generate_capability_pages
from app.services.file_storage import uploads_root
from app.services.schema_merge_generated import merge_generated_into_app

logger = logging.getLogger(__name__)

JobStatus = Literal["pending", "running", "ready", "failed", "cancelled"]

_LOCK = threading.Lock()
_ACTIVE: set[str] = set()
_CANCEL: set[str] = set()


def _root() -> Path:
    path = uploads_root() / "codegen"
    path.mkdir(parents=True, exist_ok=True)
    (path / ".queue").mkdir(parents=True, exist_ok=True)
    (path / ".status").mkdir(parents=True, exist_ok=True)
    return path


def _status_path(job_id: str) -> Path:
    return _root() / ".status" / f"{job_id}.json"


def _queue_path(job_id: str) -> Path:
    return _root() / ".queue" / f"{job_id}.json"


def get_codegen_job(job_id: str) -> dict[str, Any]:
    path = _status_path(job_id)
    if not path.is_file():
        return {"id": job_id, "status": "failed", "error": "job not found"}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"id": job_id, "status": "failed", "error": "status corrupt"}


def _write_status(job_id: str, payload: dict[str, Any]) -> None:
    payload = {**payload, "id": job_id, "updated_at": datetime.now(timezone.utc).isoformat()}
    _status_path(job_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _is_cancel_requested(job_id: str) -> bool:
    with _LOCK:
        if job_id in _CANCEL:
            return True
    st = get_codegen_job(job_id)
    return bool(st.get("cancel_requested")) or st.get("status") == "cancelled"


def cancel_codegen_job(job_id: str) -> dict[str, Any]:
    """请求取消：排队中可立即 cancelled；生成中则标记，完成后丢弃合并。"""
    jid = (job_id or "").strip()
    if not jid:
        return {"id": "", "status": "failed", "error": "missing job_id"}
    with _LOCK:
        _CANCEL.add(jid)
    cur = get_codegen_job(jid)
    if cur.get("status") in ("ready", "failed", "cancelled"):
        return cur
    _write_status(
        jid,
        {
            **{k: v for k, v in cur.items() if k != "updated_at"},
            "status": "cancelled" if cur.get("status") == "pending" else cur.get("status") or "running",
            "cancel_requested": True,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "error": cur.get("error") or "cancelled by user",
        },
    )
    # 仍在 pending 且未进 _ACTIVE：直接标 cancelled
    with _LOCK:
        if jid not in _ACTIVE:
            _write_status(
                jid,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "app_id": cur.get("app_id"),
                    "unknown_keys": cur.get("unknown_keys") or [],
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "error": "cancelled by user",
                },
            )
    return get_codegen_job(jid)


def find_active_codegen_job(app_id: str) -> dict[str, Any] | None:
    """按 app_id 找最近一条未结束任务（供刷新后续跑）。"""
    aid = (app_id or "").strip()
    if not aid:
        return None
    status_dir = _root() / ".status"
    if not status_dir.is_dir():
        return None
    best: dict[str, Any] | None = None
    best_ts = ""
    for path in status_dir.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if str(data.get("app_id") or "") != aid:
            continue
        st = str(data.get("status") or "")
        if st not in ("pending", "running"):
            continue
        if data.get("cancel_requested"):
            continue
        ts = str(data.get("updated_at") or data.get("queued_at") or data.get("started_at") or "")
        if ts >= best_ts:
            best_ts = ts
            best = data
    return best


def enqueue_codegen_job(
    *,
    app_id: str,
    app_name: str,
    unknown_keys: list[str],
    prompt: str,
    web_template_id: str,
    app_ui_id: str,
    base_html_by_key: dict[str, str] | None = None,
    tenant_id: str | None = None,
    owner_user_id: str | None = None,
) -> str:
    if not unknown_keys:
        return ""
    job_id = uuid4().hex[:12]
    spec = {
        "job_id": job_id,
        "app_id": app_id,
        "app_name": app_name,
        "unknown_keys": unknown_keys,
        "prompt": prompt or "",
        "web_template_id": web_template_id,
        "app_ui_id": app_ui_id,
        "tenant_id": (tenant_id or "").strip(),
        "owner_user_id": (owner_user_id or "").strip(),
        "base_html_by_key": {
            str(k): str(v)[:120_000] for k, v in (base_html_by_key or {}).items() if str(v).strip()
        },
    }
    _queue_path(job_id).write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")
    _write_status(
        job_id,
        {
            "status": "pending",
            "app_id": app_id,
            "tenant_id": spec["tenant_id"] or None,
            "owner_user_id": spec["owner_user_id"] or None,
            "unknown_keys": unknown_keys,
            "revise": bool(spec["base_html_by_key"]),
            "queued_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    thread = threading.Thread(
        target=_run_job,
        args=(job_id,),
        name=f"codegen-{job_id}",
        daemon=True,
    )
    thread.start()
    return job_id


def _run_job(job_id: str) -> None:
    with _LOCK:
        if job_id in _ACTIVE:
            return
        _ACTIVE.add(job_id)
    try:
        if _is_cancel_requested(job_id):
            _write_status(
                job_id,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "error": "cancelled by user",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            return
        raw = _queue_path(job_id).read_text(encoding="utf-8")
        spec = json.loads(raw)
        _write_status(
            job_id,
            {
                "status": "running",
                "app_id": spec.get("app_id"),
                "unknown_keys": spec.get("unknown_keys") or [],
                "revise": bool(spec.get("base_html_by_key")),
                "started_at": datetime.now(timezone.utc).isoformat(),
                "cancel_requested": _is_cancel_requested(job_id),
            },
        )
        if _is_cancel_requested(job_id):
            _write_status(
                job_id,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "app_id": spec.get("app_id"),
                    "unknown_keys": spec.get("unknown_keys") or [],
                    "error": "cancelled by user",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            return
        result = generate_capability_pages(
            app_name=str(spec.get("app_name") or "应用"),
            unknown_keys=list(spec.get("unknown_keys") or []),
            prompt=str(spec.get("prompt") or ""),
            web_template_id=str(spec.get("web_template_id") or "tabs_portal"),
            app_ui_id=str(spec.get("app_ui_id") or "bottom_tabs"),
            base_html_by_key=dict(spec.get("base_html_by_key") or {}),
        )
        if _is_cancel_requested(job_id):
            _write_status(
                job_id,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "app_id": spec.get("app_id"),
                    "unknown_keys": spec.get("unknown_keys") or [],
                    "error": "cancelled by user（生成结果已丢弃）",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            return
        db: Session = SessionLocal()
        try:
            merged = merge_generated_into_app(
                db,
                public_id=str(spec["app_id"]),
                generated=result,
            )
        finally:
            db.close()

        if _is_cancel_requested(job_id):
            _write_status(
                job_id,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "app_id": spec.get("app_id"),
                    "unknown_keys": spec.get("unknown_keys") or [],
                    "error": "cancelled by user",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            return

        _write_status(
            job_id,
            {
                "status": "ready",
                "app_id": spec.get("app_id"),
                "unknown_keys": spec.get("unknown_keys") or [],
                "result": {
                    "page_count": len(result.get("generated_pages") or []),
                    "flutter_screen_count": len(result.get("generated_flutter_screens") or []),
                    "llm": bool(result.get("llm")),
                    "routes": [p.get("route") for p in (result.get("generated_pages") or [])],
                    # Runtime 草稿可直接合并，不依赖 DB merge 成功
                    "generated_pages": result.get("generated_pages") or [],
                    "generated_flutter_screens": result.get("generated_flutter_screens") or [],
                },
                "merged": bool(merged),
                "finished_at": datetime.now(timezone.utc).isoformat(),
            },
        )
    except Exception as exc:
        logger.exception("codegen job %s failed", job_id)
        if _is_cancel_requested(job_id):
            _write_status(
                job_id,
                {
                    "status": "cancelled",
                    "cancel_requested": True,
                    "error": "cancelled by user",
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
        else:
            _write_status(
                job_id,
                {
                    "status": "failed",
                    "error": str(exc)[:500],
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                },
            )
    finally:
        with _LOCK:
            _ACTIVE.discard(job_id)
            _CANCEL.discard(job_id)
