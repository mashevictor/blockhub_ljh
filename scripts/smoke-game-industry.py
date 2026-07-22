#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""游戏娱乐行业装配冒烟：SSOT 场景 → 真 capability / 双 KB / game_support API。

  python scripts/smoke-game-industry.py
  python scripts/smoke-game-industry.py https://blockhub.club
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

from app.data.game_scene_capabilities import GAME_SCENE_COUNT, GAME_SCENES_BY_NAME, game_pack_scenes  # noqa: E402
from app.data.industry_knowledge_bases import industry_kb_defs, pick_hub_for_scene, starter_md_files  # noqa: E402
from app.services.scene_capability_map import assemble_industry_pack  # noqa: E402

BASE = (sys.argv[1] if len(sys.argv) > 1 else "").rstrip("/")
API = f"{BASE}/api/v1" if BASE else ""
EMAIL = os.environ.get("ADMIN_EMAIL", "admin@trackchat.local")
PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


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
    print("== local SSOT ==")
    fails = 0
    if GAME_SCENE_COUNT < 12:
        bad(f"scene count {GAME_SCENE_COUNT}")
        fails += 1
    else:
        ok(f"scene count {GAME_SCENE_COUNT}")

    scenes = game_pack_scenes()
    if len(scenes) != GAME_SCENE_COUNT:
        bad("game_pack_scenes length mismatch")
        fails += 1
    else:
        ok("game_pack_scenes length")

    for name in ("玩家FAQ", "客服工单", "游戏·玩家FAQ与活动规则库", "2048小游戏"):
        if name not in GAME_SCENES_BY_NAME:
            bad(f"missing scene {name}")
            fails += 1
        else:
            ok(f"scene {name} → {GAME_SCENES_BY_NAME[name]['capability_key']}")

    hubs = industry_kb_defs("game")
    if len(hubs) != 2:
        bad(f"hubs={len(hubs)}")
        fails += 1
    else:
        ok(f"hubs {[h['slug'] for h in hubs]}")

    h = pick_hub_for_scene("game", "版号合规审查", "内容审核")
    if not h or h["slug"] != "game-compliance":
        bad(f"pick_hub compliance → {h}")
        fails += 1
    else:
        ok("pick_hub compliance")

    h2 = pick_hub_for_scene("game", "活动规则检索", "攻略")
    if not h2 or h2["slug"] != "game-faq":
        bad(f"pick_hub faq → {h2}")
        fails += 1
    else:
        ok("pick_hub faq")

    for slug in ("game-faq", "game-compliance"):
        files = starter_md_files("game", slug)
        n = len(files)
        if n < 4:
            bad(f"starter {slug} docs={n} (need DeepSeek gen)")
            fails += 1
        else:
            ok(f"starter {slug} docs={n}")

    asm = assemble_industry_pack("game")
    keys = asm.get("capability_keys") or []
    need = {"game_support", "kb_document", "notify_im", "approval_flow", "game_2048"}
    missing = need - set(keys)
    if missing:
        bad(f"assembly missing {missing}; got {keys}")
        fails += 1
    else:
        ok(f"assembly keys include core ({len(keys)} total)")

    plan = asm.get("menu_plan") or []
    faq = next((i for i in plan if i.get("label") == "玩家FAQ"), None)
    if not faq or faq.get("default_category") != "faq" or faq.get("capability_key") != "game_support":
        bad(f"menu 玩家FAQ → {faq}")
        fails += 1
    else:
        ok("menu 玩家FAQ locked faq")

    kb = next((i for i in plan if i.get("kb_slug") == "game-faq" and i.get("lock_kb")), None)
    if not kb:
        bad("no locked game-faq kb menu")
        fails += 1
    else:
        ok(f"locked kb {kb.get('label')}")

    return fails


def smoke_api() -> int:
    print(f"\n== API {API} ==")
    fails = 0
    code, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if code != 200 or not login.get("access_token"):
        bad(f"login {code}")
        return 1
    token = login["access_token"]
    ok("login")

    code, data = req("POST", "/game-support/records", token, {
        "category": "faq",
        "title": "smoke-game-faq",
        "content": "赛季活动规则冒烟",
        "player_name": "smoke",
    })
    if code not in (200, 201):
        # 线上未 alembic upgrade（缺 game_support_records）时常见 500
        bad(f"create faq {code} {data} — 若 Internal Server Error，请服务器 alembic upgrade 至含 game_support_records")
        fails += 1
    else:
        ok("POST game-support faq")
        rid = (data.get("item") or data.get("record") or data).get("id")
        if rid:
            req("POST", f"/game-support/records/{rid}/close", token, {})

    code, listing = req("GET", "/game-support/records", token)
    if code != 200:
        bad(f"list records {code} — 同上，需表 game_support_records")
        fails += 1
    else:
        ok(f"list records n={len(listing.get('items') or [])}")

    for hub in industry_kb_defs("game"):
        code, bases = req("GET", "/kb/bases", token)
        items = bases.get("items") or [] if code == 200 else []
        found = next((b for b in items if b.get("name") == hub["name"]), None)
        if not found:
            bad(f"kb missing {hub['name']} (publish game app or run seed_game_kb_via_api)")
            fails += 1
            continue
        ok(f"kb exists {hub['slug']}")
        q = "敏感词" if hub["slug"] == "game-compliance" else "赛季"
        code, hits = req("POST", "/kb/search", token, {"query": q, "kb_id": found["id"], "top_k": 3})
        n = len((hits.get("items") or [])) if code == 200 else 0
        if code != 200:
            bad(f"search {hub['slug']} HTTP {code}")
            fails += 1
        elif n == 0:
            bad(f"search {hub['slug']} hits=0 (seed docs?)")
            fails += 1
        else:
            ok(f"search {hub['slug']} hits={n}")

    return fails


def main() -> int:
    fails = smoke_local()
    if BASE:
        fails += smoke_api()
    print(json.dumps({"fails": fails}, ensure_ascii=False))
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
