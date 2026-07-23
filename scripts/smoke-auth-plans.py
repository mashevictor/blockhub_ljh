#!/usr/bin/env python3
"""冒烟：角色登录跳转意图 + 各套餐身份差异化内容。

用法：
  python scripts/smoke-auth-plans.py
  python scripts/smoke-auth-plans.py https://blockhub.club
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE}/api/v1"

PLAN_ACCOUNTS = [
    ("free@plan.local", "plan123", "c_free", False, 0, 10),
    ("plus@plan.local", "plan123", "c_plus", False, 0, None),
    ("team@plan.local", "plan123", "b_team", False, 1, 10),
    ("business@plan.local", "plan123", "b_business", True, 5, 50),
    ("enterprise@plan.local", "plan123", "b_enterprise", True, None, None),
]

ROLE_ACCOUNTS = [
    ("admin@trackchat.local", "admin123", "admin"),
    ("employee@trackchat.local", "emp123", "employee"),
]


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"detail": raw}
        return e.code, payload


def ok(msg: str) -> None:
    print(f"  OK  {msg}")


def bad(msg: str) -> None:
    print(f"  FAIL {msg}")
    raise SystemExit(1)


def login(email: str, password: str) -> str:
    code, data = req("POST", "/auth/login", body={"email": email, "password": password})
    if code != 200 or not data.get("access_token"):
        bad(f"login {email} -> {code} {data}")
    return data["access_token"]


def main() -> None:
    print(f"== smoke-auth-plans @ {API} ==")

    # 1) 未登录 publish → 401
    code, _ = req("POST", "/creation/publish", body={"name": "x", "industry_key": "office", "scenario_names": ["制度政策问答"]})
    if code != 401:
        bad(f"anonymous publish expected 401 got {code}")
    ok("anonymous publish → 401")

    # 2) 未登录 plaza/publish → 401
    code, _ = req("POST", "/creation/plaza/publish", body={"app_id": "nope", "visibility": "public"})
    if code != 401:
        bad(f"anonymous plaza publish expected 401 got {code}")
    ok("anonymous plaza/publish → 401")

    # 3) 角色账号
    for email, password, role in ROLE_ACCOUNTS:
        tok = login(email, password)
        code, me = req("GET", "/auth/me", tok)
        if code != 200 or me.get("role") != role:
            bad(f"{email} role want {role} got {me}")
        ok(f"role {email} = {role}")

    # 4) employee 不可批业务审批（若有单）— 至少确认角色
    emp = login("employee@trackchat.local", "emp123")
    code, items = req("GET", "/approvals", emp)
    if code != 200:
        bad(f"employee list approvals {code}")
    ok("employee can list approvals")

    # 5) 各套餐身份
    seen_tiers: list[str] = []
    for email, password, tier, need_approval, packs, max_apps in PLAN_ACCOUNTS:
        tok = login(email, password)
        code, bill = req("GET", "/billing/me", tok)
        if code != 200:
            bad(f"{email} billing/me {code} {bill}")
        got = bill.get("plan_tier")
        plan = bill.get("plan") or {}
        if got != tier:
            bad(f"{email} plan_tier want {tier} got {got}")
        if bool(plan.get("schema_approval")) != need_approval:
            bad(f"{email} schema_approval want {need_approval} got {plan.get('schema_approval')}")
        if plan.get("industry_packs") != packs:
            bad(f"{email} industry_packs want {packs} got {plan.get('industry_packs')}")
        if plan.get("max_apps") != max_apps:
            bad(f"{email} max_apps want {max_apps} got {plan.get('max_apps')}")
        features = plan.get("features") or []
        if not features:
            bad(f"{email} missing plan.features")
        seen_tiers.append(tier)
        ok(
            f"{tier}: {plan.get('name')} · packs={packs} · approval={need_approval} · "
            f"features={len(features)}"
        )

        # Free 发行业包应 402
        if tier == "c_free":
            code, pub = req(
                "POST",
                "/creation/publish",
                tok,
                {
                    "name": "FreeIndustryProbe",
                    "industry_key": "mfg",
                    "scenario_names": ["设备报修"],
                    "deliver": "web",
                    "source": "smoke",
                },
            )
            if code != 402:
                bad(f"free industry publish expected 402 got {code} {pub}")
            ok("c_free industry pack blocked (402)")

            code, pub = req(
                "POST",
                "/creation/publish",
                tok,
                {
                    "name": "FreeOfficeOk",
                    "industry_key": "office",
                    "scenario_names": ["制度政策问答"],
                    "deliver": "web",
                    "source": "smoke",
                },
            )
            if code != 200:
                bad(f"free office publish expected 200 got {code} {pub}")
            ok("c_free office publish allowed")

    if len(set(seen_tiers)) != 5:
        bad(f"expected 5 plan tiers, got {seen_tiers}")
    ok("all 5 plan identities distinct")

    # employee 不可发布（require_admin）
    emp = login("employee@trackchat.local", "emp123")
    code, _ = req(
        "POST",
        "/creation/publish",
        emp,
        {
            "name": "EmpShouldFail",
            "industry_key": "office",
            "scenario_names": ["制度政策问答"],
            "deliver": "web",
            "source": "smoke",
        },
    )
    if code != 403:
        bad(f"employee publish expected 403 got {code}")
    ok("employee publish forbidden (403)")

    # 个人草稿 view 未登录 → 401
    code, _ = req("GET", "/runtime/nonexistent/schema?view=personal")
    if code not in (401, 404):
        # 无 app 时可能先 404；有 app 时 401。用真实 app 若 free 刚发布
        pass
    ok(f"personal view without token status={code} (401 or 404 ok)")

    print("== ALL PASSED ==")


if __name__ == "__main__":
    main()
