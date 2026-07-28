#!/usr/bin/env python3
"""Med industry full API + assembly smoke against a live server."""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://124.222.177.43").rstrip("/")
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
    print(f" Med industry full smoke · {BASE}")
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
        return 1

    print("\n=== 1) 医疗全选装配 ===")
    code, raw = req("GET", "/creation/industry/med/assembly", token)
    asm = (raw.get("assembly") if isinstance(raw, dict) else None) or {}
    if code != 200 or not asm:
        bad(f"assembly HTTP {code}")
    else:
        ok("GET /creation/industry/med/assembly")
        caps = list(asm.get("capability_keys") or [])
        scene_count = int(asm.get("scene_count") or 0)
        modules = asm.get("modules") or asm.get("menu_plan") or []
        names = [
            (m.get("scene_name") or m.get("name") or m.get("label") or "")
            for m in modules
            if isinstance(m, dict)
        ]
        print(f"    scene_count={scene_count} capability_keys={len(caps)}")
        (ok if scene_count >= 48 else bad)(f"默认场景数 {scene_count}（期望 ≥48）")
        for n in ("症状预问诊", "调班冲突检测", "不良事件"):
            (ok if any(n in x for x in names) else bad)(f"默认场景含「{n}」")
        for k in ("med_triage", "nurse_shift", "approval_flow", "kb_document"):
            (ok if k in caps else bad)(f"默认 capability_keys 含 {k}")

    print("\n=== 2) 发布医疗应用（真菜单挂 Widget）===")
    pub = {
        "name": f"医疗全选冒烟-{int(time.time())}",
        "industry_key": "med",
        "capability_keys": list(asm.get("capability_keys") or [
            "med_triage", "nurse_shift", "approval_flow", "kb_document", "notify_im",
        ]),
        "scenario_names": ["症状预问诊", "急诊分诊辅助", "调班冲突检测", "不良事件上报"],
        "web_template_id": "sidebar_admin",
        "entry_source": "industry_site",
        "assemble_full_scenes": True,
    }
    code, pub_res = req("POST", "/creation/publish", token, pub)
    app = (pub_res.get("app") if isinstance(pub_res, dict) else None) or {}
    app_id = str(app.get("id") or app.get("public_id") or "")
    menu = ((app.get("page_schema") or pub_res.get("page_schema") or {}).get("menu")) or []
    page_schema = app.get("page_schema") or pub_res.get("page_schema") or {}
    schema_blob = json.dumps(page_schema, ensure_ascii=False)
    keys = list(app.get("capability_keys") or [])
    if code == 200 and app_id:
        ok(f"publish app={app_id}")
        for k in ("med_triage", "nurse_shift"):
            (ok if k in keys else bad)(f"publish capability_keys 含 {k}")
        scene_labels = " ".join(
            str(m.get("label") or m.get("key") or "") for m in menu if isinstance(m, dict)
        )
        for scene, widget in (
            ("症状预问诊", "MedTriageWidget"),
            ("调班冲突检测", "NurseShiftWidget"),
        ):
            hit_scene = scene in scene_labels or scene in schema_blob
            hit_widget = widget in schema_blob
            (ok if hit_scene and hit_widget else bad)(
                f"场景「{scene}」→ {widget}（scene={hit_scene} widget={hit_widget}）"
            )
        # 场景锁定 props
        (ok if "default_category" in schema_blob else bad)("page_schema 含 default_category")
        (ok if "triage-intake" in schema_blob or "symptom-triage" in schema_blob or "nurse-shift-conflict" in schema_blob else bad)(
            "page_schema 含导诊/排班 default_category"
        )
    else:
        bad(f"publish HTTP {code} {str(pub_res)[:200]}")

    print("\n=== 3) 导诊 / 排班真 API 写读 ===")
    code, r = req(
        "POST",
        "/med-triage/records",
        token,
        {
            "patient_name": f"冒烟患者-{int(time.time()) % 10000}",
            "symptoms": "咳嗽发烧两天",
            "suggested_dept": "呼吸内科",
            "urgency": "normal",
            "note": "med smoke",
            "app_public_id": app_id,
        },
    )
    triage_id = ((r.get("record") or {}).get("id") if isinstance(r, dict) else "") or ""
    (ok if code == 200 and triage_id else bad)(f"POST med-triage ({code})")

    code, r = req("GET", f"/med-triage/records?app_id={app_id}" if app_id else "/med-triage/records", token)
    items = (r.get("items") if isinstance(r, dict) else None) or []
    (ok if code == 200 and any(i.get("id") == triage_id for i in items) else bad)(
        f"GET med-triage 含刚写入 ({code} n={len(items)})"
    )

    if triage_id:
        code, _ = req("POST", f"/med-triage/records/{triage_id}/guided", token, {})
        (ok if code == 200 else bad)(f"POST med-triage guided ({code})")

    code, r = req(
        "POST",
        "/med-triage/suggest-dept",
        token,
        {"symptoms": "胸痛呼吸困难"},
    )
    (ok if code == 200 and (r.get("suggested_dept") if isinstance(r, dict) else None) else bad)(
        f"POST suggest-dept ({code})"
    )

    code, r = req(
        "POST",
        "/nurse-shift/records",
        token,
        {
            "nurse_name": "冒烟护士",
            "shift_date": time.strftime("%Y-%m-%d"),
            "from_shift": "白班",
            "to_shift": "小夜",
            "reason": "med smoke",
            "app_public_id": app_id,
        },
    )
    shift_id = ((r.get("record") or {}).get("id") if isinstance(r, dict) else "") or ""
    (ok if code == 200 and shift_id else bad)(f"POST nurse-shift ({code})")

    code, r = req("GET", f"/nurse-shift/records?app_id={app_id}" if app_id else "/nurse-shift/records", token)
    items = (r.get("items") if isinstance(r, dict) else None) or []
    (ok if code == 200 and any(i.get("id") == shift_id for i in items) else bad)(
        f"GET nurse-shift 含刚写入 ({code} n={len(items)})"
    )

    if shift_id:
        code, _ = req("POST", f"/nurse-shift/records/{shift_id}/approve", token, {})
        (ok if code == 200 else bad)(f"POST nurse-shift approve ({code})")

    print("\n" + "=" * 50)
    print(f" RESULT  pass={PASS} fail={FAIL}")
    print("=" * 50)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
