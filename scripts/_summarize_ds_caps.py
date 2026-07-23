#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path

d = Path(__file__).resolve().parents[1] / "scripts" / "_vertical_deepseek"
for p in sorted(d.glob("*_scenes_deepseek.json")):
    data = json.loads(p.read_text(encoding="utf-8"))
    caps = Counter(s.get("capability_key") for s in data["scenes"])
    print(f"\n{data['industry_key']} ({data['scene_count']})")
    for k, v in caps.most_common():
        print(f"  {v:2d}  {k}")
    print("  names:", "、".join(s["name"] for s in data["scenes"][:12]), "…")
