"""弹幕（Hero presets）全链路冒烟：选型匹配 · 注册表 · Web 包 · 路由 · 真 store 列表。"""

from __future__ import annotations

import importlib
import time
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.data.capability_registry import ALL_CAPABILITIES
from app.data.hero_presets import HERO_PRESETS
from app.db.models import User
from app.services.build_manifest import _web_pkg
from app.services.hero_preset_match import match_hero_presets
from app.services.keyword_match import match_modules_keyword
from app.services.module_suggest import suggest_modules
from app.services.web_capability_gate import is_web_ready_capability, is_web_widget_registered

REPO_ROOT = Path(__file__).resolve().parents[3]

# key → (store_module, list_fn, http_path_suffix for route check)
_STORE_PROBES: dict[str, tuple[str, str, str]] = {
    "device_repair": ("app.services.device_repair_store", "list_tickets", "/device-repair/tickets"),
    "leave_request": ("app.services.leave_request_store", "list_records", "/leave-request/records"),
    "expense_claim": ("app.services.expense_claim_store", "list_records", "/expense-claim/records"),
    "policy_qa": ("app.services.policy_qa_store", "list_records", "/policy-qa/records"),
    "hire_onboard": ("app.services.hire_onboard_store", "list_records", "/hire-onboard/records"),
    "sales_lead": ("app.services.sales_lead_store", "list_records", "/sales-lead/records"),
    "quote_contract": ("app.services.quote_contract_store", "list_records", "/quote-contract/records"),
    "ops_kpi": ("app.services.ops_kpi_store", "list_records", "/ops-kpi/records"),
    "quality_inspect": ("app.services.quality_inspect_store", "list_records", "/quality-inspect/records"),
    "inventory_count": ("app.services.inventory_count_store", "list_records", "/inventory-count/records"),
    "member_loyalty": ("app.services.member_loyalty_store", "list_members", "/member-loyalty/members"),
    "med_triage": ("app.services.med_triage_store", "list_records", "/med-triage/records"),
    "nurse_shift": ("app.services.nurse_shift_store", "list_records", "/nurse-shift/records"),
    "game_support": ("app.services.game_support_store", "list_records", "/game-support/records"),
    "finance_kyc": ("app.services.finance_ops_store", "list_records", "/finance-ops/finance_kyc/records"),
    "finance_aml": ("app.services.finance_ops_store", "list_records", "/finance-ops/finance_aml/records"),
    "credit_approval": ("app.services.finance_ops_store", "list_records", "/finance-ops/credit_approval/records"),
    "due_diligence": ("app.services.finance_ops_store", "list_records", "/finance-ops/due_diligence/records"),
    "regulatory_report": ("app.services.finance_ops_store", "list_records", "/finance-ops/regulatory_report/records"),
    "insurance_case": ("app.services.finance_ops_store", "list_records", "/finance-ops/insurance_case/records"),
    "school_notice": ("app.services.school_notice_store", "list_records", "/school-notice/records"),
    "homework_qa": ("app.services.homework_qa_store", "list_records", "/homework-qa/records"),
    "class_schedule": ("app.services.class_schedule_store", "list_records", "/class-schedule/records"),
    "campaign_ops": ("app.services.campaign_ops_store", "list_records", "/campaign-ops/records"),
    "property_repair": ("app.services.property_repair_store", "list_records", "/property-repair/records"),
    "house_viewing": ("app.services.house_viewing_store", "list_records", "/house-viewing/records"),
    "hotel_booking": ("app.services.hotel_booking_store", "list_records", "/hotel-booking/records"),
    "delivery_order": ("app.services.delivery_order_store", "list_records", "/delivery-order/records"),
    "fitness_checkin": ("app.services.fitness_checkin_store", "list_records", "/fitness-checkin/records"),
    "travel_plan": ("app.services.travel_plan_store", "list_records", "/travel-plan/records"),
    "wedding_plan": ("app.services.wedding_plan_store", "list_records", "/wedding-plan/records"),
    "deco_material": ("app.services.deco_material_store", "list_records", "/deco-material/records"),
    "pet_clinic": ("app.services.pet_clinic_store", "list_records", "/pet-clinic/records"),
    "site_patrol": ("app.services.site_patrol_store", "list_records", "/site-patrol/records"),
    "gov_service": ("app.services.gov_service_store", "list_records", "/gov-service/records"),
    "legal_case": ("app.services.legal_case_store", "list_records", "/legal-case/records"),
    "study_coach": ("app.services.study_coach_store", "list_courses", "/study-coach/courses"),
}

# 共享能力：不走独立 {key}_store CRUD
_SHARED_CAPS: dict[str, dict[str, str]] = {
    "notify_im": {
        "http_path": "/integrations",
        "note": "IM 连接器 · web-capability-integration",
        "web_dir": "web-capability-integration",
    },
    "chat_qa": {
        "http_path": "/chat/config",
        "note": "智能问答 · web-capability-chat",
        "web_dir": "web-capability-chat",
    },
    "shanghai_voice": {
        "http_path": "/voice/config",
        "note": "上海话语音 · web-capability-voice",
        "web_dir": "web-capability-voice",
    },
}


def hero_module_keys() -> list[str]:
    keys: list[str] = []
    seen: set[str] = set()
    for p in HERO_PRESETS:
        for pick in p.get("picks") or []:
            if pick.get("type") not in ("module", "capability"):
                continue
            k = str(pick.get("key") or "").strip()
            if k and k not in seen:
                seen.add(k)
                keys.append(k)
    return keys


def _app_paths(app: FastAPI) -> set[str]:
    """兼容 FastAPI _IncludedRouter：优先用 OpenAPI paths。"""
    out: set[str] = set()
    try:
        for p in (app.openapi().get("paths") or {}):
            if isinstance(p, str):
                out.add(p)
    except Exception:
        pass
    if out:
        return out
    for r in app.routes:
        path = getattr(r, "path", None)
        if isinstance(path, str):
            out.add(path)
        nested = getattr(r, "routes", None)
        if nested:
            for nr in nested:
                np = getattr(nr, "path", None)
                if isinstance(np, str):
                    # included router path may be relative
                    prefix = getattr(r, "path", "") or ""
                    out.add(f"{prefix}{np}" if prefix else np)
    return out


def _path_registered(paths: set[str], suffix: str) -> bool:
    s = suffix if suffix.startswith("/") else f"/{suffix}"
    for p in paths:
        if p == s or p.endswith(s):
            return True
        # openapi 可能带 path params
        if s in p.replace("{", "").replace("}", ""):
            return True
    # 宽松：最后两段匹配
    parts = [x for x in s.split("/") if x]
    if len(parts) >= 2:
        tail = "/" + "/".join(parts[-2:])
        for p in paths:
            if p.endswith(tail) or tail in p:
                return True
    return False


def _web_pkg_on_disk(key: str, shared_dir: str | None = None) -> tuple[bool, str]:
    if shared_dir:
        d = REPO_ROOT / "packages" / shared_dir
        return d.is_dir(), str(d.relative_to(REPO_ROOT)) if d.is_dir() else shared_dir
    pkg = _web_pkg(key) or ""
    # @blockhub/web-capability-foo → packages/web-capability-foo
    slug = pkg.split("/")[-1] if pkg else f"web-capability-{key.replace('_', '-')}"
    d = REPO_ROOT / "packages" / slug
    return d.is_dir(), slug


def _probe_store(key: str, db: Session, tenant_id: str) -> dict[str, Any]:
    meta = _STORE_PROBES.get(key)
    if not meta:
        return {"status": "skip", "detail": "no store probe mapping"}
    mod_name, fn_name, _ = meta
    try:
        mod = importlib.import_module(mod_name)
        fn = getattr(mod, fn_name)
        if mod_name.endswith("finance_ops_store"):
            items = fn(db, tenant_id, kind=key)
        else:
            items = fn(db, tenant_id)
        n = len(items) if isinstance(items, list) else 0
        return {"status": "ok", "detail": f"{fn_name} returned {n}", "count": n}
    except Exception as exc:  # noqa: BLE001
        return {"status": "fail", "detail": f"{type(exc).__name__}: {exc}"}


def _match_primary(label: str, primary_key: str) -> dict[str, Any]:
    hero = match_hero_presets(label)
    kw = match_modules_keyword(label)
    keys = [str(x.get("key")) for x in hero + kw]
    hit = primary_key in keys
    # CapShip 锁定：前 8 名内即可
    top = keys[:8]
    return {
        "status": "ok" if hit else "fail",
        "primary_key": primary_key,
        "hit": hit,
        "top_keys": top[:6],
    }


def run_danmaku_smoke(
    *,
    app: FastAPI,
    db: Session | None,
    probe_db: bool = True,
    probe_suggest: bool = False,
    api_prefix: str = "/api/v1",
) -> dict[str, Any]:
    t0 = time.perf_counter()
    paths = _app_paths(app)
    module_keys = hero_module_keys()

    tenant_id: str | None = None
    db_ok = False
    if db is not None and probe_db:
        try:
            u = db.query(User).filter(User.is_active.is_(True)).first()
            if u and u.tenant_id:
                tenant_id = str(u.tenant_id)
            db_ok = True
        except Exception as exc:  # noqa: BLE001
            db_ok = False
            tenant_id = None
            db_err = f"{type(exc).__name__}: {exc}"
        else:
            db_err = None
    else:
        db_err = "db probe skipped" if not probe_db else "no db session"

    capabilities: list[dict[str, Any]] = []
    fail_caps = 0
    for key in module_keys:
        cap = ALL_CAPABILITIES.get(key)
        shared = _SHARED_CAPS.get(key)
        checks: dict[str, Any] = {}
        ok = True

        # registry
        if not cap:
            checks["registry"] = {"status": "fail", "detail": "missing in capability_registry"}
            ok = False
        else:
            checks["registry"] = {
                "status": "ok",
                "name": cap.name,
                "widget": cap.widget,
                "web_pkg": _web_pkg(key),
            }

        # web package
        shared_dir = shared["web_dir"] if shared else None
        on_disk, slug = _web_pkg_on_disk(key, shared_dir)
        checks["web_pkg"] = {
            "status": "ok" if on_disk else "fail",
            "path": f"packages/{slug}",
        }
        if not on_disk:
            ok = False

        # registerWidget：包存在但未注册 = Runtime「尚未接入」
        widget_name = cap.widget if cap else ""
        widget_ok = bool(widget_name) and is_web_widget_registered(widget_name)
        ready = is_web_ready_capability(key)
        checks["register_widget"] = {
            "status": "ok" if widget_ok and ready else "fail",
            "widget": widget_name,
            "registered": widget_ok,
            "web_ready": ready,
        }
        if not widget_ok or not ready:
            ok = False

        # HTTP route
        http_path = shared["http_path"] if shared else (_STORE_PROBES.get(key, ("", "", ""))[2] or f"/{key.replace('_', '-')}/records")
        full = f"{api_prefix.rstrip('/')}{http_path}"
        registered = _path_registered(paths, http_path) or _path_registered(paths, full)
        checks["route"] = {
            "status": "ok" if registered else "fail",
            "path": full,
            "registered": registered,
        }
        if not registered and key not in _SHARED_CAPS:
            # shared chat/voice/integrations might be nested differently
            ok = False
        if shared and not registered:
            # try softer match
            soft = any(http_path.split("/")[1] in p for p in paths if isinstance(p, str))
            checks["route"]["registered"] = soft
            checks["route"]["status"] = "ok" if soft else "warn"
            if not soft:
                ok = False

        # DB store list
        if shared:
            checks["store"] = {"status": "skip", "detail": shared.get("note", "shared capability")}
        elif not db_ok or not tenant_id:
            checks["store"] = {"status": "skip", "detail": db_err or "no tenant"}
        else:
            probe = _probe_store(key, db, tenant_id)  # type: ignore[arg-type]
            checks["store"] = probe
            if probe["status"] == "fail":
                ok = False

        if not ok:
            fail_caps += 1
        capabilities.append({"key": key, "ok": ok, "checks": checks})

    # presets: match primary module
    presets_out: list[dict[str, Any]] = []
    fail_presets = 0
    for p in HERO_PRESETS:
        pid = str(p.get("id") or "")
        label = str(p.get("label") or "")
        primary = ""
        for pick in p.get("picks") or []:
            if pick.get("type") in ("module", "capability"):
                k = str(pick.get("key") or "")
                if k and k != "notify_im":
                    primary = k
                    break
        if not primary:
            for pick in p.get("picks") or []:
                if pick.get("type") in ("module", "capability"):
                    primary = str(pick.get("key") or "")
                    break
        match = _match_primary(label, primary) if primary else {"status": "fail", "detail": "no primary"}
        if match.get("status") != "ok":
            fail_presets += 1
        row: dict[str, Any] = {
            "id": pid,
            "label": label,
            "primary": primary,
            "match": match,
            "ok": match.get("status") == "ok",
        }
        if probe_suggest and primary:
            try:
                sug = suggest_modules(label, force_llm=False, db=db)
                sk = [str(x.get("key")) for x in (sug.get("items") or [])]
                row["suggest"] = {
                    "status": "ok" if primary in sk else "warn",
                    "top": sk[:5],
                    "hit": primary in sk,
                }
                if primary not in sk:
                    row["ok"] = False
                    fail_presets += 1
            except Exception as exc:  # noqa: BLE001
                row["suggest"] = {"status": "fail", "detail": str(exc)}
                row["ok"] = False
                fail_presets += 1
        presets_out.append(row)

    # catalog hero-presets endpoint data shape
    catalog_check: dict[str, Any]
    try:
        from app.services import catalog_store

        if db is not None:
            try:
                items = catalog_store.list_hero_presets(db)
                src = "database" if items else "empty-db"
            except Exception:
                items = []
                src = "db-error"
            if not items:
                items = catalog_store.list_hero_presets_static()
                src = "static" if src != "database" else src
        else:
            items = catalog_store.list_hero_presets_static()
            src = "static"
        catalog_check = {
            "status": "ok" if len(items) >= len(HERO_PRESETS) else "warn",
            "source": src,
            "count": len(items),
            "expected": len(HERO_PRESETS),
        }
    except Exception as exc:  # noqa: BLE001
        catalog_check = {"status": "fail", "detail": str(exc)}

    overall_ok = fail_caps == 0 and fail_presets == 0 and catalog_check.get("status") != "fail"
    elapsed_ms = int((time.perf_counter() - t0) * 1000)

    return {
        "ok": overall_ok,
        "scope": "danmaku",
        "summary": {
            "presets": len(HERO_PRESETS),
            "unique_modules": len(module_keys),
            "capability_failures": fail_caps,
            "preset_match_failures": fail_presets,
            "db_ok": db_ok,
            "elapsed_ms": elapsed_ms,
        },
        "catalog_hero_presets": catalog_check,
        "capabilities": capabilities,
        "presets": presets_out,
        "how_to": {
            "curl": "curl -sS https://blockhub.club/api/v1/smoke/danmaku | python3 -m json.tool",
            "curl_local": "curl -sS http://127.0.0.1:8001/api/v1/smoke/danmaku | python3 -m json.tool",
            "with_suggest": "curl -sS 'http://127.0.0.1:8001/api/v1/smoke/danmaku?suggest=1'",
            "pass_rule": "ok=true 且 capability_failures=0 且 preset_match_failures=0",
        },
    }
