#!/usr/bin/env python3
"""Generate shared/capability-manifest.json from capability_registry.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.services.build_manifest import _route_for, _web_pkg, _flutter_pkg


def main() -> None:
    items = []
    for key in sorted(ALL_CAPABILITIES.keys()):
        cap = ALL_CAPABILITIES[key]
        items.append(
            {
                "key": cap.key,
                "name": cap.name,
                "category": cap.category,
                "widget": cap.widget,
                "agent_id": cap.agent_id,
                "web_pkg": _web_pkg(cap.key),
                "flutter_pkg": _flutter_pkg(cap.key),
                "route": _route_for(cap.key, cap.widget),
                "keywords": list(cap.keywords),
            }
        )
    out = ROOT / "shared" / "capability-manifest.json"
    out.write_text(json.dumps({"version": 1, "capabilities": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out} ({len(items)} capabilities)")


if __name__ == "__main__":
    main()
