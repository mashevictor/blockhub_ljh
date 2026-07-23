#!/usr/bin/env python3
"""冒烟：传媒等内容垂直行业 — 装配 / 菜单 Widget / vertical-ops（及酒店 hotel-ops）读写。

覆盖「剩下」垂直批次（默认 10 个）：
  hotel, energy, gov, legal, hr, marketing, construction, agriculture, media, auto

用法:
  python scripts/smoke-vertical-industries-menus.py [BASE_URL]
  python scripts/smoke-vertical-industries-menus.py http://127.0.0.1:8000 media
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

try:
    from app.services.hotel_ops_store import KINDS as HOTEL_KINDS  # noqa: E402
    from app.services.vertical_ops_store import KINDS as VERTICAL_KINDS  # noqa: E402
except Exception:  # pragma: no cover
    HOTEL_KINDS = frozenset()
    VERTICAL_KINDS = frozenset()

BASE = (
    sys.argv[1]
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-")
    else "http://101.32.209.251"
).rstrip("/")
API = f"{BASE}/api/v1"
EMAIL = "admin@trackchat.local"
PASSWORD = "admin123"

DEFAULT_INDUSTRIES = [
    "hotel",
    "energy",
    "gov",
    "legal",
    "hr",
    "marketing",
    "construction",
    "agriculture",
    "media",
    "auto",
]

# 非 vertical/hotel 的专用列表接口
DEDICATED_LIST_API: dict[str, str] = {
    "kb_document": "/kb/documents",
    "campaign_ops": "/campaign-ops/records",
    "notify_im": "/notifications",
    "chart_dashboard": "/reports/dashboard",
    "gov_service": "/gov-service/records",
    "legal_case": "/legal-case/records",
    "hotel_booking": "/hotel-booking/records",
    "inventory_count": "/inventory-count/records",
    "member_loyalty": "/member-loyalty/records",
    "ops_kpi": "/ops-kpi/records",
    "approval_flow": "/approvals",
    "site_patrol": "/site-patrol/records",
}

PASS = 0
FAIL = 0


def ok(msg: str) -> None:
    global PASS
    PASS += 1
    print(f"  [OK] {msg}")


def bad(msg: str) -> None:
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}")


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
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


def pick_industries() -> list[str]:
    if len(sys.argv) > 2 and sys.argv[2] and not sys.argv[2].startswith("http"):
        raw = sys.argv[2]
        if "," in raw:
            return [x.strip() for x in raw.split(",") if x.strip()]
        return [raw]
    return list(DEFAULT_INDUSTRIES)


def menu_api_for(cap: str) -> tuple[str, str, str] | None:
    """(list_path, create_path_or_empty, mode). mode: vertical|hotel|dedicated."""
    if not cap:
        return None
    if cap in VERTICAL_KINDS:
        p = f"/vertical-ops/{cap}/records"
        return (p, p, "vertical")
    if cap in HOTEL_KINDS:
        p = f"/hotel-ops/{cap}/records"
        return (p, p, "hotel")
    dedicated = DEDICATED_LIST_API.get(cap)
    if dedicated:
        return (dedicated, "", "dedicated")
    return None


def smoke_industry(token: str, industry: str) -> None:
    print(f"\n{'=' * 52}\n 行业 {industry}\n{'=' * 52}")

    code, raw = req("GET", f"/creation/industry/{industry}/assembly", token)
    asm = (raw.get("assembly") if isinstance(raw, dict) else None) or {}
    if code != 200 or not asm:
        bad(f"assembly HTTP {code} {str(raw)[:160]}")
        return
    caps = list(asm.get("capability_keys") or [])
    scene_count = int(asm.get("scene_count") or 0)
    ok(f"assembly scenes={scene_count} keys={len(caps)}")

    pub = {
        "name": f"{industry}-菜单冒烟-{int(time.time()) % 100000}",
        "industry_key": industry,
        "capability_keys": caps,
        "web_template_id": "sidebar_admin",
        "entry_source": "industry_site",
        "assemble_full_scenes": True,
    }
    code, pub_res = req("POST", "/creation/publish", token, pub)
    app = (pub_res.get("app") if isinstance(pub_res, dict) else None) or {}
    app_id = str(app.get("id") or app.get("public_id") or "")
    page_schema = app.get("page_schema") or pub_res.get("page_schema") or {}
    menu = page_schema.get("menu") or []
    children = ((page_schema.get("root") or {}).get("children")) or []
    if not (code == 200 and app_id and menu):
        bad(f"publish HTTP {code} {str(pub_res)[:220]}")
        return
    ok(f"publish app={app_id} menu={len(menu)} children={len(children)}")

    has_any_web_pkg = any(
        isinstance(c, dict) and (c.get("props") or {}).get("web_pkg") for c in children
    )
    orphan = 0
    missing_widget = 0
    missing_web_pkg = 0
    for m in menu:
        if not isinstance(m, dict):
            continue
        label = m.get("label") or m.get("key")
        route = m.get("route")
        cap = str(m.get("capability_key") or "")
        child = next(
            (
                c
                for c in children
                if isinstance(c, dict)
                and (
                    (c.get("props") or {}).get("route") == route
                    or c.get("id") == m.get("key")
                )
            ),
            None,
        )
        if not child:
            orphan += 1
            bad(f"菜单无节点「{label}」 route={route}")
            continue
        props = child.get("props") or {}
        widget = props.get("widget")
        web_pkg = props.get("web_pkg") or ""
        if not widget:
            missing_widget += 1
            bad(f"菜单无 widget「{label}」 cap={cap}")
        if has_any_web_pkg and cap in VERTICAL_KINDS:
            if "vertical-ops" not in str(web_pkg):
                missing_web_pkg += 1
                bad(f"vertical 菜单缺 web_pkg「{label}」cap={cap} pkg={web_pkg!r}")
    if orphan == 0 and missing_widget == 0:
        ok(f"全部 {len(menu)} 个菜单有节点+widget")
    if has_any_web_pkg and missing_web_pkg == 0:
        ok("vertical 菜单 web_pkg=vertical-ops")
    elif not has_any_web_pkg:
        print("  · 提示: 服务端 schema 尚无 web_pkg 字段（部署后才会写入）")

    seen_caps: set[str] = set()
    api_ok = 0
    api_fail = 0
    skipped = 0
    for m in menu:
        if not isinstance(m, dict):
            continue
        cap = str(m.get("capability_key") or "").strip()
        if not cap or cap in seen_caps:
            continue
        seen_caps.add(cap)
        mapped = menu_api_for(cap)
        if not mapped:
            skipped += 1
            print(f"  · skip API（无映射） {cap}")
            continue
        list_path, create_path, mode = mapped
        q = f"?app_id={app_id}" if "records" in list_path else ""
        code, payload = req("GET", f"{list_path}{q}", token)
        if code == 200:
            api_ok += 1
            ok(f"GET {list_path} ({cap})")
        else:
            api_fail += 1
            bad(f"GET {list_path} → {code} ({cap}) {str(payload)[:120]}")

        if create_path and mode in ("vertical", "hotel"):
            body = {
                "title": f"smoke-{industry}-{cap}-{int(time.time()) % 10000}",
                "field_a": "冒烟",
                "note": "menu smoke",
                "app_public_id": app_id,
                "industry_key": industry,
            }
            code, payload = req("POST", create_path, token, body)
            rid = ((payload.get("record") or {}).get("id") if isinstance(payload, dict) else "") or ""
            if code == 200 and rid:
                api_ok += 1
                ok(f"POST {create_path}")
            else:
                api_fail += 1
                bad(f"POST {create_path} → {code} {str(payload)[:140]}")

    print(
        f"  · {industry} API 汇总 ok={api_ok} fail={api_fail} "
        f"unique_caps={len(seen_caps)} skipped={skipped}"
    )


def main() -> int:
    industries = pick_industries()
    print("=" * 52)
    print(f" Vertical industries menu smoke · {BASE}")
    print(f" industries={','.join(industries)}")
    print(f" vertical_kinds={len(VERTICAL_KINDS)} hotel_kinds={len(HOTEL_KINDS)}")
    print("=" * 52)

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

    for ind in industries:
        smoke_industry(token, ind)

    print("\n" + "=" * 52)
    print(f" DONE  pass={PASS} fail={FAIL}")
    print("=" * 52)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
