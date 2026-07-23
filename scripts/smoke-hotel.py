#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""酒店餐饮冒烟：场景 SSOT · 注册表 · hotel_ops · Web/Flutter。"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.data.hotel_scene_capabilities import VERTICAL_ROWS, pack_scenes  # noqa: E402
from app.services.hotel_ops_store import KINDS  # noqa: E402


def main() -> int:
    fails: list[str] = []
    rows = VERTICAL_ROWS.get("hotel") or []
    scenes = pack_scenes("hotel")
    print(f"hotel scenes: {len(scenes)} (rows={len(rows)})")
    if len(scenes) < 28:
        fails.append(f"scene count too low: {len(scenes)}")

    keys = {r["capability_key"] for r in rows}
    for k in sorted(keys):
        if k not in ALL_CAPABILITIES:
            fails.append(f"capability missing in registry: {k}")
        else:
            print(f"  OK registry {k}")

    for kind in sorted(KINDS):
        if kind not in ALL_CAPABILITIES:
            fails.append(f"hotel_ops kind not registered: {kind}")

    web = ROOT / "packages" / "web-capability-hotel-ops" / "src" / "index.ts"
    flutter = ROOT / "packages" / "capability_hotel" / "lib" / "hotel_module.dart"
    mig = ROOT / "backend" / "alembic" / "versions" / "049_hotel_ops_records.py"
    api = ROOT / "backend" / "app" / "api" / "v1" / "hotel_ops.py"
    for p, label in ((web, "web pkg"), (flutter, "flutter pkg"), (mig, "alembic 049"), (api, "API")):
        if not p.exists():
            fails.append(f"missing {label}: {p}")
        else:
            print(f"  OK {label}")

    if fails:
        print("FAIL:")
        for f in fails:
            print(" -", f)
        return 1
    print("OK hotel smoke")
    print("deploy: alembic upgrade head  # 049 hotel_ops_records")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
