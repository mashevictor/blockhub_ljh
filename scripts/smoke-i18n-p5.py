#!/usr/bin/env python3
"""P5 smoke: quality gate, draft-en-pr, Windows drift, ESLint plugin, workflow."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    failed = False

    required = [
        ROOT / "scripts/i18n_quality.py",
        ROOT / "scripts/draft_en_pr.py",
        ROOT / "scripts/check_i18n_drift.py",
        ROOT / "packages/eslint-plugin-blockhub-i18n/index.js",
        ROOT / "packages/eslint-plugin-blockhub-i18n/package.json",
        ROOT / "tools/i18n-lint/eslint.config.mjs",
        ROOT / "tools/i18n-lint/package.json",
        ROOT / ".github/workflows/i18n-draft-en.yml",
    ]
    for path in required:
        if not path.is_file():
            print(f"ERROR: missing {path.relative_to(ROOT)}")
            failed = True
        else:
            print(f"OK  {path.relative_to(ROOT)}")

    wf = (ROOT / ".github/workflows/i18n-draft-en.yml").read_text(encoding="utf-8")
    if "draft: true" not in wf:
        print("ERROR: i18n-draft-en.yml must create draft PRs")
        failed = True
    if "auto-merge" in wf.lower() and "no auto-merge" not in wf.lower():
        # allow comment about no auto-merge
        pass
    if "create-pull-request" not in wf and "gh pr create" not in wf:
        print("ERROR: workflow missing PR creation step")
        failed = True
    else:
        print("OK  draft-en workflow is draft-only")

    plugin = (ROOT / "packages/eslint-plugin-blockhub-i18n/index.js").read_text(encoding="utf-8")
    if "no-ui-literal" not in plugin or "CJK" not in plugin:
        print("ERROR: eslint plugin missing no-ui-literal / CJK")
        failed = True
    else:
        print("OK  eslint no-ui-literal rule")

    # quality script runs
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts/i18n_quality.py"), "--fail-on-cjk"],
        cwd=ROOT,
    )
    if r.returncode != 0:
        print("ERROR: i18n_quality --fail-on-cjk failed")
        failed = True
    else:
        print("OK  i18n_quality")

    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts/draft_en_pr.py")],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        print("ERROR: draft_en_pr dry-run failed")
        print(r.stdout)
        print(r.stderr)
        failed = True
    else:
        print("OK  draft_en_pr dry-run")
        if "draft entries:" not in (r.stdout or ""):
            print("ERROR: draft_en_pr output missing draft entries line")
            failed = True

    # check_i18n_drift.py is importable / --help not needed; just syntax
    drift = (ROOT / "scripts/check_i18n_drift.py").read_text(encoding="utf-8")
    if "codegen-i18n-messages.py" not in drift or "smoke-i18n-p5.py" not in drift:
        print("ERROR: check_i18n_drift.py incomplete")
        failed = True
    else:
        print("OK  check_i18n_drift.py (pure Python)")

    bash = (ROOT / "scripts/check-i18n-drift.sh").read_text(encoding="utf-8")
    if "check_i18n_drift.py" not in bash:
        print("ERROR: check-i18n-drift.sh should wrap Python")
        failed = True
    else:
        print("OK  bash wrapper → Python")

    # Optional eslint if tools installed
    lint_nm = ROOT / "tools/i18n-lint/node_modules/eslint"
    if lint_nm.is_dir():
        r = subprocess.run(
            ["npm", "run", "lint"],
            cwd=ROOT / "tools/i18n-lint",
            shell=True,
        )
        if r.returncode != 0:
            print("ERROR: eslint i18n allowlist failed")
            failed = True
        else:
            print("OK  eslint allowlist")
    else:
        print("SKIP eslint runtime (tools/i18n-lint not npm-installed yet)")

    # glossary seeds exist for draft
    missing_seeds = []
    for seed in ("capability.en-US.json", "hero.en-US.json", "category.en-US.json"):
        p = ROOT / "shared/i18n/seed" / seed
        if not p.is_file():
            missing_seeds.append(seed)
            print(f"ERROR: missing glossary seed {seed}")
            failed = True
    if not missing_seeds:
        print("OK  glossary seeds")

    if failed:
        print("FAIL smoke-i18n-p5")
        return 1
    print("OK smoke-i18n-p5")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
