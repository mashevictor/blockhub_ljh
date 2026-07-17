# -*- coding: utf-8 -*-
"""Generate home/src/data/officeScenes66.ts from office_scene_capabilities."""
from __future__ import annotations

import json
from pathlib import Path

from app.data.office_scene_capabilities import _OFFICE_SCENE_ROWS, page_mock_for_scene

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "home" / "src" / "data" / "officeScenes66.ts"

KIND_MAP = {
    "chat_kb": "chat_kb",
    "form_list": "understood",
    "chart": "oee",
    "roster": "roster",
    "files": "bom",
    "approval": "understood",
    "notify": "integration",
}

header = '''/** Auto-aligned with backend office_scene_capabilities (66). Regenerate: PYTHONPATH=backend python scripts/gen_office_scenes66_ts.py */
export type OfficeSceneSeed = {
  id: string
  name: string
  category: string
  summary: string
  pages: string
  kind: string
  capabilityHint: string
  pageMock?: Record<string, unknown>
}

export const OFFICE_SCENE_SEEDS: OfficeSceneSeed[] = [
'''

items = []
for i, r in enumerate(_OFFICE_SCENE_ROWS, 1):
    mock = page_mock_for_scene(r["name"])
    kind = KIND_MAP.get(str(r.get("page_kind") or "form_list"), "understood")
    if r["capability_key"] == "it_ticket":
        kind = "repair"
    item = {
        "id": f"o{i}",
        "name": r["name"],
        "category": r["category"],
        "summary": r.get("problem") or r["name"],
        "pages": r.get("pages") or "form",
        "kind": kind,
        "capabilityHint": r["capability_key"],
    }
    if mock:
        item["pageMock"] = mock
    items.append("  " + json.dumps(item, ensure_ascii=False))

footer = """
]

export const OFFICE_SCENE_NAMES = OFFICE_SCENE_SEEDS.map((s) => s.name)
"""

OUT.write_text(header + ",\n".join(items) + "\n" + footer, encoding="utf-8")
print(f"wrote {OUT} ({len(items)} scenes)")
