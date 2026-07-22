#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清理租户内冒烟/垃圾知识库（需管理员）。

  python scripts/purge_smoke_kbs.py https://blockhub.club
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://blockhub.club").rstrip("/")
API = f"{BASE}/api/v1"
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trackchat.local")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(API + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:500]}


def main() -> int:
    c, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if c != 200:
        print("login fail", c, login)
        return 1
    token = login["access_token"]

    c, before = req("GET", "/kb/bases", token)
    print("before", len(before.get("items") or []))
    for b in before.get("items") or []:
        print(" ", b.get("name"), b.get("id"))

    c, purged = req(
        "POST",
        "/kb/bases/purge-junk",
        token,
        {"names": ["冒烟知识库"], "name_contains": "冒烟", "description_contains": "smoke test"},
    )
    if c == 404:
        # 旧 API：逐个 DELETE（若已上线 DELETE）
        print("purge-junk 未上线，尝试逐个 DELETE…")
        removed = 0
        for b in before.get("items") or []:
            name = str(b.get("name") or "")
            desc = str(b.get("description") or "")
            if "冒烟" in name or "smoke test" in desc:
                dc, _ = req("DELETE", f"/kb/bases/{b['id']}", token)
                if dc == 200:
                    removed += 1
                    print("  deleted", name, b["id"])
                else:
                    print("  fail", dc, name)
        print("removed", removed)
    elif c != 200:
        print("purge fail", c, purged)
        return 1
    else:
        print("purged", purged.get("removed"), "items")
        for it in purged.get("items") or []:
            print(" -", it.get("name"), it.get("id"))

    c, after = req("GET", "/kb/bases", token)
    print("after", len(after.get("items") or []))
    for b in after.get("items") or []:
        print(" ", b.get("name"), "docs=", b.get("doc_count") or b.get("document_count"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
