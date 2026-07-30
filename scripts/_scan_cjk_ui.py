# -*- coding: utf-8 -*-
"""Scan non-CapShip TS/TSX for CJK in string-like UI lines."""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

CJK = re.compile(r"[\u4e00-\u9fff]")
STRISH = re.compile(r"[\"'`][^\"'`\n]*[\u4e00-\u9fff]|>([^<{]*[\u4e00-\u9fff])")

ROOTS = [
    Path(r"d:/file/work_7-24/code/blockhub_ljh/home/src"),
    Path(r"d:/file/work_7-24/code/blockhub_ljh/frontend/src"),
    Path(r"d:/file/work_7-24/code/blockhub_ljh/runtime-web/src"),
]

SKIP_DIR_NAMES = {"node_modules", "data"}  # home data = SSOT Chinese catalogs
SKIP_NAME_SUBSTR = ("CapShip",)


def should_skip(p: Path, root: Path) -> bool:
    if any(s in p.name for s in SKIP_NAME_SUBSTR):
        return True
    rel_parts = p.relative_to(root).parts
    if "node_modules" in rel_parts:
        return True
    # Skip huge Chinese SSOT under home/src/data
    if root.name == "src" and "home" in str(root) and "data" in rel_parts:
        return True
    return False


def main() -> None:
    by: dict[str, list[tuple[int, str]]] = defaultdict(list)
    for root in ROOTS:
        for p in root.rglob("*"):
            if p.suffix not in {".ts", ".tsx"}:
                continue
            if should_skip(p, root):
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except OSError:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                stripped = line.strip()
                if not stripped or stripped.startswith("//") or stripped.startswith("*"):
                    continue
                # comment-only CJK after //
                code = stripped.split("//")[0]
                if not CJK.search(code):
                    continue
                if not STRISH.search(code):
                    continue
                # already i18n call with Chinese fallback is still a hardcode — keep
                rel = str(p).replace("\\", "/")
                by[rel].append((i, stripped[:160]))

    print(f"FILES={len(by)} LINES={sum(len(v) for v in by.values())}")
    for f, items in sorted(by.items(), key=lambda x: -len(x[1]))[:50]:
        short = f.split("/blockhub_ljh/")[-1]
        print(f"\n## {short} ({len(items)})")
        for i, l in items[:10]:
            print(f"  {i}: {l}")


if __name__ == "__main__":
    main()
