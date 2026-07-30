#!/usr/bin/env python3
"""Fail if any web-capability index.ts has locales import spliced into a brace import."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BAD = re.compile(r"import\s*\{\s*\n\s*import\s+['\"]\./locales['\"]")


def main() -> int:
    bad: list[str] = []
    for path in sorted((ROOT / "packages").glob("web-capability-*/src/index.ts")):
        text = path.read_text(encoding="utf-8")
        if BAD.search(text):
            bad.append(str(path.relative_to(ROOT)))
        elif "import './locales'" not in text and 'import "./locales"' not in text:
            if "./locales" not in text:
                bad.append(f"{path.relative_to(ROOT)} (missing locales import)")
    if bad:
        print("ERROR broken/missing locales imports:")
        for b in bad:
            print(f"  - {b}")
        return 1
    print("OK all web-capability index.ts locales imports")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
