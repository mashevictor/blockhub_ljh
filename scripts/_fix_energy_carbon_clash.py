#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# catalog + scenes + packages: full rename
for rel in [
    "backend/app/data/vertical_ops_catalog.py",
    "backend/app/data/energy_scene_capabilities.py",
    "backend/app/data/industry_enrich_static.py",
    "backend/app/services/danmaku_smoke.py",
    "packages/web-capability-vertical-ops/src/VerticalOpsWidgets.tsx",
    "packages/web-capability-vertical-ops/src/index.ts",
    "packages/capability_vertical/lib/vertical_module.dart",
    "packages/capability_vertical/lib/vertical_ops_page.dart",
    "scripts/smoke-vertical-ops.py",
]:
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    p.write_text(t.replace("energy_carbon", "energy_emissions"), encoding="utf-8")
    print("renamed in", rel)

# registry: only the vertical 碳排填报 def
reg = ROOT / "backend/app/data/capability_registry.py"
t = reg.read_text(encoding="utf-8")
old = '''    CapabilityDef("energy_carbon", "碳排填报", "能源电力", "EnergyCarbonWidget", "energy_carbon",
                    "capability_vertical", ("碳排填报",),
                    web_pkg="@blockhub/web-capability-vertical-ops",
                    menu_icon="module", menu_label="碳排填报", route="/energy-carbon"),'''
new = '''    CapabilityDef("energy_emissions", "碳排填报", "能源电力", "EnergyEmissionsWidget", "energy_emissions",
                    "capability_vertical", ("碳排填报",),
                    web_pkg="@blockhub/web-capability-vertical-ops",
                    menu_icon="module", menu_label="碳排填报", route="/energy-emissions"),'''
if old not in t:
    # fuzzy find
    if '碳排填报", "能源电力"' in t:
        t = t.replace(
            'CapabilityDef("energy_carbon", "碳排填报", "能源电力", "EnergyCarbonWidget", "energy_carbon",',
            'CapabilityDef("energy_emissions", "碳排填报", "能源电力", "EnergyEmissionsWidget", "energy_emissions",',
            1,
        )
        t = t.replace('menu_label="碳排填报", route="/energy-carbon")', 'menu_label="碳排填报", route="/energy-emissions")', 1)
        reg.write_text(t, encoding="utf-8")
        print("registry fuzzy patched")
    else:
        print("WARN registry pattern not found")
else:
    reg.write_text(t.replace(old, new), encoding="utf-8")
    print("registry exact patched")

# widget export name in index
idx = ROOT / "packages/web-capability-vertical-ops/src/index.ts"
it = idx.read_text(encoding="utf-8")
it = it.replace("EnergyCarbonWidget", "EnergyEmissionsWidget")
idx.write_text(it, encoding="utf-8")
vw = ROOT / "packages/web-capability-vertical-ops/src/VerticalOpsWidgets.tsx"
vt = vw.read_text(encoding="utf-8")
vt = vt.replace("EnergyCarbonWidget", "EnergyEmissionsWidget")
vw.write_text(vt, encoding="utf-8")
print("done")
