#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""物流仓储冒烟：场景 SSOT · 注册表 · logistics_ops API 包 · Web/Flutter 目录。"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.logistics_scene_capabilities import VERTICAL_ROWS, pack_scenes  # noqa: E402
from app.services.logistics_ops_store import KINDS  # noqa: E402


def main() -> int:
    fails: list[str] = []
    rows = VERTICAL_ROWS.get("logistics") or []
    scenes = pack_scenes("logistics")
    print(f"logistics scenes: {len(scenes)} (rows={len(rows)})")
    if len(scenes) < 18:
        fails.append(f"scene count too low: {len(scenes)}")

    keys = {r["capability_key"] for r in rows}
    for k in sorted(keys):
        if k not in ALL_CAPABILITIES:
            fails.append(f"capability missing in registry: {k}")
        else:
            print(f"  OK registry {k}")

    for kind in sorted(KINDS):
        if kind not in ALL_CAPABILITIES:
            fails.append(f"logistics_ops kind not registered: {kind}")

    web = ROOT / "packages" / "web-capability-logistics-ops" / "src" / "index.ts"
    flutter = ROOT / "packages" / "capability_logistics" / "lib" / "logistics_module.dart"
    mig = ROOT / "backend" / "alembic" / "versions" / "046_logistics_ops_records.py"
    api = ROOT / "backend" / "app" / "api" / "v1" / "logistics_ops.py"
    for p, label in ((web, "web pkg"), (flutter, "flutter pkg"), (mig, "alembic 046"), (api, "API")):
        if not p.exists():
            fails.append(f"missing {label}: {p}")
        else:
            print(f"  OK {label}")

    if fails:
        print("FAIL:")
        for f in fails:
            print(" -", f)
        return 1
    print("OK logistics smoke")
    print("deploy: alembic upgrade head  # 046 logistics_ops_records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
