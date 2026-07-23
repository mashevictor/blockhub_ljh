#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS  # noqa: E402

# DeepSeek 已生成过的行业
DONE_DS = {
    "sales": "_sales_scenes_full_deepseek.json",
    "med": "_med_scenes_full_deepseek.json",
}

# 零售/酒店：手工加深到 ~30，非 DeepSeek JSON
MANUAL_DEEP = {"retail", "hotel", "office", "game", "logistics", "realestate", "bank", "securities", "insurance", "fund", "fintech"}

# 待 DeepSeek 丰富（用户说的「剩下的」）
REMAINING = [
    "edu", "energy", "gov", "legal", "hr",
    "construction", "agriculture", "media", "auto", "marketing", "mfg",
]

print("=== DeepSeek 已生成 ===")
for k, f in DONE_DS.items():
    p = ROOT / "scripts" / f
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
        print(f"  {k}: {data.get('scene_count') or len(data.get('scenes') or [])} 条 → {f}")
    else:
        print(f"  {k}: 文件缺失")

print("\n=== 待 DeepSeek 丰富的行业（剩余）===")
packs = {p["key"]: p for p in ALL_INDUSTRY_PACKS}
for k in REMAINING:
    p = packs.get(k)
    if not p:
        print(f"  {k}: 不在 packs")
        continue
    scenes = p.get("scenes") or []
    print(f"\n## {k} · {p.get('name')}  （当前 {len(scenes)} 条）")
    for s in scenes:
        print(f"  - {s.get('name')}  [{s.get('category','')}]  agent={s.get('agent','')}")
