#!/usr/bin/env python3
"""Sales industry full API + assembly smoke against a live server."""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://101.32.209.251").rstrip("/")
API = f"{BASE}/api/v1"
EMAIL = "admin@trackchat.local"
PASSWORD = "admin123"

PASS = 0
FAIL = 0


def ok(msg: str) -> None:
    global PASS
    PASS += 1
    print(f"  ✓ {msg}")


def bad(msg: str) -> None:
    global FAIL
    FAIL += 1
    print(f"  ✗ {msg}")


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"detail": raw[:400]}
        return e.code, payload
    except Exception as e:
        return 0, {"detail": str(e)}


def main() -> int:
    print("=" * 50)
    print(f" Sales industry full smoke · {BASE}")
    print("=" * 50)

    code, health = req("GET", "/health")
    if code == 200 and health.get("status"):
        ok(f"health {health.get('status')}")
    else:
        bad(f"health HTTP {code} {health}")
        return 1

    code, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    token = (login or {}).get("access_token") or ""
    if not token:
        req("POST", "/auth/demo-bootstrap", body={})
        code, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
        token = (login or {}).get("access_token") or ""
    if token:
        ok("admin login")
    else:
        bad(f"admin login HTTP {code}")
        print("hint: bash scripts/repair-auth.sh")
        return 1

    print("\n=== 1) 默认全选装配（含突破能力）===")
    code, raw = req("GET", "/creation/industry/sales/assembly", token)
    asm = (raw.get("assembly") if isinstance(raw, dict) else None) or {}
    if code != 200 or not asm:
        bad(f"assembly HTTP {code}")
    else:
        ok("GET /creation/industry/sales/assembly")
        caps = list(asm.get("capability_keys") or [])
        scene_count = int(asm.get("scene_count") or 0)
        modules = asm.get("modules") or asm.get("menu_plan") or []
        names = [
            (m.get("scene_name") or m.get("name") or m.get("label") or "")
            for m in modules
            if isinstance(m, dict)
        ]
        print(f"    scene_count={scene_count} capability_keys={len(caps)}")
        (ok if scene_count >= 64 else bad)(f"默认场景数 {scene_count}（期望 ≥64 全选）")
        for n in ("赢单复盘", "丢单原因"):
            (ok if n in names else bad)(f"默认场景含「{n}」")
        for k in ("sales_lead", "deal_evidence", "kill_pipeline", "quote_contract", "chart_funnel"):
            (ok if k in caps else bad)(f"默认 capability_keys 含 {k}")

    code, packs = req("GET", "/catalog/summary", token)
    (ok if code == 200 and packs.get("source") == "database" else bad)(
        f"catalog/summary source={packs.get('source')} total={packs.get('total')}"
    )

    print("\n=== 2) 发布（默认关键场景 → 菜单含成交证据/杀单）===")
    pub = {
        "name": f"销售全选冒烟-{int(time.time())}",
        "industry_key": "sales",
        "capability_keys": list(asm.get("capability_keys") or [
            "sales_lead", "deal_evidence", "kill_pipeline", "quote_contract", "chart_funnel",
            "ops_kpi", "chat_qa", "notify_im",
        ]),
        "scenario_names": ["赢单复盘", "丢单原因", "线索录入", "商机阶段"],
        "web_template_id": "sidebar_admin",
        "entry_source": "industry_site",
        "assemble_full_scenes": True,
    }
    code, pub_res = req("POST", "/creation/publish", token, pub)
    app = (pub_res.get("app") if isinstance(pub_res, dict) else None) or {}
    app_id = str(app.get("id") or app.get("public_id") or "")
    menu = ((app.get("page_schema") or pub_res.get("page_schema") or {}).get("menu")) or []
    menu_blob = json.dumps(menu, ensure_ascii=False)
    keys = list(app.get("capability_keys") or [])
    if code == 200 and app_id:
        ok(f"publish app={app_id}")
        for k in ("deal_evidence", "kill_pipeline", "sales_lead"):
            (ok if k in keys else bad)(f"publish capability_keys 含 {k}")
        for route in ("/deal-evidence", "/kill-pipeline", "/sales-lead"):
            (ok if route in menu_blob else bad)(f"publish menu 含 {route}")
    else:
        bad(f"publish HTTP {code} {str(pub_res)[:200]}")

    print("\n=== 3) 核心业务 API（线索门禁 + 证据 + 杀单）===")
    cust = f"全量冒烟-{int(time.time())}"

    # 默认录入走待领取池；同时测 private 路径
    code, r = req(
        "POST",
        "/sales-lead/records",
        token,
        {"customer": cust, "amount": "8万", "note": "full", "category": "lead-capture"},
    )
    lead_id = ((r.get("record") or {}).get("id") if isinstance(r, dict) else "") or ""
    (ok if code == 200 and lead_id else bad)(f"POST sales-lead 待领取池 ({code})")

    code, r = req(
        "POST",
        "/sales-lead/records",
        token,
        {
            "customer": cust + "-私",
            "amount": "2",
            "category": "opportunity",
            "pool_status": "private",
            "owner": "系统管理员",
        },
    )
    lead_priv = ((r.get("record") or {}).get("id") if isinstance(r, dict) else "") or ""
    (ok if code == 200 and lead_priv else bad)(f"POST sales-lead 私海 ({code})")

    for path in ("/sales-lead/records", "/sales-lead/funnel", "/sales-lead/stale"):
        code, _ = req("GET", path, token)
        (ok if code == 200 else bad)(f"GET {path} ({code})")

    target = lead_priv or lead_id
    if target:
        code, _ = req("POST", f"/sales-lead/records/{target}/following", token, {})
        (ok if code == 400 else bad)(f"无证据晋级 following → {code} (want 400)")

    code, r = req(
        "POST",
        "/deal-evidence/records",
        token,
        {
            "customer": (cust + "-私") if lead_priv else cust,
            "evidence_type": "meeting_notes",
            "summary": "全量冒烟纪要",
            "target_stage": "following",
            "lead_id": target,
        },
    )
    (ok if code == 200 else bad)(f"POST deal-evidence ({code})")
    code, _ = req("GET", "/deal-evidence/records", token)
    (ok if code == 200 else bad)(f"GET deal-evidence/records ({code})")

    if target:
        code, r = req("POST", f"/sales-lead/records/{target}/following", token, {})
        st = ((r.get("record") or {}).get("status") if isinstance(r, dict) else "")
        (ok if code == 200 and st == "following" else bad)(f"有证据晋级 following → {code}/{st}")

        code, _ = req("POST", f"/sales-lead/records/{target}/won", token, {})
        (ok if code == 400 else bad)(f"无成交证据晋级 won → {code} (want 400)")

        code, _ = req(
            "POST",
            "/deal-evidence/records",
            token,
            {
                "customer": (cust + "-私") if lead_priv else cust,
                "evidence_type": "poc_result",
                "summary": "POC 通过",
                "target_stage": "won",
                "lead_id": target,
            },
        )
        (ok if code == 200 else bad)(f"POST deal-evidence poc ({code})")
        code, r = req("POST", f"/sales-lead/records/{target}/won", token, {})
        st = ((r.get("record") or {}).get("status") if isinstance(r, dict) else "")
        (ok if code == 200 and st == "won" else bad)(f"有证据晋级 won → {code}/{st}")

    cust_k = cust + "-kill"
    code, r = req(
        "POST",
        "/sales-lead/records",
        token,
        {"customer": cust_k, "amount": "1", "category": "opportunity", "pool_status": "private", "owner": "系统管理员"},
    )
    lead_k = ((r.get("record") or {}).get("id") if isinstance(r, dict) else "") or ""
    code, _ = req(
        "POST",
        "/kill-pipeline/records",
        token,
        {"customer": cust_k, "kill_reason": "fake_pipeline", "learning": "全量冒烟杀单", "lead_id": lead_k},
    )
    (ok if code == 200 else bad)(f"POST kill-pipeline ({code})")
    code, r = req("GET", "/kill-pipeline/records", token)
    (ok if code == 200 else bad)(f"GET kill-pipeline/records ({code})")
    code, r = req("GET", "/kill-pipeline/reasons", token)
    items = (r.get("items") if isinstance(r, dict) else None) or []
    has_fake = any(isinstance(i, dict) and i.get("reason") == "fake_pipeline" for i in items)
    (ok if code == 200 and has_fake else bad)(f"GET kill-pipeline/reasons 含假管线 ({code})")
    if lead_k:
        code, r = req("GET", "/sales-lead/records", token)
        row = next((x for x in (r.get("items") or []) if x.get("id") == lead_k), None)
        (ok if (row or {}).get("status") == "lost" else bad)(
            f"杀单后线索 status={(row or {}).get('status')} (want lost)"
        )

    print("\n=== 4) 销售包其它正式能力 API ===")
    checks = [
        ("GET", "/quote-contract/records", None),
        ("POST", "/quote-contract/records", {"title": "冒烟报价", "customer": cust, "amount": "1", "category": "quote"}),
        ("GET", "/ops-kpi/records", None),
        ("POST", "/ops-kpi/records", {"title": "冒烟KPI", "metric": "win_rate", "value": "30%", "category": "kpi"}),
        ("GET", "/expense-claim/records", None),
        ("POST", "/expense-claim/records", {"title": "客户招待", "amount": "200", "category": "entertainment"}),
        ("GET", "/site-patrol/records", None),
        ("POST", "/site-patrol/records", {"site_name": "客户现场", "checkpoint": "大门", "result": "ok"}),
        ("GET", "/campaign-ops/records", None),
        ("POST", "/campaign-ops/records", {"title": "冒烟活动", "channel": "wecom", "category": "campaign"}),
        ("POST", "/reports/nl-query", {"question": "本月线索数", "app_public_id": app_id or ""}),
    ]
    for method, path, body in checks:
        code, r = req(method, path, token, body)
        (ok if code == 200 else bad)(f"{method} {path} → {code}")

    if app_id:
        print("\n=== 5) Runtime schema ===")
        code, sch = req("GET", f"/runtime/{app_id}/schema", token)
        if code != 200:
            code, sch = req("GET", f"/runtime/{app_id}/schema", None)
        blob = json.dumps(sch, ensure_ascii=False)
        if code == 200:
            ok("GET runtime schema")
            for k in ("deal_evidence", "kill_pipeline", "DealEvidenceWidget", "KillPipelineWidget"):
                (ok if k in blob else bad)(f"schema 含 {k}")
        else:
            bad(f"runtime schema → {code}")

    print("\n" + "=" * 50)
    print(f" Result: pass={PASS} fail={FAIL}")
    print("=" * 50)
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
