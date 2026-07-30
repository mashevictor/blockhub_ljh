#!/usr/bin/env python3
"""P4 smoke: API error codes, Accept-Language catalog, seeds, hero copy EN."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

CJK = re.compile(r"[\u4e00-\u9fff]")


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> int:
    failed = False

    # --- errors.json parity + shellBundles ---
    zh_err = load(ROOT / "shared/i18n/messages/zh-CN/errors.json")
    en_err = load(ROOT / "shared/i18n/messages/en-US/errors.json")
    zh_keys = {k for k in zh_err if not str(k).startswith("_")}
    en_keys = {k for k in en_err if not str(k).startswith("_")}
    if zh_keys != en_keys:
        print(f"ERROR: errors.json key mismatch: {sorted(zh_keys ^ en_keys)[:20]}")
        failed = True
    else:
        print(f"OK  errors.json parity ({len(zh_keys)} keys)")

    for code in ("UNAUTHORIZED", "INVALID_CODE", "DB_UNAVAILABLE", "BAD_CREDENTIALS"):
        if code not in zh_keys:
            print(f"ERROR: missing error code {code}")
            failed = True

    bundles = (ROOT / "shared/i18n/shellBundles.ts").read_text(encoding="utf-8")
    if "errorsZh" not in bundles or "error:" not in bundles:
        print("ERROR: shellBundles missing error messages")
        failed = True
    else:
        print("OK  shellBundles includes error.*")

    # --- api_error helper + auth/deps wiring ---
    api_error = ROOT / "backend/app/core/api_error.py"
    if not api_error.is_file():
        print("ERROR: missing api_error.py")
        failed = True
    else:
        print("OK  api_error.py")

    deps = (ROOT / "backend/app/core/deps.py").read_text(encoding="utf-8")
    if "raise_api_error" not in deps or "UNAUTHORIZED" not in deps:
        print("ERROR: deps.py not using raise_api_error codes")
        failed = True
    else:
        print("OK  deps.py structured errors")

    auth = (ROOT / "backend/app/api/v1/auth.py").read_text(encoding="utf-8")
    if 'raise_api_error' not in auth or "INVALID_CODE" not in auth:
        print("ERROR: auth.py missing coded errors")
        failed = True
    else:
        print("OK  auth.py structured errors")

    # --- FE formatApiError ---
    api_err_ts = ROOT / "packages/i18n/src/apiError.ts"
    if not api_err_ts.is_file():
        print("ERROR: missing packages/i18n/src/apiError.ts")
        failed = True
    else:
        print("OK  formatApiError helper")

    auth_page = (ROOT / "frontend/src/pages/AuthPage.tsx").read_text(encoding="utf-8")
    if "formatAxiosApiError" not in auth_page:
        print("ERROR: AuthPage not using formatAxiosApiError")
        failed = True
    else:
        print("OK  AuthPage error i18n")

    # --- Accept-Language catalog ---
    catalog = (ROOT / "backend/app/api/v1/catalog.py").read_text(encoding="utf-8")
    if "localize_capabilities" not in catalog or "localize_hero" not in catalog:
        print("ERROR: catalog.py missing localize_*")
        failed = True
    else:
        print("OK  catalog Accept-Language wiring")

    home_client = (ROOT / "home/src/api/client.ts").read_text(encoding="utf-8")
    fe_client = (ROOT / "frontend/src/api/client.ts").read_text(encoding="utf-8")
    if "Accept-Language" not in home_client or "Accept-Language" not in fe_client:
        print("ERROR: axios clients missing Accept-Language")
        failed = True
    else:
        print("OK  axios Accept-Language")

    # Functional localize check (no DB)
    from app.services.i18n_catalog import localize_capability, localize_hero

    cap = localize_capability(
        {"key": "leave_request", "name": "请假审批", "category": "人事行政", "widget": "", "agent_id": ""},
        "en-US",
    )
    if cap.get("name") != "Leave Request":
        print(f"ERROR: localize_capability leave_request => {cap.get('name')!r}")
        failed = True
    else:
        print("OK  localize_capability en-US")

    hero = localize_hero(
        {
            "id": "s01",
            "label": "请假审批",
            "hint": "人事 · 流程",
            "prompt": "zh",
            "role": "HR",
            "flowLines": [">> a", ">> b"],
            "picks": [],
            "color": "#000",
            "weight": 3,
        },
        "en-US",
    )
    if hero.get("label") != "Leave Request":
        print(f"ERROR: localize_hero s01.label => {hero.get('label')!r}")
        failed = True
    elif CJK.search(str(hero.get("hint") or "")):
        print(f"ERROR: hero s01.hint still CJK: {hero.get('hint')!r}")
        failed = True
    elif CJK.search(str(hero.get("prompt") or "")):
        print(f"ERROR: hero s01.prompt still CJK: {hero.get('prompt')!r}")
        failed = True
    else:
        print("OK  localize_hero en-US hint/prompt")

    # --- seeds coverage ---
    cap_seed = load(ROOT / "shared/i18n/seed/capability.en-US.json")
    cap_seed_keys = {k for k in cap_seed if not str(k).startswith("_")}
    from app.data.capability_registry import ALL_CAPABILITIES

    missing_caps = sorted(set(ALL_CAPABILITIES) - cap_seed_keys)
    if missing_caps:
        print(f"ERROR: capability seed missing {len(missing_caps)} keys e.g. {missing_caps[:8]}")
        failed = True
    else:
        print(f"OK  capability seed covers {len(cap_seed_keys)} keys")

    hero_seed = load(ROOT / "shared/i18n/seed/hero.en-US.json")
    missing_heroes = [pid for pid in ("s35", "s36", "s37", "s38", "s39", "s40") if pid not in hero_seed]
    if missing_heroes:
        print(f"ERROR: hero.en-US.json missing {missing_heroes}")
        failed = True
    else:
        print("OK  hero labels s35-s40")

    copy_path = ROOT / "shared/i18n/seed/hero-copy.en-US.json"
    if not copy_path.is_file():
        print("ERROR: missing hero-copy.en-US.json")
        failed = True
    else:
        copy = load(copy_path)
        s01 = copy.get("s01") or {}
        if not s01.get("hint") or CJK.search(str(s01.get("hint"))):
            print(f"ERROR: hero-copy s01.hint bad: {s01.get('hint')!r}")
            failed = True
        elif not isinstance(s01.get("flow_lines"), list) or not s01["flow_lines"]:
            print("ERROR: hero-copy s01.flow_lines missing")
            failed = True
        else:
            print("OK  hero-copy.en-US.json")

    hero_en = load(ROOT / "shared/i18n/messages/en-US/hero.gen.json")
    hero_gen_ok = True
    for key in ("hero.s01.hint", "hero.s01.prompt", "hero.s01.flow.0", "hero.s35.label"):
        if key not in hero_en:
            print(f"ERROR: hero.gen.json missing {key}")
            failed = True
            hero_gen_ok = False
        elif key.endswith((".hint", ".prompt", ".flow.0")) and CJK.search(hero_en[key]):
            print(f"ERROR: {key} still CJK: {hero_en[key]!r}")
            failed = True
            hero_gen_ok = False
    if hero_gen_ok:
        print("OK  hero.gen.json EN copy keys")

    dialog = (ROOT / "home/src/components/HeroRoleDialog.tsx").read_text(encoding="utf-8")
    if "hero.${role.id}.hint" not in dialog and "hero.${role.id}.prompt" not in dialog:
        if "useTf" not in dialog or "flow." not in dialog:
            print("ERROR: HeroRoleDialog not consuming hero.* copy keys")
            failed = True
        else:
            print("OK  HeroRoleDialog hero copy i18n")
    else:
        print("OK  HeroRoleDialog hero copy i18n")

    if failed:
        print("FAIL smoke-i18n-p4")
        return 1
    print("OK smoke-i18n-p4")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
