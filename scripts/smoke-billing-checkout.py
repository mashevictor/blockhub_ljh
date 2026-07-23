#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""官网升级套餐 / 权限 / 聚合收款冒烟。

  python scripts/smoke-billing-checkout.py
  python scripts/smoke-billing-checkout.py https://blockhub.club
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.plan_catalog import calc_checkout_amount_fen  # noqa: E402
from app.services.aggpay.yeepay import sign_params, verify_params_sign  # noqa: E402

BASE = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
API = f"{BASE}/api/v1" if BASE else ""
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trackchat.local")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
EMP_EMAIL = os.environ.get("EMP_EMAIL", "employee@trackchat.local")
EMP_PASSWORD = os.environ.get("EMP_PASSWORD", "emp123")


def ok(msg: str) -> None:
    print(f"  OK  {msg}")


def bad(msg: str) -> None:
    print(f"  BAD {msg}")


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:500]}


def smoke_local() -> int:
    print("== local ==")
    fails = 0
    fen, seats = calc_checkout_amount_fen("c_plus", 1)
    if fen != 3900 or seats != 1:
        bad(f"c_plus amount {fen}/{seats}")
        fails += 1
    else:
        ok("c_plus amount 3900")
    fen, seats = calc_checkout_amount_fen("b_business", 1)
    if seats != 1 or fen != 14800:
        bad(f"b_business amount {fen}/{seats}")
        fails += 1
    else:
        ok("b_business amount 14800")
    fen, seats = calc_checkout_amount_fen("c_plus", 5)
    if seats != 3 or fen != 3900 * 3:
        bad(f"c_plus max seats {fen}/{seats}")
        fails += 1
    else:
        ok("c_plus max seats 3")
    try:
        calc_checkout_amount_fen("b_team", 5)
        bad("b_team should reject checkout")
        fails += 1
    except ValueError:
        ok("b_team checkout rejected")
    params = {"orderId": "o1", "orderAmount": "39.00", "status": "SUCCESS"}
    sig = sign_params(params, "test-key")
    params2 = {**params, "sign": sig}
    if not verify_params_sign(params2, "test-key"):
        bad("sign verify")
        fails += 1
    else:
        ok("HMAC sign verify")
    if verify_params_sign(params2, "wrong"):
        bad("sign should fail with wrong key")
        fails += 1
    else:
        ok("sign reject wrong key")
    return fails


def smoke_api() -> int:
    print(f"\n== API {API} ==")
    fails = 0
    code, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if code != 200 or not login.get("access_token"):
        bad(f"admin login {code}")
        return 1
    admin_tok = login["access_token"]
    ok("admin login")

    code, me = req("GET", "/billing/me", admin_tok)
    if code != 200 or "remaining" not in me:
        bad(f"billing/me {code} {me}")
        fails += 1
    else:
        ok(f"billing/me plan={me.get('plan_tier')} remaining keys={list((me.get('remaining') or {}).keys())}")

    code, orders = req("GET", "/billing/orders", admin_tok)
    if code != 200:
        bad(f"orders list {code}")
        fails += 1
    else:
        ok(f"orders list n={len(orders.get('items') or [])}")

    code, checkout = req(
        "POST",
        "/billing/checkout",
        admin_tok,
        {"plan_tier": "c_plus", "seats": 1, "months": 1},
    )
    if code == 503:
        ok("checkout 503 without Yeepay keys (expected if unset)")
    elif code in (200, 201) and (checkout.get("order") or {}).get("pay_url"):
        ok(f"checkout OK order={(checkout.get('order') or {}).get('id')}")
    else:
        bad(f"checkout unexpected {code} {checkout}")
        fails += 1

    code, emp_login = req("POST", "/auth/login", body={"email": EMP_EMAIL, "password": EMP_PASSWORD})
    if code == 200 and emp_login.get("access_token"):
        emp_tok = emp_login["access_token"]
        code, denied = req(
            "POST",
            "/billing/checkout",
            emp_tok,
            {"plan_tier": "c_plus", "seats": 1},
        )
        if code == 403:
            ok("employee checkout forbidden")
        else:
            bad(f"employee checkout should 403, got {code} {denied}")
            fails += 1
    else:
        bad(f"employee login {code}")
        fails += 1

    # 验签回调：伪造错误签名应 400
    code, wh = req("POST", "/billing/webhook/yeepay", body={"orderId": "x", "status": "SUCCESS", "sign": "bad"})
    if code in (400, 503):
        ok(f"webhook reject bad sign HTTP {code}")
    else:
        bad(f"webhook should reject, got {code} {wh}")
        fails += 1

    return fails


def main() -> int:
    fails = smoke_local()
    if BASE:
        fails += smoke_api()
    print(json.dumps({"fails": fails}, ensure_ascii=False))
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
