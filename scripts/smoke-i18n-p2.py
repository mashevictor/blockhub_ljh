#!/usr/bin/env python3
"""P2 smoke: shell common.* parity + t() keys used by home/frontend/web-core."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_ROOTS = [
    ROOT / "home/src",
    ROOT / "frontend/src",
    ROOT / "packages/web-core/src",
]
T_CALL_RE = re.compile(r"""\bt\(\s*(['"])([a-zA-Z][\w.-]*)\1""")
# also i18n.t('...')
T_DOT_RE = re.compile(r"""\.t\(\s*(['"])([a-zA-Z][\w.-]*)\1""")


def load_common_keys() -> set[str]:
    zh = json.loads((ROOT / "shared/i18n/messages/zh-CN/common.json").read_text(encoding="utf-8"))
    en = json.loads((ROOT / "shared/i18n/messages/en-US/common.json").read_text(encoding="utf-8"))
    assert set(zh) == set(en), f"common key mismatch zh={set(zh)^set(en)}"
    return {f"common.{k}" for k in zh}


def scan_keys() -> set[str]:
    found: set[str] = set()
    for root in SCAN_ROOTS:
        for path in list(root.rglob("*.ts")) + list(root.rglob("*.tsx")):
            text = path.read_text(encoding="utf-8")
            for rx in (T_CALL_RE, T_DOT_RE):
                for m in rx.finditer(text):
                    found.add(m.group(2))
    return found


def main() -> int:
    common = load_common_keys()
    used = {k for k in scan_keys() if k.startswith("common.")}
    missing = sorted(used - common)
    if missing:
        print("ERROR: t() common.* missing from common.json:", missing)
        return 1
    print(f"OK smoke-i18n-p2: {len(used)} common.* refs covered by {len(common)} catalog keys")
    print("  used:", ", ".join(sorted(used)) or "(none)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
