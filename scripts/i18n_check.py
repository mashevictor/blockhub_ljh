#!/usr/bin/env python3
"""i18n:check — locale key parity + optional t() usage scan (P0 skeleton).

Exit non-zero when:
  - zh-CN / en-US message key sets differ (after flatten)
  - referenced t('...') keys in scanned TS/TSX are missing from zh-CN (if any files scanned)

Does not require network. Safe to run offline.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESSAGES = ROOT / "shared" / "i18n" / "messages"
LOCALES = ("zh-CN", "en-US")
META_KEYS = {"_generated_by", "_do_not_edit", "_comment"}

# t('a.b') or t("a.b") — ignores dynamic t(variable)
T_CALL_RE = re.compile(
    r"""\bt\(\s*(['"])([a-zA-Z][\w.-]*)\1""",
)


def flatten(node: object, prefix: str = "") -> dict[str, str]:
    out: dict[str, str] = {}
    if isinstance(node, dict):
        for k, v in node.items():
            if k in META_KEYS or str(k).startswith("_"):
                continue
            next_prefix = f"{prefix}.{k}" if prefix else str(k)
            if isinstance(v, dict):
                out.update(flatten(v, next_prefix))
            elif isinstance(v, str):
                out[next_prefix] = v
    return out


def load_locale(locale: str) -> dict[str, str]:
    folder = MESSAGES / locale
    if not folder.is_dir():
        raise FileNotFoundError(f"missing messages dir: {folder}")
    merged: dict[str, str] = {}
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        # Namespace files: common.json → common.*; capability.gen.json already has cap.*
        stem = path.name
        if stem.endswith(".gen.json"):
            flat = flatten(data)
        else:
            ns = path.stem  # common, errors
            flat = flatten(data, ns if ns != "errors" else "error")
        overlap = set(merged) & set(flat)
        if overlap:
            raise SystemExit(f"ERROR: duplicate keys in {locale}: {sorted(overlap)[:8]}")
        merged.update(flat)
    return merged


def scan_t_keys(paths: list[Path]) -> set[str]:
    found: set[str] = set()
    for path in paths:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        for m in T_CALL_RE.finditer(text):
            found.add(m.group(2))
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="BlockHub i18n:check")
    parser.add_argument(
        "--scan",
        nargs="*",
        default=[],
        help="Optional TS/TSX files or dirs to scan for t('key') usage",
    )
    args = parser.parse_args()

    locales: dict[str, dict[str, str]] = {}
    for loc in LOCALES:
        locales[loc] = load_locale(loc)
        print(f"  {loc}: {len(locales[loc])} keys")

    zh = set(locales["zh-CN"])
    en = set(locales["en-US"])
    missing_en = sorted(zh - en)
    missing_zh = sorted(en - zh)
    failed = False
    if missing_en:
        failed = True
        print(f"ERROR: {len(missing_en)} keys in zh-CN missing from en-US:")
        for k in missing_en[:40]:
            print(f"  - {k}")
        if len(missing_en) > 40:
            print(f"  ... and {len(missing_en) - 40} more")
    if missing_zh:
        failed = True
        print(f"ERROR: {len(missing_zh)} keys in en-US missing from zh-CN:")
        for k in missing_zh[:40]:
            print(f"  - {k}")

    scan_paths: list[Path] = []
    for raw in args.scan:
        p = Path(raw)
        if not p.is_absolute():
            p = ROOT / p
        if p.is_dir():
            scan_paths.extend(p.rglob("*.ts"))
            scan_paths.extend(p.rglob("*.tsx"))
        else:
            scan_paths.append(p)

    if scan_paths:
        used = scan_t_keys(scan_paths)
        missing_used = sorted(k for k in used if k not in zh)
        print(f"  scanned t() keys: {len(used)}")
        if missing_used:
            failed = True
            print(f"ERROR: {len(missing_used)} t() keys missing from zh-CN:")
            for k in missing_used[:40]:
                print(f"  - {k}")

    if failed:
        print("i18n:check FAILED")
        return 1
    print("OK i18n:check")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
