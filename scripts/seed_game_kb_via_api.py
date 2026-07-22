#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""将 DeepSeek 游戏示范 MD 经真 multipart 上传到线上知识库并触发索引。

  python scripts/seed_game_kb_via_api.py https://blockhub.club
"""
from __future__ import annotations

import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STARTER = ROOT / "backend" / "app" / "data" / "game_kb_starter"

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://blockhub.club").rstrip("/")
API = f"{BASE}/api/v1"
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trackchat.local")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

HUBS = [
    {
        "slug": "game-faq",
        "name": "游戏·玩家FAQ与活动规则库",
        "description": "活动规则、玩法攻略、版本说明；客服/运营检索，不替代官方公告。",
    },
    {
        "slug": "game-compliance",
        "name": "游戏·版号合规与内容审核库",
        "description": "版号材料要点、敏感词规范、外包验收标准。",
    },
]


def req(method: str, path: str, token: str | None = None, body: dict | None = None, timeout: int = 60):
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
            payload = {"raw": raw[:800]}
        return e.code, payload


def upload_file(token: str, kb_id: str, path: Path) -> tuple[int, dict]:
    boundary = f"----BlockHubBoundary{int(time.time() * 1000)}"
    filename = path.name
    file_bytes = path.read_bytes()
    mime = mimetypes.guess_type(filename)[0] or "text/markdown"
    parts: list[bytes] = []
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(b'Content-Disposition: form-data; name="kb_id"\r\n\r\n')
    parts.append(f"{kb_id}\r\n".encode())
    parts.append(f"--{boundary}\r\n".encode())
    parts.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    parts.append(f"Content-Type: {mime}\r\n\r\n".encode())
    parts.append(file_bytes)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    r = urllib.request.Request(API + "/kb/documents/upload", data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(r, timeout=120) as resp:
            return resp.status, json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"raw": raw[:800]}


def ensure_kb(token: str, name: str, description: str) -> str:
    code, data = req("GET", "/kb/bases", token)
    if code != 200:
        raise SystemExit(f"list bases failed: {code} {data}")
    for b in data.get("items") or []:
        if b.get("name") == name:
            return b["id"]
    code, created = req("POST", "/kb/bases", token, {"name": name, "description": description})
    if code not in (200, 201):
        raise SystemExit(f"create base failed: {code} {created}")
    kb = created.get("kb") or created
    return kb["id"]


def main() -> int:
    print(f"API {API}")
    code, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if code != 200 or not login.get("access_token"):
        print("login failed", code, login)
        return 1
    token = login["access_token"]
    print("login OK")

    total_up = 0
    total_skip = 0
    for hub in HUBS:
        kb_id = ensure_kb(token, hub["name"], hub["description"])
        print(f"\nKB {hub['slug']} id={kb_id}")
        code, docs = req("GET", f"/kb/documents?kb_id={kb_id}", token)
        existing = {d.get("name") for d in (docs.get("items") or [])} if code == 200 else set()
        folder = STARTER / hub["slug"]
        files = sorted(folder.glob("*.md")) if folder.is_dir() else []
        if not files:
            print(f"  WARN no starter files in {folder}")
            continue
        for path in files:
            if path.name in existing:
                print(f"  skip {path.name}")
                total_skip += 1
                continue
            c, res = upload_file(token, kb_id, path)
            if c in (200, 201) and res.get("success"):
                print(f"  upload OK {path.name} → {res.get('document', {}).get('status')}")
                total_up += 1
            else:
                print(f"  upload FAIL {path.name}: {c} {res}")
                return 1

    print("\n等待索引…")
    time.sleep(3)
    for hub in HUBS:
        kb_id = ensure_kb(token, hub["name"], hub["description"])
        code, docs = req("GET", f"/kb/documents?kb_id={kb_id}", token)
        items = docs.get("items") or [] if code == 200 else []
        print(f"{hub['slug']}: {len(items)} docs")
        for d in items:
            print(f"  - {d.get('name')} [{d.get('status')}] chunks={d.get('chunks')}")
        q = "敏感词" if "compliance" in hub["slug"] else "赛季活动"
        code, hits = req("POST", "/kb/search", token, {"query": q, "kb_id": kb_id, "top_k": 3})
        n = len((hits.get("items") or [])) if code == 200 else 0
        print(f"  search「{q}」→ HTTP {code}, hits={n}")

    print(json.dumps({"uploaded": total_up, "skipped": total_skip}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
