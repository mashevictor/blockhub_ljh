#!/usr/bin/env python3
"""Minimal smoke for @blockhub/i18n catalog files + resolve helpers (no Node)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.capability_registry import ALL_CAPABILITIES  # noqa: E402
from app.services.i18n_resolve import pick_label  # noqa: E402


def main() -> int:
    en_cap = json.loads(
        (ROOT / "shared/i18n/messages/en-US/capability.gen.json").read_text(encoding="utf-8")
    )
    assert en_cap["cap.leave_request.name"] == "Leave Request", en_cap["cap.leave_request.name"]
    zh_cap = json.loads(
        (ROOT / "shared/i18n/messages/zh-CN/capability.gen.json").read_text(encoding="utf-8")
    )
    assert zh_cap["cap.leave_request.name"] == "请假审批"

    labels = ALL_CAPABILITIES["leave_request"].resolved_labels()
    assert pick_label(labels, "en-US") == "Leave Request"
    assert pick_label(labels, "zh") == "请假审批"

    hero_en = json.loads(
        (ROOT / "shared/i18n/messages/en-US/hero.gen.json").read_text(encoding="utf-8")
    )
    assert hero_en["hero.s01.label"] == "Leave Request"
    print("OK smoke-i18n-p0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
