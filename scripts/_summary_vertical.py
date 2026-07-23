#!/usr/bin/env python3
from app.services.scene_capability_map import assemble_industry_pack
from app.data.hero_presets import HERO_PRESETS
from app.services.vertical_ops_store import KINDS

print("hero", len(HERO_PRESETS))
print("vertical kinds", len(KINDS))
for k in [
    "edu", "energy", "gov", "legal", "hr", "mfg",
    "construction", "agriculture", "media", "auto", "marketing",
]:
    a = assemble_industry_pack(k)
    print(f"{k:14s} scenes={a['scene_count']:2d} caps={len(a['capability_keys']):2d}")
