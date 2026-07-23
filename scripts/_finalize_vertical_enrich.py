#!/usr/bin/env python3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.vertical_ops_catalog import all_kind_keys  # noqa: E402
from app.services.scene_capability_map import assemble_industry_pack  # noqa: E402

kinds = all_kind_keys()
print("vertical kinds", len(kinds))

# flutter module keys
mod = ROOT / "packages/capability_vertical/lib/vertical_module.dart"
mod.write_text(
    "import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';\n"
    "import 'package:flutter/material.dart';\n\n"
    "import 'vertical_ops_page.dart';\n\n"
    f"const verticalCapabilityKeys = {{{', '.join(repr(k) for k in kinds)}}};\n\n"
    "bool isVerticalCapabilityKey(String key) => verticalCapabilityKeys.contains(key);\n\n"
    "class VerticalModule implements CapabilityModule {\n"
    "  const VerticalModule({this.capabilityKey = 'edu_grade_alert'});\n\n"
    "  @override\n  final String capabilityKey;\n\n"
    "  @override\n  Widget buildPage(AppBranding branding) {\n"
    "    return VerticalOpsPage(branding: branding, kind: capabilityKey);\n"
    "  }\n}\n",
    encoding="utf-8",
)

smoke = ROOT / "scripts/smoke-vertical-ops.py"
smoke.write_text(
    f'''#!/usr/bin/env python3
"""Smoke vertical_ops kinds against live API."""
from __future__ import annotations
import json, sys, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001").rstrip("/")
API = f"{{BASE}}/api/v1"
KINDS = {kinds!r}

def req(method, path, token=None, body=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {{"Content-Type": "application/json"}}
    if token:
        headers["Authorization"] = f"Bearer {{token}}"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

tok = req("POST", "/auth/login", body={{"email": "admin@trackchat.local", "password": "admin123"}})["access_token"]
for kind in KINDS:
    items = req("GET", f"/vertical-ops/{{kind}}/records", token=tok)
    assert "items" in items
    created = req("POST", f"/vertical-ops/{{kind}}/records", token=tok, body={{
        "title": f"smoke-{{kind}}", "field_a": "a", "note": "smoke"
    }})
    rid = created["record"]["id"]
    req("POST", f"/vertical-ops/{{kind}}/records/{{rid}}/done", token=tok)
    print("OK", kind)
print("PASS", len(KINDS), "kinds")
''',
    encoding="utf-8",
)

print("\n=== pack assembly ===")
total = 0
for k in [
    "edu", "energy", "gov", "legal", "hr", "mfg",
    "construction", "agriculture", "media", "auto", "marketing",
]:
    a = assemble_industry_pack(k)
    total += a["scene_count"]
    print(f"  {k:14s} scenes={a['scene_count']:2d} caps={len(a['capability_keys']):2d}")
print("total scenes", total)
