#!/usr/bin/env python3
"""Audit en-US scene.gen.json for residual CJK / mixed leftovers."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / "shared/i18n/messages/en-US/scene.gen.json"
d = json.loads(p.read_text(encoding="utf-8"))
CJK = re.compile(r"[\u4e00-\u9fff]")
LATIN = re.compile(r"[A-Za-z]{3,}")
stats: dict[str, dict[str, int]] = defaultdict(lambda: {"cjk_name": 0, "cjk_problem": 0, "mixed_name": 0, "total_name": 0})
examples: dict[str, list[str]] = defaultdict(list)

for k, v in d.items():
    if not k.startswith("scene.") or not isinstance(v, str):
        continue
    parts = k.split(".")
    if len(parts) < 4:
        continue
    pack, _idx, field = parts[1], parts[2], parts[3]
    if field == "name":
        stats[pack]["total_name"] += 1
        if CJK.search(v):
            stats[pack]["cjk_name"] += 1
            if LATIN.search(v) and (
                re.search(r"[\u4e00-\u9fff]\s+[a-z]", v, re.I)
                or re.search(r"[a-z]+\s+[\u4e00-\u9fff]", v, re.I)
            ):
                stats[pack]["mixed_name"] += 1
            if len(examples[pack]) < 2:
                examples[pack].append(v)
    elif field == "problem" and CJK.search(v):
        stats[pack]["cjk_problem"] += 1

print("pack | scenes | cjk_name | mixed | cjk_problem")
for pack in sorted(stats, key=lambda p: -stats[p]["cjk_name"]):
    s = stats[pack]
    if s["cjk_name"] == 0 and s["cjk_problem"] == 0:
        continue
    print(f"{pack:14} {s['total_name']:3} {s['cjk_name']:3} {s['mixed_name']:3} {s['cjk_problem']:4}  ex={examples[pack]}")
print("---")
print("packs with any CJK name:", sum(1 for s in stats.values() if s["cjk_name"]))
print("packs clean:", sum(1 for s in stats.values() if s["cjk_name"] == 0 and s["total_name"]))
