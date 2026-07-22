#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""医疗行业：知识库 + 导诊 + 护理排班 真 API 冒烟。

  python scripts/smoke-med-kb-full.py https://blockhub.club
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://blockhub.club").rstrip("/")
API = f"{BASE}/api/v1"
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trackchat.local")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

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


def req(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 45):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8") or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw[:600]}
        return e.code, payload
    except Exception as e:
        return 0, {"error": str(e)}


def main() -> int:
    print(f"Smoke med @ {API}\n")
    c, health = req("GET", "/health")
    if c == 200:
        ok(f"health {health.get('status')}")
    else:
        bad(f"health {c} {health}")
        print(f"\npass={PASS} fail={FAIL}")
        return 1

    c, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if c != 200 or not login.get("access_token"):
        bad(f"login {c}")
        print(f"\npass={PASS} fail={FAIL}")
        return 1
    token = login["access_token"]
    ok("login")

    # —— KB ——
    c, pipe = req("GET", "/kb/pipeline", token)
    ok("kb/pipeline") if c == 200 and pipe.get("steps") else bad(f"kb/pipeline {c}")

    c, stats = req("GET", "/kb/stats", token)
    ok(f"kb/stats bases={stats.get('knowledge_bases')}") if c == 200 else bad(f"kb/stats {c}")

    c, bases = req("GET", "/kb/bases", token)
    items = bases.get("items") or [] if c == 200 else []
    if c == 200:
        ok(f"kb/bases count={len(items)}")
    else:
        bad(f"kb/bases {c} {bases}")

    med_bases = [b for b in items if str(b.get("name") or "").startswith("医疗·")]
    if len(med_bases) >= 2:
        ok(f"医疗专属库 {len(med_bases)} 个")
    else:
        # 尝试创建
        for name, desc in [
            ("医疗·诊疗指南与临床路径库", "示范"),
            ("医疗·药品说明与护理SOP库", "示范"),
        ]:
            if any(b.get("name") == name for b in items):
                continue
            req("POST", "/kb/bases", token, {"name": name, "description": desc})
        c, bases = req("GET", "/kb/bases", token)
        med_bases = [b for b in (bases.get("items") or []) if str(b.get("name") or "").startswith("医疗·")]
        if len(med_bases) >= 2:
            ok(f"已创建医疗库 → {len(med_bases)}")
        else:
            bad(f"医疗库不足: {len(med_bases)}")

    for b in med_bases[:2]:
        kid = b["id"]
        c, docs = req("GET", f"/kb/documents?kb_id={kid}", token)
        n = len(docs.get("items") or []) if c == 200 else -1
        if c == 200:
            ok(f"documents「{b.get('name')}」n={n}")
        else:
            bad(f"documents {c}")
        q = "手卫生" if "药品" in str(b.get("name") or "") or "护理" in str(b.get("name") or "") else "危急值"
        c, hits = req(
            "POST",
            "/kb/search",
            token,
            {"query": q, "kb_id": kid, "top_k": 5},
        )
        hn = len(hits.get("items") or []) if c == 200 else -1
        if c == 200 and hn > 0:
            ok(f"search「{q}」hits={hn} → {hits['items'][0].get('doc_name')}")
        elif c == 200:
            bad(f"search「{q}」空命中 kb={b.get('name')}")
        else:
            bad(f"search {c} {hits}")

    # —— med_triage ——
    suffix = uuid.uuid4().hex[:6]
    c, created = req(
        "POST",
        "/med-triage/records",
        token,
        {
            "patient_name": f"冒烟患者{suffix}",
            "symptoms": "发热咳嗽三天",
            "urgency": "normal",
            "note": "smoke",
        },
    )
    if c in (200, 201) and (created.get("success") or created.get("record")):
        ok("med_triage create")
        c2, lst = req("GET", "/med-triage/records", token)
        ok("med_triage list") if c2 == 200 else bad(f"med_triage list {c2}")
        c3, sug = req(
            "POST",
            "/med-triage/suggest-dept",
            token,
            {"symptoms": "右下腹痛伴恶心"},
        )
        if c3 == 200:
            ok(f"suggest-dept → {sug.get('department') or sug.get('dept') or sug.get('suggested_dept') or 'ok'}")
        else:
            bad(f"suggest-dept {c3} {sug}")
        rid = (created.get("record") or {}).get("id")
        if rid:
            c4, _ = req("POST", f"/med-triage/records/{rid}/guided", token, {})
            ok("med_triage guided") if c4 == 200 else bad(f"guided {c4}")
    else:
        bad(f"med_triage create {c} {created}")

    # —— nurse_shift ——
    c, ns = req(
        "POST",
        "/nurse-shift/records",
        token,
        {
            "nurse_name": f"护士{suffix}",
            "from_shift": "白班",
            "to_shift": "夜班",
            "reason": "冒烟调班",
            "shift_date": time.strftime("%Y-%m-%d"),
        },
    )
    if c in (200, 201) and (ns.get("success") or ns.get("record")):
        ok("nurse_shift create")
        rid = (ns.get("record") or {}).get("id")
        c2, _ = req("GET", "/nurse-shift/records", token)
        ok("nurse_shift list") if c2 == 200 else bad(f"nurse_shift list {c2}")
        if rid:
            c3, _ = req("POST", f"/nurse-shift/records/{rid}/approve", token, {})
            ok("nurse_shift approve") if c3 == 200 else bad(f"approve {c3}")
    else:
        bad(f"nurse_shift create {c} {ns}")

    print(f"\npass={PASS} fail={FAIL}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
