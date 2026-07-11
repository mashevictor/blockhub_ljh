#!/usr/bin/env python3
"""Generate realistic B2B order flow case via DeepSeek."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

SYSTEM = """你是资深 B2B 企业软件/AI Agent 平台售前顾问，熟悉中国企业 10万-500万 软件采购全流程。
请基于一个真实可发生的案例，输出严格 JSON，不要空话，不要营销话术。
产品背景：积木仓 BlockHub — PaaS 低代码 AI 智能体平台，面向制造业/销售/医疗等行业，支持 SaaS 与私有化，官网有行业页、能力目录、Demo 预约。

必须批判性回答：官网「千人千面」在 B2B 场景下什么能落地、什么是扯淡。

JSON 结构：
{
  "case_background": {
    "company": "",
    "industry": "",
    "trigger_event": "",
    "budget_range": "",
    "timeline_weeks": 0,
    "buying_committee": [{"role": "", "name_title": "", "priority": "", "real_concern": ""}]
  },
  "anti_patterns": ["原流程图里不真实的环节"],
  "realistic_alternative_to_personalization": "",
  "stages": [
    {
      "stage_id": "S1",
      "name": "",
      "duration": "",
      "trigger": "",
      "internal_activities": [],
      "vendor_activities": [],
      "stall_risks": [],
      "website_must_have": [
        {
          "asset": "",
          "format": "",
          "audience": "",
          "why_needed": "",
          "feasible_implementation": ""
        }
      ],
      "website_nice_to_have": [],
      "crm_signals": "",
      "exit_criteria": ""
    }
  ],
  "sample_order_timeline": [{"week": 0, "milestone": "", "owner_side": "", "website_touchpoint": ""}],
  "implementation_priority": [{"rank": 1, "item": "", "effort": "", "impact": ""}]
}

要求 stages 至少 8 个，覆盖从问题触发到回款。
每个 website_must_have 的 feasible_implementation 必须说具体怎么做（静态行业页+UTM 专属链接，而非 AI 实时千人千面）。"""

USER = """请构造一个具体案例：
- 某中型制造企业（800人），销售总监看到竞品在用 AI 外呼+CRM 联动，触发采购
- 预算 80-120 万，需走 IT 安全评审 + 采购招标或三家比价
- Champion 是销售运营经理，经济买家是 VP Sales，IT 是信息安全部，采购是集团采购中心
- 最终签约 SaaS+部分私有化模块，POC 失败过一次后换场景成功

输出完整 JSON。"""


def main() -> None:
    result = deepseek_json_chat(SYSTEM, USER, temperature=0.3)
    if not result:
        print("DEEPSEEK_FAILED", file=sys.stderr)
        sys.exit(1)
    out = ROOT / "docs" / "previews" / "realistic-order-flow-deepseek.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
