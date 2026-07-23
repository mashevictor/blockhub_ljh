#!/usr/bin/env python3
import json
from pathlib import Path

d = Path(__file__).resolve().parents[1] / "scripts" / "_vertical_deepseek"
print("## DeepSeek 丰富后的行业场景清单\n")
for p in sorted(d.glob("*_scenes_deepseek.json")):
    data = json.loads(p.read_text(encoding="utf-8"))
    names = [s["name"] for s in data["scenes"]]
    print(f"### {data.get('industry_key')} · {data.get('industry_name', '')}（{len(names)} 条）")
    print("、".join(names))
    print()
