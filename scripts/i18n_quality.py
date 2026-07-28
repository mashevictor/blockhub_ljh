#!/usr/bin/env python3
"""i18n EN quality gate — CJK / humanize(key) → warn + reviewed:false sidecar.

Usage:
  python scripts/i18n_quality.py              # warn only (exit 0 unless --fail-on-cjk)
  python scripts/i18n_quality.py --fail-on-cjk
  python scripts/i18n_quality.py --write      # refresh shared/i18n/meta/en-review-status.json

Does not couple to React. Reads shared/i18n/messages only (+ optional glossary).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESSAGES = ROOT / "shared" / "i18n" / "messages"
META = ROOT / "shared" / "i18n" / "meta"
STATUS_PATH = META / "en-review-status.json"
REPORT_PATH = META / "en-quality-report.json"

CJK_RE = re.compile(r"[\u4e00-\u9fff]")
META_KEYS = {"_generated_by", "_do_not_edit", "_comment", "_schema"}


def humanize_slug(slug: str) -> str:
    parts = re.split(r"[_\s.-]+", slug.strip())
    return " ".join(p[:1].upper() + p[1:] for p in parts if p)


def guess_slug_from_key(key: str) -> str:
    parts = key.split(".")
    if len(parts) >= 2 and parts[0] in {"cap", "hero", "error", "common"}:
        return parts[1]
    return parts[-1] if parts else key


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


def load_en_messages() -> dict[str, str]:
    folder = MESSAGES / "en-US"
    merged: dict[str, str] = {}
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        stem = path.name
        if stem.endswith(".gen.json"):
            flat = flatten(data)
        else:
            ns = path.stem
            flat = flatten(data, ns if ns != "errors" else "error")
        merged.update(flat)
    return merged


def load_existing_status() -> dict[str, dict]:
    if not STATUS_PATH.is_file():
        return {}
    data = json.loads(STATUS_PATH.read_text(encoding="utf-8-sig"))
    out: dict[str, dict] = {}
    for k, v in data.items():
        if str(k).startswith("_"):
            continue
        if isinstance(v, dict):
            out[k] = v
        elif v is True:
            out[k] = {"reviewed": True}
        elif v is False:
            out[k] = {"reviewed": False, "reason": "legacy"}
    return out


def classify(key: str, value: str, existing: dict[str, dict]) -> dict:
    prev = existing.get(key) or {}
    if prev.get("reviewed") is True:
        return {"reviewed": True, "reason": prev.get("reason") or "manual"}

    reasons: list[str] = []
    if CJK_RE.search(value or ""):
        reasons.append("cjk")
    slug = guess_slug_from_key(key)
    if value == humanize_slug(slug) or value == humanize_slug(key.split(".")[-1]):
        # Only treat as humanize debt for catalog-ish keys
        if key.startswith(("cap.", "hero.")):
            reasons.append("humanize")

    if not reasons:
        # Hand-written common/error or curated seed — treat as reviewed unless marked false
        if prev.get("reviewed") is False:
            return {"reviewed": False, "reason": prev.get("reason") or "manual"}
        return {"reviewed": True, "reason": "clean"}

    return {
        "reviewed": False,
        "reason": "+".join(reasons),
        "value": value,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="BlockHub i18n EN quality")
    parser.add_argument("--write", action="store_true", help="Write meta status + report JSON")
    parser.add_argument(
        "--fail-on-cjk",
        action="store_true",
        help="Exit 1 when any en-US value still contains CJK",
    )
    parser.add_argument(
        "--fail-on-unreviewed",
        action="store_true",
        help="Exit 1 when any key is reviewed:false (strict; noisy for humanize debt)",
    )
    args = parser.parse_args()

    en = load_en_messages()
    existing = load_existing_status()
    status: dict[str, dict] = {}
    cjk_keys: list[str] = []
    humanize_keys: list[str] = []
    unreviewed: list[str] = []

    for key in sorted(en.keys()):
        entry = classify(key, en[key], existing)
        # Compact sidecar: only store unreviewed + explicit manual reviewed:true
        if entry.get("reviewed") is False:
            status[key] = {
                "reviewed": False,
                "reason": entry.get("reason") or "unreviewed",
            }
            unreviewed.append(key)
            reason = str(entry.get("reason") or "")
            if "cjk" in reason:
                cjk_keys.append(key)
            if "humanize" in reason:
                humanize_keys.append(key)
        elif (existing.get(key) or {}).get("reviewed") is True and (existing.get(key) or {}).get(
            "reason"
        ) == "manual":
            status[key] = {"reviewed": True, "reason": "manual"}
        # else: clean — omit from sidecar


    report = {
        "_generated_at": datetime.now(timezone.utc).isoformat(),
        "total_en_keys": len(en),
        "unreviewed": len(unreviewed),
        "cjk": len(cjk_keys),
        "humanize": len(humanize_keys),
        "cjk_keys": cjk_keys[:100],
        "humanize_sample": humanize_keys[:40],
    }

    print(f"  en-US keys: {len(en)}")
    print(f"  unreviewed: {len(unreviewed)} (cjk={len(cjk_keys)}, humanize={len(humanize_keys)})")
    if cjk_keys:
        print("WARN: en values with CJK:")
        for k in cjk_keys[:20]:
            print(f"  - {k}: {en[k][:60]!r}")
        if len(cjk_keys) > 20:
            print(f"  ... and {len(cjk_keys) - 20} more")
    if humanize_keys:
        print(f"WARN: {len(humanize_keys)} keys look like humanize(slug) (sample):")
        for k in humanize_keys[:12]:
            print(f"  - {k}: {en[k]!r}")

    if args.write:
        META.mkdir(parents=True, exist_ok=True)
        body = {
            "_comment": (
                "EN review status. Set reviewed:true after human approval. "
                "Regenerated by scripts/i18n_quality.py --write (preserves reviewed:true)."
            ),
            "_generated_at": report["_generated_at"],
            **status,
        }
        STATUS_PATH.write_text(json.dumps(body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {STATUS_PATH.relative_to(ROOT)}")
        print(f"wrote {REPORT_PATH.relative_to(ROOT)}")

    failed = False
    if args.fail_on_cjk and cjk_keys:
        failed = True
        print("ERROR: --fail-on-cjk and CJK still present in en-US")
    if args.fail_on_unreviewed and unreviewed:
        failed = True
        print("ERROR: --fail-on-unreviewed and unreviewed keys remain")

    if failed:
        print("i18n_quality FAILED")
        return 1
    print("OK i18n_quality")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
