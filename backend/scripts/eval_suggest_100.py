#!/usr/bin/env python3
"""评估 100 场景模块推荐：关键词 + DeepSeek 补全。运行: python backend/scripts/eval_suggest_100.py"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.config import settings  # noqa: E402
from app.data.suggest_eval_cases import EVAL_CASES  # noqa: E402
from app.services.module_suggest import suggest_modules  # noqa: E402


def classify_case(case: dict, result: dict, keys_all: list[str]) -> str:
    """registry=能力库已覆盖 | supplement=需 custom_ 补全入库 | design=需产品设计新模块"""
    custom_keys = [k for k in keys_all if k.startswith("custom_")]
    if custom_keys:
        return "supplement"
    if result.get("used_llm") and not keys_all:
        return "design"
    if case.get("llm_only") and not custom_keys and not result.get("used_llm"):
        return "design"
    return "registry"


def eval_case(case: dict) -> dict:
    text = case["input"]
    result = suggest_modules(text, force_llm=False)
    keys_top5 = [x["key"] for x in result["items"][:5]]
    keys_all = [x["key"] for x in result["items"]]

    expect_any: list[str] = case.get("expect_any") or []
    forbid: list[str] = case.get("forbid") or []
    allow_supplement = case.get("allow_supplement", False)

    hit = False
    for exp in expect_any:
        if exp.endswith("_"):
            if any(k.startswith(exp.rstrip("_")) for k in keys_all):
                hit = True
                break
        elif exp in keys_top5 or exp in keys_all:
            hit = True
            break

    if not hit and allow_supplement and not case.get("llm_only"):
        hit = any(keys_all)

    if not hit and case.get("llm_only") and allow_supplement:
        hit = result.get("used_llm") and any(k.startswith("custom_") for k in keys_all)

    bad = [f for f in forbid if f in keys_top5]
    action = classify_case(case, result, keys_all)

    return {
        "input": text,
        "pass": hit and not bad,
        "hit": hit,
        "bad": bad,
        "got": keys_top5,
        "used_llm": result.get("used_llm", False),
        "supplemented": result.get("supplemented", []),
        "top_score": result.get("top_score", 0),
        "confidence": result.get("confidence", 0),
        "action": action,
        "llm_only": case.get("llm_only", False),
    }


def main() -> int:
    has_key = bool(settings.deepseek_api_key)
    results = [eval_case(c) for c in EVAL_CASES]
    passed = sum(1 for r in results if r["pass"])
    keyword_only = [c for c in EVAL_CASES if not c.get("llm_only")]
    kw_results = [r for r, c in zip(results, EVAL_CASES) if not c.get("llm_only")]
    kw_passed = sum(1 for r in kw_results if r["pass"])
    llm_cases = [c for c in EVAL_CASES if c.get("llm_only")]
    llm_results = [r for r, c in zip(results, EVAL_CASES) if c.get("llm_only")]
    llm_passed = sum(1 for r in llm_results if r["pass"])
    llm_used = sum(1 for r in results if r["used_llm"])

    by_action: dict[str, list] = {"registry": [], "supplement": [], "design": []}
    for r in results:
        by_action[r["action"]].append(r)

    failed = [r for r in results if not r["pass"]]

    print("\n=== 模块推荐 100 场景评估 ===\n")
    print(f"DeepSeek Key: {'已配置' if has_key else '未配置'}")
    print(f"总通过: {passed}/100")
    print(f"关键词引擎(非LLM用例): {kw_passed}/{len(keyword_only)}")
    print(f"DeepSeek 用例: {llm_passed}/{len(llm_cases)}")
    print(f"触发 DeepSeek 次数: {llm_used}/100\n")
    print("--- 能力处置建议 ---")
    print(f"  能力库已覆盖 (registry): {len(by_action['registry'])} 条")
    print(f"  需 custom_ 补全入库 (supplement): {len(by_action['supplement'])} 条")
    print(f"  需产品设计/新模块 (design): {len(by_action['design'])} 条\n")

    if by_action["supplement"]:
        print("--- 建议入库的 custom_ 能力（样本）---")
        seen: set[str] = set()
        for r in by_action["supplement"][:12]:
            for sup in r.get("supplemented") or []:
                k = sup.get("key", "")
                if k and k not in seen:
                    seen.add(k)
                    print(f"  {k}: {sup.get('label', '')} · {sup.get('reason', '')[:40]}")

    if failed:
        print("\n--- 未通过场景 ---")
        for r in failed[:20]:
            print(f"  FAIL {r['input'][:48]}")
            print(f"    得到: {r['got']}  llm={r['used_llm']}  action={r['action']}")
        if len(failed) > 20:
            print(f"  ... 另有 {len(failed) - 20} 条")

    report = {
        "passed": passed,
        "total": 100,
        "kw_passed": kw_passed,
        "llm_passed": llm_passed,
        "llm_used_count": llm_used,
        "deepseek_configured": has_key,
        "by_action": {k: len(v) for k, v in by_action.items()},
        "failed": failed,
        "supplement_samples": [
            sup for r in by_action["supplement"]
            for sup in (r.get("supplemented") or [])
        ][:30],
    }
    out = ROOT / "scripts" / "eval_suggest_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n报告已写入: {out}")
    return 0 if passed >= 90 else 1


if __name__ == "__main__":
    raise SystemExit(main())
