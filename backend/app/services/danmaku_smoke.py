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
    "finance_news": ("app.services.finance_news_store", "list_items", "/finance-news/items"),
    "waybill_track": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/waybill_track/records"),
    "warehouse_inbound": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/warehouse_inbound/records"),
    "warehouse_outbound": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/warehouse_outbound/records"),
    "fleet_dispatch": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/fleet_dispatch/records"),
    "pod_signoff": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/pod_signoff/records"),
    "logistics_exception": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/logistics_exception/records"),
    "freight_settle": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/freight_settle/records"),
    "cold_chain_alert": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/cold_chain_alert/records"),
    "dock_queue": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/dock_queue/records"),
    "route_task": ("app.services.logistics_ops_store", "list_records", "/logistics-ops/route_task/records"),
    "listing_publish": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/listing_publish/records"),
    "rent_collection": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/rent_collection/records"),
    "lease_renewal": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/lease_renewal/records"),
    "owner_complaint": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/owner_complaint/records"),
    "deco_acceptance": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/deco_acceptance/records"),
    "sales_followup": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/sales_followup/records"),
    "re_contract": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/re_contract/records"),
    "viewing_feedback": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/viewing_feedback/records"),
    "property_fee": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/property_fee/records"),
    "broker_commission": ("app.services.realestate_ops_store", "list_records", "/realestate-ops/broker_commission/records"),
    "stock_alert": ("app.services.retail_ops_store", "list_records", "/retail-ops/stock_alert/records"),
    "retail_order": ("app.services.retail_ops_store", "list_records", "/retail-ops/retail_order/records"),
    "return_exchange": ("app.services.retail_ops_store", "list_records", "/retail-ops/return_exchange/records"),
    "supplier_recon": ("app.services.retail_ops_store", "list_records", "/retail-ops/supplier_recon/records"),
    "price_change": ("app.services.retail_ops_store", "list_records", "/retail-ops/price_change/records"),
    "display_check": ("app.services.retail_ops_store", "list_records", "/retail-ops/display_check/records"),
    "shelf_replenish": ("app.services.retail_ops_store", "list_records", "/retail-ops/shelf_replenish/records"),
    "pos_exception": ("app.services.retail_ops_store", "list_records", "/retail-ops/pos_exception/records"),
    "store_transfer": ("app.services.retail_ops_store", "list_records", "/retail-ops/store_transfer/records"),
    "loss_shrinkage": ("app.services.retail_ops_store", "list_records", "/retail-ops/loss_shrinkage/records"),
    "omni_pickup": ("app.services.retail_ops_store", "list_records", "/retail-ops/omni_pickup/records"),
    "promo_coupon": ("app.services.retail_ops_store", "list_records", "/retail-ops/promo_coupon/records"),
    "gift_card": ("app.services.retail_ops_store", "list_records", "/retail-ops/gift_card/records"),
    "competitor_price": ("app.services.retail_ops_store", "list_records", "/retail-ops/competitor_price/records"),
    "new_sku_launch": ("app.services.retail_ops_store", "list_records", "/retail-ops/new_sku_launch/records"),
    "vip_hold": ("app.services.retail_ops_store", "list_records", "/retail-ops/vip_hold/records"),
    "receipt_audit": ("app.services.retail_ops_store", "list_records", "/retail-ops/receipt_audit/records"),
    "online_refund": ("app.services.retail_ops_store", "list_records", "/retail-ops/online_refund/records"),
    "guest_complaint": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/guest_complaint/records"),
    "food_purchase": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/food_purchase/records"),
    "hygiene_check": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/hygiene_check/records"),
    "room_service": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/room_service/records"),
    "banquet_order": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/banquet_order/records"),
    "hotel_revenue": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/hotel_revenue/records"),
    "fnb_order": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/fnb_order/records"),
    "lost_found": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/lost_found/records"),
    "room_status": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/room_status/records"),
    "hk_task": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/hk_task/records"),
    "minibar_charge": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/minibar_charge/records"),
    "concierge_req": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/concierge_req/records"),
    "group_checkin": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/group_checkin/records"),
    "night_audit": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/night_audit/records"),
    "table_reserve": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/table_reserve/records"),
    "menu_86": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/menu_86/records"),
    "kitchen_waste": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/kitchen_waste/records"),
    "allergen_note": ("app.services.hotel_ops_store", "list_records", "/hotel-ops/allergen_note/records"),
    "school_notice": ("app.services.school_notice_store", "list_records", "/school-notice/records"),
    "homework_qa": ("app.services.homework_qa_store", "list_records", "/homework-qa/records"),
    "class_schedule": ("app.services.class_schedule_store", "list_records", "/class-schedule/records"),
    "campaign_ops": ("app.services.campaign_ops_store", "list_records", "/campaign-ops/records"),
    "it_ticket": ("app.services.it_ticket_store", "list_tickets", "/it-ticket/tickets"),
    "asset_manage": ("app.services.asset_manage_store", "list_records", "/asset-manage/records"),
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
    # vertical_ops（edu/energy/gov/legal/hr/...）
    "edu_grade_alert": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_grade_alert/records"),
    "edu_tuition": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_tuition/records"),
    "edu_attendance": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_attendance/records"),
    "edu_quiz": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_quiz/records"),
    "edu_textbook": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_textbook/records"),
    "energy_defect": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_defect/records"),
    "energy_ticket": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_ticket/records"),
    "energy_spare": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_spare/records"),
    "energy_emissions": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_emissions/records"),
    "energy_outage": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_outage/records"),
    "gov_appeal": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_appeal/records"),
    "gov_grid": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_grid/records"),
    "gov_license": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_license/records"),
    "gov_hotline": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_hotline/records"),
    "legal_filing": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_filing/records"),
    "legal_evidence": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_evidence/records"),
    "legal_hearing": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_hearing/records"),
    "legal_contract_ops": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_contract_ops/records"),
    "hr_perf": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_perf/records"),
    "hr_training": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_training/records"),
    "hr_headcount": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_headcount/records"),
    "hr_payroll": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_payroll/records"),
    "const_safety": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/const_safety/records"),
    "const_accept": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/const_accept/records"),
    "const_progress": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/const_progress/records"),
    "agro_patrol": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/agro_patrol/records"),
    "agro_subsidy": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/agro_subsidy/records"),
    "agro_inventory": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/agro_inventory/records"),
    "media_review": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/media_review/records"),
    "media_calendar": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/media_calendar/records"),
    "auto_service": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/auto_service/records"),
    "auto_fleet": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/auto_fleet/records"),
    "mkt_lead": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_lead/records"),
    "mkt_content": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_content/records"),
    "mkt_coupon": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_coupon/records"),
    "mkt_sign": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_sign/records"),
    "mkt_roi": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_roi/records"),
    "mkt_ab_test": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_ab_test/records"),
    "auto_charge": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/auto_charge/records"),
    "auto_claim": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/auto_claim/records"),
    "auto_parts": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/auto_parts/records"),
    "media_live": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/media_live/records"),
    "media_asset": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/media_asset/records"),
    "media_topic": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/media_topic/records"),
    "agro_trace": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/agro_trace/records"),
    "agro_pest": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/agro_pest/records"),
    "const_labor": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/const_labor/records"),
    "const_visa": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/const_visa/records"),
    "hr_idp": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_idp/records"),
    "hr_offer": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/hr_offer/records"),
    "legal_preserve": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_preserve/records"),
    "legal_enforce": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/legal_enforce/records"),
    "gov_public": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_public/records"),
    "gov_supervise": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/gov_supervise/records"),
    "energy_restore": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_restore/records"),
    "energy_hotwork": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/energy_hotwork/records"),
    "edu_transfer": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_transfer/records"),
    "edu_makeup": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/edu_makeup/records"),
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
        if mod_name.endswith("finance_ops_store") or mod_name.endswith("logistics_ops_store") or mod_name.endswith("realestate_ops_store") or mod_name.endswith("retail_ops_store") or mod_name.endswith("hotel_ops_store") or mod_name.endswith("vertical_ops_store"):
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
