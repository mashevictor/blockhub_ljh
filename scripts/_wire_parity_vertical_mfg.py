#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.vertical_ops_catalog import all_kind_keys  # noqa: E402

(ROOT / "packages/capability_vertical/lib/capability_vertical.dart").write_text(
    "library capability_vertical;\nexport 'vertical_module.dart';\nexport 'vertical_ops_page.dart';\n",
    encoding="utf-8",
)
(ROOT / "packages/capability_mfg/lib/capability_mfg.dart").write_text(
    "library capability_mfg;\nexport 'mfg_module.dart';\nexport 'mfg_ops_page.dart';\n",
    encoding="utf-8",
)

p = ROOT / "shared/flutter-parity-matrix.json"
data = json.loads(p.read_text(encoding="utf-8"))
rows = [r for r in data["rows"] if r.get("flutter_pkg") not in ("capability_vertical", "capability_mfg")]
rows.append(
    {
        "web_pkg": "@blockhub/web-capability-vertical-ops",
        "web_folder": "web-capability-vertical-ops",
        "flutter_pkg": "capability_vertical",
        "p1_scope": "app",
        "status_target": "ok",
        "capability_keys": all_kind_keys(),
        "module_class": "VerticalModule",
        "dart_import": "package:capability_vertical/capability_vertical.dart",
    }
)
rows.append(
    {
        "web_pkg": "@blockhub/web-capability-mfg-ops",
        "web_folder": "web-capability-mfg-ops",
        "flutter_pkg": "capability_mfg",
        "p1_scope": "app",
        "status_target": "ok",
        "capability_keys": [
            "mfg_oee",
            "material_issue",
            "maintenance_plan",
            "shift_attendance",
            "energy_carbon",
            "training_record",
        ],
        "module_class": "MfgModule",
        "dart_import": "package:capability_mfg/capability_mfg.dart",
    }
)
data["rows"] = rows
p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# set mfg flutter_pkg in registry
reg = ROOT / "backend/app/data/capability_registry.py"
t = reg.read_text(encoding="utf-8")
for key in ("mfg_oee", "material_issue", "maintenance_plan", "shift_attendance", "energy_carbon", "training_record"):
    # only empty flutter pkg ""
    pass
# blunt: after each mfg web_pkg line that has "" flutter, set capability_mfg
# CapabilityDef signature: key, name, category, widget, agent_id, flutter_pkg, keywords, ...
import re

def set_flutter(src: str, key: str, pkg: str) -> str:
    pat = rf'(CapabilityDef\("{key}",[^,]*,[^,]*,[^,]*,[^,]*,\s*)""'
    return re.sub(pat, rf'\1"{pkg}"', src, count=1)

for key in ("mfg_oee", "material_issue", "maintenance_plan", "shift_attendance", "energy_carbon", "training_record"):
    t2 = set_flutter(t, key, "capability_mfg")
    if t2 == t:
        print("warn no flutter replace", key)
    t = t2
reg.write_text(t, encoding="utf-8")
print("ok parity", len(rows), "kinds", len(all_kind_keys()))
