#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""小冒烟：finance_news 适配器空库语义 + demo 样本结构（不连库）。

用法:
  python scripts/smoke-finance-news.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.finance_news_adapters import (  # noqa: E402
    DemoAdapter,
    PublicCnAdapter,
    TushareAdapter,
    VERTICALS,
)


def main() -> int:
    fails: list[str] = []

    for v in sorted(VERTICALS):
        drafts = DemoAdapter().fetch(vertical=v)
        if not drafts:
            fails.append(f"{v} demo 空")
            continue
        if any(d.source != "demo" for d in drafts):
            fails.append(f"{v} demo source 非 demo")
        scopes = {d.scope for d in drafts}
        if not scopes & {"macro_cn", "macro_global", "micro"}:
            fails.append(f"{v} demo 缺分区 scope")

    # 无 token 应可读报错，不抛不可控异常
    try:
        TushareAdapter("").fetch(vertical="bank")
        fails.append("空 token 应报错")
    except RuntimeError as exc:
        if "Token" not in str(exc) and "token" not in str(exc).lower():
            fails.append(f"空 token 错误文案不清晰: {exc}")

    # PublicCn 可能因网络失败 — 允许 RuntimeError，但不得返回 demo 污染
    try:
        rows = PublicCnAdapter().fetch(vertical="bank", limit=5)
        if any(r.source == "demo" for r in rows):
            fails.append("public_cn 不应产出 demo")
        if rows and any(r.source != "public_cn" for r in rows):
            fails.append("public_cn source 标记错误")
        print(f"public_cn ok: {len(rows)} rows")
    except RuntimeError as exc:
        print(f"public_cn skipped (network/rate): {exc}")

    print("=== smoke-finance-news ===")
    if fails:
        print(f"FAIL ({len(fails)}):")
        for f in fails:
            print(f"  - {f}")
        return 1
    print("OK · demo adapters + empty-token guard")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
