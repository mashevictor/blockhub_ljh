#!/usr/bin/env python3
"""1000 条随机文本 · 意图理解/关键词匹配批量评估。

运行:
  python backend/scripts/eval_suggest_1000.py
  python backend/scripts/eval_suggest_1000.py --with-llm --llm-sample 50
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.config import settings  # noqa: E402
from app.data.suggest_eval_1000 import EVAL_CASES_1000  # noqa: E402
from app.services.intent_agent import analyze_intent  # noqa: E402
from app.services.keyword_match import match_modules_keyword  # noqa: E402
from app.services.module_suggest import suggest_modules  # noqa: E402


def _keys(items: list[dict]) -> list[str]:
    return [x["key"] for x in items]


def _hit(case: dict, keys: list[str]) -> bool:
    if case.get("expect_empty"):
        return len(keys) == 0
    if case.get("expect_status"):
        return True
    expect_any: list[str] = case.get("expect_any") or []
    forbid: list[str] = case.get("forbid") or []
    if not expect_any:
        return len(keys) > 0
    hit = any(
        exp in keys or any(k.startswith(exp.rstrip("_")) for k in keys)
        for exp in expect_any
    )
    bad = any(f in keys[:5] for f in forbid)
    return hit and not bad


def _status_ok(case: dict, validation: dict | None) -> bool:
    expect_status = case.get("expect_status")
    if not expect_status:
        return True
    status = (validation or {}).get("status", "")
    return status == expect_status


def eval_keyword(case: dict) -> dict:
    items = match_modules_keyword(case["input"])
    keys = _keys(items)
    return {
        "pass": _hit(case, keys),
        "keys": keys[:5],
        "top_score": items[0]["score"] if items else 0,
        "count": len(items),
    }


def eval_intent_rules(case: dict) -> dict:
    """意图 Agent 规则层（不发起 DeepSeek HTTP）。"""
    with patch.object(settings, "deepseek_api_key", ""):
        parsed = analyze_intent(case["input"])
    status = (parsed or {}).get("status")
    items = match_modules_keyword(case["input"])
    keys = _keys(items)

    if case.get("expect_empty"):
        ok = len(keys) == 0 and (status in (None, "unclear") or parsed is None)
    elif case.get("expect_status") == "invalid":
        ok = status == "invalid" or (status != "invalid" and not keys)
    elif case.get("expect_status") == "unclear":
        ok = status in ("unclear", None) or len(keys) > 0
    else:
        ok = _hit(case, keys) and status != "invalid"

    return {
        "pass": ok,
        "status": status,
        "keys": keys[:5],
        "count": len(items),
    }


def eval_pipeline(case: dict, *, force_llm: bool, use_intent_agent: bool) -> dict:
    result = suggest_modules(
        case["input"],
        force_llm=force_llm,
        use_intent_agent=use_intent_agent,
    )
    items = result.get("items") or []
    keys = _keys(items)
    validation = result.get("validation")
    status = (validation or {}).get("status")
    keyword_pass = _hit(case, keys)
    status_pass = _status_ok(case, validation)
    invalid_blocked = case.get("expect_status") != "invalid" and status == "invalid" and not keyword_pass
    return {
        "pass": keyword_pass and status_pass and not invalid_blocked,
        "keyword_pass": keyword_pass,
        "status_pass": status_pass,
        "invalid_blocked": invalid_blocked,
        "keys": keys[:5],
        "status": status,
        "confidence": result.get("confidence", 0),
        "used_llm": result.get("used_llm", False),
        "count": len(items),
    }


def _pct(n: int, total: int) -> str:
    return f"{n}/{total} ({100 * n / total:.1f}%)" if total else "0/0"


def main() -> int:
    parser = argparse.ArgumentParser(description="1000 条意图/关键词批量评估")
    parser.add_argument("--with-llm", action="store_true", help="额外抽样跑 DeepSeek 全链路")
    parser.add_argument("--llm-sample", type=int, default=30, help="LLM 抽样条数")
    parser.add_argument("--force-llm", action="store_true", help="全链路评估时 force_llm=True")
    args = parser.parse_args()

    cases = EVAL_CASES_1000
    t0 = time.perf_counter()

    kw_results = [eval_keyword(c) for c in cases]
    kw_pass = sum(1 for r in kw_results if r["pass"])
    kw_empty = sum(1 for r in kw_results if r["count"] == 0)

    # 意图规则层：关闭 DeepSeek HTTP，只测关键词 + invalid/unclear/rescue
    intent_results = [eval_intent_rules(c) for c in cases]
    intent_pass = sum(1 for r in intent_results if r["pass"])
    intent_invalid = sum(1 for r in intent_results if r["status"] == "invalid")

    pipe_results = intent_results  # 全链路本地 ≡ 关键词 + 意图规则
    pipe_pass = intent_pass
    pipe_invalid = sum(
        1 for case, ir, kr in zip(cases, intent_results, kw_results)
        if ir["status"] == "invalid" and kr["pass"] and not case.get("expect_status") == "invalid"
    )

    by_cat: dict[str, list[bool]] = defaultdict(list)
    for case, kr in zip(cases, kw_results):
        by_cat[case.get("category", "other")].append(kr["pass"])

    failures = [
        {
            "input": case["input"],
            "category": case.get("category"),
            "expect_any": case.get("expect_any"),
            "expect_status": case.get("expect_status"),
            "got_kw": kr["keys"],
            "got_pipe": pr["keys"],
            "pipe_status": pr.get("status"),
        }
        for case, kr, pr in zip(cases, kw_results, pipe_results)
        if not kr["pass"] or not pr["pass"]
    ]

    llm_report: dict | None = None
    if args.with_llm and settings.deepseek_api_key:
        import random
        random.seed(99)
        sample = random.sample(cases, min(args.llm_sample, len(cases)))
        llm_results = [
            eval_pipeline(c, force_llm=args.force_llm, use_intent_agent=True)
            for c in sample
        ]
        llm_pass = sum(1 for r in llm_results if r["pass"])
        llm_report = {
            "sample_size": len(sample),
            "passed": llm_pass,
            "used_llm_count": sum(1 for r in llm_results if r["used_llm"]),
        }

    elapsed = time.perf_counter() - t0

    print("\n=== 意图理解 · 1000 条批量评估 ===\n")
    print(f"DeepSeek Key: {'已配置' if settings.deepseek_api_key else '未配置（全链路走关键词+规则）'}")
    print(f"耗时: {elapsed:.2f}s\n")

    print("--- 关键词引擎 (match_modules_keyword) ---")
    print(f"  通过: {_pct(kw_pass, len(cases))}")
    print(f"  零匹配: {_pct(kw_empty, len(cases))}")

    print("\n--- 意图规则层 (analyze_intent, 无 HTTP) ---")
    print(f"  通过: {_pct(intent_pass, len(cases))}")
    print(f"  判 invalid: {_pct(intent_invalid, len(cases))}")
    print(f"  误拦截(有行业关键词仍 invalid): {_pct(pipe_invalid, len(cases))}")

    print("\n--- 分类型关键词通过率 ---")
    for cat in sorted(by_cat.keys()):
        arr = by_cat[cat]
        print(f"  {cat}: {_pct(sum(arr), len(arr))}")

    game_cases = [c for c in cases if c.get("category") == "game" or c.get("planted_industry") == "game"]
    game_kw = sum(
        1 for c in cases
        if (c.get("planted_industry") == "game" or "game" in (c.get("expect_any") or []))
        and _hit(c, _keys(match_modules_keyword(c["input"])))
    )
    game_total = sum(
        1 for c in cases
        if c.get("planted_industry") == "game" or "game" in (c.get("expect_any") or [])
    )
    print(f"\n--- 游戏相关 ---")
    print(f"  关键词命中: {_pct(game_kw, game_total)}")

    if failures:
        print(f"\n--- 未通过样本（前 25 条）---")
        for f in failures[:25]:
            print(f"  [{f['category']}] {f['input'][:56]}")
            print(f"    期望: {f.get('expect_any') or f.get('expect_status')}")
            print(f"    关键词: {f['got_kw']}  全链路: {f['got_pipe']} status={f['pipe_status']}")
        if len(failures) > 25:
            print(f"  ... 另有 {len(failures) - 25} 条")

    if llm_report:
        print(f"\n--- DeepSeek 抽样 ({llm_report['sample_size']} 条) ---")
        print(f"  通过: {_pct(llm_report['passed'], llm_report['sample_size'])}")
        print(f"  触发 LLM: {llm_report['used_llm_count']}")

    report = {
        "total": len(cases),
        "keyword_passed": kw_pass,
        "intent_rules_passed": intent_pass,
        "pipeline_passed": pipe_pass,
        "pipeline_invalid_blocked": pipe_invalid,
        "intent_invalid_count": intent_invalid,
        "keyword_empty": kw_empty,
        "elapsed_sec": round(elapsed, 2),
        "deepseek_configured": bool(settings.deepseek_api_key),
        "by_category": {k: {"pass": sum(v), "total": len(v)} for k, v in by_cat.items()},
        "game_hit": {"pass": game_kw, "total": game_total},
        "failures": failures[:100],
        "llm_sample": llm_report,
    }
    out = ROOT / "scripts" / "eval_suggest_1000_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n报告已写入: {out}")

    return 0 if kw_pass >= 950 and pipe_pass >= 930 else 1


if __name__ == "__main__":
    raise SystemExit(main())
