#!/usr/bin/env python3
"""Windows-friendly i18n drift check (pure Python; no bash required).

Equivalent to scripts/check-i18n-drift.sh:
  1) regenerate *.gen.json
  2) fail if git diff dirty on gen files
  3) i18n:check + smoke P0–P5 + quality (CJK hard-fail)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GEN_PATHS = [
    "shared/i18n/messages/zh-CN/capability.gen.json",
    "shared/i18n/messages/en-US/capability.gen.json",
    "shared/i18n/messages/zh-CN/hero.gen.json",
    "shared/i18n/messages/en-US/hero.gen.json",
    "shared/i18n/messages/zh-CN/industry.gen.json",
    "shared/i18n/messages/en-US/industry.gen.json",
    "shared/i18n/messages/zh-CN/scene.gen.json",
    "shared/i18n/messages/en-US/scene.gen.json",
    "packages/blockhub_flutter_core/assets/i18n/zh-CN.json",
    "packages/blockhub_flutter_core/assets/i18n/en-US.json",
    "shared/i18n/flutter/zh_CN.arb",
    "shared/i18n/flutter/en_US.arb",
]

SMOKES = [
    "scripts/i18n_check.py",
    "scripts/i18n_quality.py",
    "scripts/check_i18n_namespace.py",
    "scripts/smoke-i18n-p0.py",
    "scripts/smoke-i18n-p2.py",
    "scripts/smoke-i18n-p3.py",
    "scripts/smoke-i18n-p4.py",
    "scripts/smoke-i18n-p5.py",
    "scripts/smoke-i18n-p6.py",
]


def pick_python() -> list[str]:
    candidates = [
        ROOT / "backend" / ".venv" / "Scripts" / "python.exe",
        ROOT / "backend" / ".venv" / "bin" / "python",
    ]
    for c in candidates:
        if c.is_file():
            return [str(c)]
    return [sys.executable]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    print(">", " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT, check=check, text=True)


def main() -> int:
    py = pick_python()
    print("==> regenerate i18n messages from registry + hero_presets")
    run([*py, "scripts/codegen-i18n-messages.py"])
    print("==> regenerate industry + scene catalogs")
    run([*py, "scripts/codegen-industry-scene-i18n.py"])
    print("==> regenerate Flutter ARB + core assets (同源)")
    run([*py, "scripts/codegen-flutter-arb.py"])

    # git diff on gen files
    try:
        diff = subprocess.run(
            ["git", "diff", "--quiet", "--", *GEN_PATHS],
            cwd=ROOT,
            check=False,
        )
        if diff.returncode != 0:
            print("ERROR: shared/i18n/messages/*.gen.json drift vs registry/hero_presets")
            print("  Run: python scripts/codegen-i18n-messages.py and commit outputs")
            subprocess.run(["git", "diff", "--stat", "--", *GEN_PATHS], cwd=ROOT, check=False)
            return 1
    except FileNotFoundError:
        print("WARN: no git — skip gen diff check")

    print("==> i18n:check + quality + smokes")
    for script in SMOKES:
        path = ROOT / script
        if not path.is_file():
            print(f"ERROR: missing {script}")
            return 1
        if script.endswith("i18n_quality.py"):
            run([*py, script, "--fail-on-cjk"])
        else:
            run([*py, script])

    print("OK i18n messages in sync + check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
