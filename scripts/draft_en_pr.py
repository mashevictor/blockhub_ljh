#!/usr/bin/env python3
"""Draft missing / bad EN translations into a PR-ready overlay (scheme D).

- Fills keys present in zh-CN but missing in en-US
- Optionally rewrites en CJK placeholders using glossary seeds
- Marks drafted keys reviewed:false in meta/en-review-status.json
- Never auto-merges; CI workflow opens a *draft* PR

Usage:
  python scripts/draft_en_pr.py              # dry-run report
  python scripts/draft_en_pr.py --write      # write draft overlay + status
  python scripts/draft_en_pr.py --write --open-pr   # also gh pr create --draft (needs gh)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MESSAGES = ROOT / "shared" / "i18n" / "messages"
SEED = ROOT / "shared" / "i18n" / "seed"
META = ROOT / "shared" / "i18n" / "meta"
DRAFT_DIR = ROOT / "shared" / "i18n" / "drafts"
DRAFT_PATH = DRAFT_DIR / "en-US.missing.json"
STATUS_PATH = META / "en-review-status.json"

CJK_RE = re.compile(r"[\u4e00-\u9fff]")
META_KEYS = {"_generated_by", "_do_not_edit", "_comment", "_schema", "_generated_at"}


def humanize_slug(slug: str) -> str:
    parts = re.split(r"[_\s.-]+", slug.strip())
    return " ".join(p[:1].upper() + p[1:] for p in parts if p)


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
    merged: dict[str, str] = {}
    for path in sorted(folder.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if path.name.endswith(".gen.json"):
            flat = flatten(data)
        else:
            ns = path.stem
            flat = flatten(data, ns if ns != "errors" else "error")
        merged.update(flat)
    return merged


def load_seed_map(name: str) -> dict[str, str]:
    path = SEED / name
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    out: dict[str, str] = {}
    for k, v in data.items():
        if str(k).startswith("_"):
            continue
        if isinstance(v, str):
            out[str(k)] = v
        elif isinstance(v, dict) and isinstance(v.get("label"), str):
            out[str(k)] = v["label"]
    return out


def build_glossary() -> dict[str, str]:
    """Map message keys → preferred EN from seeds (never AI runtime)."""
    gloss: dict[str, str] = {}
    for key, name in load_seed_map("capability.en-US.json").items():
        gloss[f"cap.{key}.name"] = name
    for key, label in load_seed_map("hero.en-US.json").items():
        gloss[f"hero.{key}.label"] = label
    for zh_cat, en_cat in load_seed_map("category.en-US.json").items():
        # category messages use English already in gen; keep as helper only
        gloss[f"category::{zh_cat}"] = en_cat

    copy_path = SEED / "hero-copy.en-US.json"
    if copy_path.is_file():
        data = json.loads(copy_path.read_text(encoding="utf-8-sig"))
        for pid, obj in data.items():
            if str(pid).startswith("_") or not isinstance(obj, dict):
                continue
            if isinstance(obj.get("hint"), str):
                gloss[f"hero.{pid}.hint"] = obj["hint"]
            if isinstance(obj.get("prompt"), str):
                gloss[f"hero.{pid}.prompt"] = obj["prompt"]
            if isinstance(obj.get("role"), str):
                gloss[f"hero.{pid}.role"] = obj["role"]
            flows = obj.get("flow_lines")
            if isinstance(flows, list):
                for i, line in enumerate(flows):
                    if isinstance(line, str):
                        gloss[f"hero.{pid}.flow.{i}"] = line

    # hand-written errors / common already bilingual — no glossary needed
    return gloss


def suggest_en(key: str, zh_value: str, glossary: dict[str, str]) -> tuple[str, str]:
    if key in glossary and glossary[key] and not CJK_RE.search(glossary[key]):
        return glossary[key], "glossary"
    parts = key.split(".")
    if len(parts) >= 2 and parts[0] == "cap":
        return humanize_slug(parts[1]), "humanize"
    if len(parts) >= 2 and parts[0] == "hero":
        return humanize_slug(parts[1]), "humanize"
    # last resort: keep zh (will be flagged CJK) or humanize last segment
    return humanize_slug(parts[-1] if parts else key), "humanize"


def load_status() -> dict:
    if not STATUS_PATH.is_file():
        return {}
    return json.loads(STATUS_PATH.read_text(encoding="utf-8-sig"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Draft missing EN i18n keys")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--open-pr", action="store_true", help="gh pr create --draft after write")
    parser.add_argument("--fix-cjk", action="store_true", help="Also draft replacements for en CJK values")
    args = parser.parse_args()

    zh = load_locale("zh-CN")
    en = load_locale("en-US")
    glossary = build_glossary()

    missing = sorted(set(zh) - set(en))
    cjk_fix: list[str] = []
    if args.fix_cjk:
        cjk_fix = sorted(k for k, v in en.items() if CJK_RE.search(v or ""))

    drafts: dict[str, dict] = {}
    for key in missing:
        text, source = suggest_en(key, zh.get(key, ""), glossary)
        drafts[key] = {
            "en": text,
            "zh": zh.get(key, ""),
            "source": source,
            "reviewed": False,
        }
    for key in cjk_fix:
        text, source = suggest_en(key, zh.get(key, en.get(key, "")), glossary)
        if text == en.get(key):
            continue
        drafts[key] = {
            "en": text,
            "zh": zh.get(key, ""),
            "source": source,
            "reviewed": False,
            "replaced_cjk": en.get(key),
        }

    print(f"  missing en keys: {len(missing)}")
    print(f"  cjk to fix: {len(cjk_fix)}")
    print(f"  draft entries: {len(drafts)}")
    for key in list(drafts)[:15]:
        d = drafts[key]
        print(f"  + {key}: {d['en']!r} ({d['source']})")
    if len(drafts) > 15:
        print(f"  ... and {len(drafts) - 15} more")

    if not args.write:
        print("dry-run only (pass --write to materialize)")
        return 0

    DRAFT_DIR.mkdir(parents=True, exist_ok=True)
    META.mkdir(parents=True, exist_ok=True)

    draft_body = {
        "_comment": (
            "Draft EN overlays from draft_en_pr.py. Review, then merge into "
            "hand-written JSON / seed / locales. Do NOT treat as SSOT. reviewed:false."
        ),
        "_generated_at": datetime.now(timezone.utc).isoformat(),
        "_do_not_auto_merge": True,
        "entries": drafts,
    }
    DRAFT_PATH.write_text(json.dumps(draft_body, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {DRAFT_PATH.relative_to(ROOT)}")

    # Apply missing keys into a hand-mergeable stub under drafts only;
    # also stamp review status.
    status = load_status()
    status["_comment"] = (
        "EN review status. Drafted keys are reviewed:false until human sets true."
    )
    status["_generated_at"] = draft_body["_generated_at"]
    for key, d in drafts.items():
        status[key] = {
            "reviewed": False,
            "reason": f"draft:{d['source']}",
        }
    STATUS_PATH.write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {STATUS_PATH.relative_to(ROOT)}")

    # Optionally write a summary markdown for the PR body
    summary = DRAFT_DIR / "PR_BODY.md"
    lines = [
        "## i18n draft EN",
        "",
        "Automated **draft** translations for missing / CJK English keys.",
        "",
        "- **Do not auto-merge**",
        "- Glossary seeds preferred; else humanize(slug) with `reviewed: false`",
        "- Review `shared/i18n/drafts/en-US.missing.json`, promote into seed / hand JSON, then re-run codegen",
        "",
        f"- Missing keys drafted: **{len(missing)}**",
        f"- CJK replacements: **{len([k for k,v in drafts.items() if 'replaced_cjk' in v])}**",
        "",
        "### Sample",
        "",
    ]
    for key in list(drafts)[:30]:
        lines.append(f"- `{key}` → {drafts[key]['en']} _(source: {drafts[key]['source']})_")
    summary.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {summary.relative_to(ROOT)}")

    if args.open_pr:
        return open_draft_pr(summary)

    return 0


def open_draft_pr(summary: Path) -> int:
    """Create draft PR via gh. Fails soft if gh unavailable."""
    if not drafts_have_changes():
        print("No git changes for draft PR")
        return 0
    try:
        subprocess.run(["gh", "--version"], check=True, capture_output=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("WARN: gh not available — skip --open-pr")
        return 0

    branch = f"chore/i18n-draft-en-{datetime.now(timezone.utc).strftime('%Y%m%d')}"
    body = summary.read_text(encoding="utf-8")
    cmds = [
        ["git", "checkout", "-B", branch],
        ["git", "add", "shared/i18n/drafts", "shared/i18n/meta"],
        ["git", "commit", "-m", "chore(i18n): draft missing EN translations (reviewed:false)"],
        ["git", "push", "-u", "origin", "HEAD"],
        [
            "gh",
            "pr",
            "create",
            "--draft",
            "--title",
            "chore(i18n): draft missing EN translations",
            "--body",
            body,
        ],
    ]
    for cmd in cmds:
        print(">", " ".join(cmd[:6]), "..." if len(cmd) > 6 else "")
        try:
            subprocess.run(cmd, cwd=ROOT, check=True)
        except subprocess.CalledProcessError as exc:
            print(f"WARN: command failed ({exc.returncode}): {cmd[0]}")
            return 0
    print("OK draft PR opened (no auto-merge)")
    return 0


def drafts_have_changes() -> bool:
    try:
        r = subprocess.run(
            ["git", "status", "--porcelain", "--", "shared/i18n/drafts", "shared/i18n/meta"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return bool(r.stdout.strip())
    except (FileNotFoundError, subprocess.CalledProcessError):
        return True


if __name__ == "__main__":
    raise SystemExit(main())
