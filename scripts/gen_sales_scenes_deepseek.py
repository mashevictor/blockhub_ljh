# -*- coding: utf-8 -*-
"""DeepSeek 生成「销售特有」场景 — 禁止搬入通用办公场景。"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("DEEPSEEK_TIMEOUT", "120")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

OUT = ROOT / "scripts" / "_sales_scenes_full_deepseek.json"

# 销售包允许的正式能力（不含办公人事/IT/用印/待办等）
ALLOWED = [
    "sales_lead",
    "quote_contract",
    "chart_funnel",
    "ops_kpi",
    "chat_qa",
    "kb_document",
    "notify_im",
    "expense_claim",  # 仅样品/礼品/客户招待
    "site_patrol",    # 仅外勤拜访签到
    "erp_connector",  # 仅 CRM/Salesforce/纷享
    "campaign_ops",   # 仅会销/促销活动
    "data_nl_query",  # 仅销售问数
    "chart_dashboard",
]

# 明确禁止：通用办公同名或办公域场景
BANNED_NAMES = [
    "请假", "加班", "出差申请", "报销审批", "费用报销", "借款", "入职", "离职",
    "用印", "会议室", "考勤", "福利政策", "员工手册", "制度政策", "制度文档",
    "法务咨询", "合规制度", "审计", "待办中心", "已办", "代理审批", "超时催办",
    "通用审批", "多级会签", "条件分支", "审批统计", "审批效率", "审批提醒",
    "IT报障", "账号权限", "软件安装", "资产领用", "资产盘点", "VPN", "IT知识库",
    "对接OA", "对接HR", "对接SAP", "单点登录", "SSO", "公告推送", "新人onboarding",
    "内部FAQ", "最佳实践", "部门看板", "数据导出", "定时推送", "邮件/短信",
    "订阅消息", "差旅报销", "会议预约", "电子签章", "合同电子签章", "发票核验",
    "预算查询", "付款申请", "自然语言查数",  # 办公同名；销售用「销售问数」
    "数据双向同步", "Webhook入站", "字段映射配置",  # 办公集成泛化；销售写 CRM 专用名
]

CATEGORIES: list[tuple[str, str, int]] = [
    (
        "线索获客",
        "线索录入、线索分配、线索清洗、公海领取、线索评分、渠道来源、竞品线索、展会线索、转介绍、线索合并",
        8,
    ),
    (
        "客户跟进",
        "拜访纪要、电话跟进、下次行动、商机阶段、丢单原因、赢单复盘、客户画像、决策链、客户分级、跟进任务",
        8,
    ),
    (
        "商机报价",
        "新建商机、标准报价、特价折扣、方案报价、竞标报价、报价版本、商机预测、交叉销售、价格清单",
        8,
    ),
    (
        "合同回款",
        "销售合同审批、合同变更、回款计划、销售开票、客户对账、应收催收、履约节点、回款确认",
        8,
    ),
    (
        "销售赋能",
        "产品话术、竞品对比、成功案例库、解决方案库、销售FAQ、销售培训、产品演示预约、样品礼品申请",
        8,
    ),
    (
        "业绩分析",
        "销售漏斗、业绩排行、提成核算、区域销售、产品线分析、销售预测、销售问数、目标达成",
        8,
    ),
    (
        "外勤协同",
        "外勤签到、拜访路线、陪访登记、门店巡访、会销活动、商机到期提醒、客户招待申请、联合拜访",
        8,
    ),
    (
        "CRM对接",
        "对接Salesforce、对接纷享销客、对接销售易、CRM线索同步、CRM商机回写、企微销售提醒、钉钉销售提醒、飞书销售提醒",
        8,
    ),
]


def _banned(name: str) -> bool:
    n = name or ""
    return any(b in n for b in BANNED_NAMES)


def gen_category(category: str, hints: str, n: int) -> list[dict]:
    system = f"""你是 CapShip「销售行业」架构师。输出严格 JSON。
硬性边界：
1. 只写销售/CRM 特有场景，禁止搬入通用办公场景（请假报销用印会议室待办SSO/IT/人事等）。
2. 场景名禁止包含或等同：{", ".join(BANNED_NAMES[:40])}…
3. capability_key 只能从：{", ".join(ALLOWED)}
4. 不要用 approval_flow / approval_inbox / seal_request / meeting_booking / rbac_page / leave_request。
5. 合同相关请用「销售合同审批」等销售前缀名，不要用办公同名「合同审批」。
6. 恰好 {n} 条，name 短、互不重复；page_kind：form_list|chat_kb|chart|notify|integration|files
7. form_list 给 2～4 fields；禁止假 seed。
"""
    user = f"""大类：{category}
覆盖提示：{hints}

输出：
{{
  "scenes": [
    {{
      "name": "销售特有场景短名",
      "category": "{category}",
      "capability_key": "...",
      "pages": "form+list|chat+kb|chart|notify|kb|integration|chart_funnel|approval+form",
      "problem": "一句话",
      "page_kind": "...",
      "default_category": "英文slug",
      "form_headline": "标题",
      "fields": [{{"key":"","label":"","type":"text|number|date|textarea","placeholder":"","optional":false}}]
    }}
  ]
}}
恰好 {n} 条；category 固定为「{category}」。
"""
    r = deepseek_json_chat(system, user, temperature=0.25)
    if not r:
        raise RuntimeError(f"DeepSeek failed: {category}")
    scenes = []
    for s in r.get("scenes") or []:
        name = str(s.get("name") or "").strip()
        if not name or _banned(name):
            continue
        ck = str(s.get("capability_key") or "")
        if ck not in ALLOWED:
            pk = str(s.get("page_kind") or "")
            s["capability_key"] = {
                "chat_kb": "chat_qa",
                "chart": "ops_kpi",
                "notify": "notify_im",
                "integration": "erp_connector",
                "files": "kb_document",
            }.get(pk, "sales_lead")
        s["category"] = category
        s["name"] = name
        scenes.append(s)
    if len(scenes) < n:
        print(f"WARN {category}: kept {len(scenes)}/{n}", file=sys.stderr)
    return scenes[:n]


def main() -> None:
    overview = (
        "销售行业深度包只收录销售/CRM 特有场景（线索·跟进·报价·回款·赋能·漏斗·外勤·CRM），"
        "不搬用通用办公人事行政场景；正式能力接真 API，空库空列表。"
    )
    highlights = [
        "纯销售场景 · 不混办公审批人事",
        "线索到回款真库闭环",
        "漏斗与提成看板接真数据",
        "Salesforce / 纷享等 CRM 可对接",
    ]
    all_scenes: list[dict] = []
    seen: set[str] = set()
    for cat, hints, n in CATEGORIES:
        print(f"generating {cat} ×{n} …")
        batch = gen_category(cat, hints, n)
        for s in batch:
            name = str(s.get("name") or "").strip()
            if name in seen:
                continue
            if _banned(name):
                continue
            seen.add(name)
            all_scenes.append(s)
        print(f"  ok total={len(all_scenes)}")

    payload = {
        "overview": overview,
        "highlights": highlights,
        "categories": [c[0] for c in CATEGORIES],
        "scenes": all_scenes,
        "source": "deepseek_sales_only",
        "scene_count": len(all_scenes),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} scenes={len(all_scenes)}")
    from collections import Counter

    print("by category:", dict(Counter(s["category"] for s in all_scenes)))
    print("by capability:", dict(Counter(s["capability_key"] for s in all_scenes)))
    banned_hit = [s["name"] for s in all_scenes if _banned(s["name"])]
    print("banned_hit:", banned_hit)


if __name__ == "__main__":
    main()
