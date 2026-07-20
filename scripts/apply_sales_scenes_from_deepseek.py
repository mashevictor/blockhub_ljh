# -*- coding: utf-8 -*-
"""把 DeepSeek 销售特有场景 JSON → sales_scene_capabilities.py（剔除办公混入）。"""
from __future__ import annotations

import json
import pprint
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "_sales_scenes_full_deepseek.json"
OUT_PY = ROOT / "backend" / "app" / "data" / "sales_scene_capabilities.py"
OUT_TS = ROOT / "home" / "src" / "data" / "salesScenes66.ts"

ALLOWED = {
    "sales_lead",
    "quote_contract",
    "chart_funnel",
    "ops_kpi",
    "chat_qa",
    "kb_document",
    "notify_im",
    "expense_claim",
    "site_patrol",
    "erp_connector",
    "campaign_ops",
    "data_nl_query",
    "chart_dashboard",
}

# 办公域 / 与办公同名 — 一律剔除
BANNED_SUBSTR = [
    "请假", "加班", "出差申请", "报销审批", "费用报销", "借款", "入职", "离职",
    "用印", "会议室", "考勤", "福利政策", "员工手册", "制度政策", "制度文档",
    "法务咨询", "合规制度", "审计", "待办中心", "已办", "代理审批", "超时催办",
    "通用审批", "多级会签", "条件分支", "审批统计", "审批效率", "审批提醒",
    "IT报障", "账号权限", "软件安装", "资产领用", "资产盘点", "VPN", "IT知识库",
    "对接OA", "对接HR", "对接SAP", "单点登录", "SSO", "公告推送", "onboarding",
    "内部FAQ", "最佳实践", "部门看板", "数据导出", "定时推送", "邮件/短信",
    "订阅消息", "差旅报销", "会议预约", "电子签章", "发票核验", "预算查询",
    "付款申请", "自然语言查数", "数据双向同步", "Webhook", "字段映射",
    "企微/钉钉",  # 办公同名；销售用「企微销售提醒」等
]

# 场景名 → 销售正确能力
NAME_KEY_FIX = {
    "特价折扣审批": "quote_contract",
    "特价折扣": "quote_contract",
    "销售合同审批": "quote_contract",
    "合同变更": "quote_contract",
    "标准报价": "quote_contract",
    "方案报价": "quote_contract",
    "竞标报价": "quote_contract",
    "报价申请": "quote_contract",
    "报价版本": "quote_contract",
    "报价版本对比": "quote_contract",
    "销售开票": "quote_contract",
    "销售漏斗": "chart_funnel",
    "销售漏斗看板": "chart_funnel",
    "业绩排行": "ops_kpi",
    "提成核算": "ops_kpi",
    "区域销售": "ops_kpi",
    "区域销售分析": "ops_kpi",
    "产品线分析": "ops_kpi",
    "销售预测": "ops_kpi",
    "目标达成": "ops_kpi",
    "目标达成看板": "ops_kpi",
    "销售问数": "data_nl_query",
    "产品话术": "chat_qa",
    "产品话术问答": "chat_qa",
    "竞品对比": "chat_qa",
    "竞品对比问答": "chat_qa",
    "销售FAQ": "chat_qa",
    "成功案例库": "kb_document",
    "案例库": "kb_document",
    "解决方案库": "kb_document",
    "方案库": "kb_document",
    "样品礼品申请": "expense_claim",
    "客户招待申请": "expense_claim",
    "外勤签到": "site_patrol",
    "门店巡访": "site_patrol",
    "拜访路线": "site_patrol",
    "陪访登记": "site_patrol",
    "联合拜访": "site_patrol",
    "商机到期提醒": "notify_im",
    "企微销售提醒": "notify_im",
    "钉钉销售提醒": "notify_im",
    "飞书销售提醒": "notify_im",
    "对接Salesforce": "erp_connector",
    "对接纷享销客": "erp_connector",
    "对接销售易": "erp_connector",
    "CRM线索同步": "erp_connector",
    "CRM商机回写": "erp_connector",
    "会销活动": "campaign_ops",
    "产品演示预约": "meeting_booking",  # will remap — meeting not allowed
}

# 禁止落入销售包的能力 → 改映
CAP_REMAP = {
    "approval_flow": "quote_contract",
    "approval_inbox": "sales_lead",
    "seal_request": "quote_contract",
    "meeting_booking": "sales_lead",
    "rbac_page": "erp_connector",
    "leave_request": "sales_lead",
    "hire_onboard": "sales_lead",
    "policy_qa": "chat_qa",
    "it_ticket": "sales_lead",
    "asset_manage": "expense_claim",
    "member_loyalty": "campaign_ops",
    "notify_inapp": "notify_im",
}

KIND_MAP = {
    "chat_kb": "chat_kb",
    "form_list": "understood",
    "chart": "oee",
    "files": "bom",
    "approval": "understood",
    "notify": "integration",
    "integration": "integration",
}


def _banned(name: str) -> bool:
    return any(b in (name or "") for b in BANNED_SUBSTR)


def _norm_fields(fields: list | None) -> list[dict]:
    out = []
    for f in fields or []:
        if not isinstance(f, dict) or not f.get("label"):
            continue
        item = {
            "key": str(f.get("key") or "field").strip() or "field",
            "label": str(f["label"]).strip(),
            "placeholder": str(f.get("placeholder") or "").strip(),
        }
        if f.get("type") and str(f["type"]) not in {"text", ""}:
            item["type"] = str(f["type"])
        if f.get("optional"):
            item["optional"] = True
        out.append(item)
    return out


def main() -> None:
    raw = json.loads(SRC.read_text(encoding="utf-8"))
    rows: list[dict] = []
    seen: set[str] = set()
    dropped: list[str] = []
    for s in raw.get("scenes") or []:
        name = str(s.get("name") or "").strip()
        if not name or name in seen:
            continue
        if _banned(name):
            dropped.append(name)
            continue
        seen.add(name)
        ck = NAME_KEY_FIX.get(name) or str(s.get("capability_key") or "sales_lead")
        ck = CAP_REMAP.get(ck, ck)
        if ck not in ALLOWED:
            ck = "sales_lead"
        # 演示预约 → sales_lead（不引入 meeting_booking）
        if "演示" in name:
            ck = "sales_lead"
        row: dict = {
            "name": name,
            "category": str(s.get("category") or "其他").strip() or "其他",
            "capability_key": ck,
            "pages": str(s.get("pages") or "form+list").strip() or "form+list",
            "problem": str(s.get("problem") or name).strip(),
            "page_kind": str(s.get("page_kind") or "form_list").strip() or "form_list",
        }
        dc = str(s.get("default_category") or "").strip()
        if dc:
            row["default_category"] = dc
        fh = str(s.get("form_headline") or "").strip()
        if fh:
            row["form_headline"] = fh
        fields = _norm_fields(s.get("fields"))
        if fields and row["page_kind"] in {"form_list", "approval"}:
            row["fields"] = fields
        rows.append(row)

    overview = str(raw.get("overview") or "").strip()
    highlights = list(raw.get("highlights") or [])
    count = len(rows)

    body = pprint.pformat(rows, width=100, sort_dicts=False)
    py = f'''"""销售行业特有场景 → 正式 capability 映射（SSOT）。

只收录销售/CRM 场景，禁止混入通用办公人事行政/IT/用印/待办等。
策略：复用 Path-A 真 API + 差异化 fields；禁止假 seed。
DeepSeek 生成：scripts/gen_sales_scenes_deepseek.py → apply_sales_scenes_from_deepseek.py
"""

from __future__ import annotations

from typing import Any

_SALES_SCENE_ROWS: list[dict[str, Any]] = {body}

SALES_SCENE_COUNT = len(_SALES_SCENE_ROWS)
assert SALES_SCENE_COUNT >= 48, f"expected >=48 sales-only scenes, got {{SALES_SCENE_COUNT}}"

SALES_SCENES_BY_NAME: dict[str, dict[str, Any]] = {{r["name"]: r for r in _SALES_SCENE_ROWS}}

SALES_OVERVIEW = {overview!r}
SALES_HIGHLIGHTS = {pprint.pformat(highlights, width=100)}


def sales_scene_names() -> list[str]:
    return [r["name"] for r in _SALES_SCENE_ROWS]


def sales_pack_scenes() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for r in _SALES_SCENE_ROWS:
        out.append(
            {{
                "name": r["name"],
                "category": r["category"],
                "problem": str(r.get("problem") or r["name"]),
                "pages": str(r.get("pages") or "form"),
                "standard": "✓",
                "agent": str(r["capability_key"]),
            }}
        )
    return out


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str) -> dict[str, Any]:
    row = SALES_SCENES_BY_NAME.get(scene_name)
    if not row:
        return plan_item
    plan_item["capability_key"] = row["capability_key"]
    if row.get("default_category"):
        plan_item["default_category"] = row["default_category"]
    if row.get("form_headline"):
        plan_item["form_headline"] = row["form_headline"]
    if row.get("fields"):
        plan_item["form_fields"] = row["fields"]
    if row.get("page_kind"):
        plan_item["page_kind"] = row["page_kind"]
    return plan_item


def page_mock_for_scene(name: str) -> dict[str, Any] | None:
    row = SALES_SCENES_BY_NAME.get(name)
    if not row:
        return None
    kind = str(row.get("page_kind") or "form_list")
    if kind in {{"chat_kb", "files"}}:
        return {{
            "chat_title": f"{{name}}助手",
            "chat": [{{"role": "bot", "text": f"可就「{{name}}」提问；空库无文档时仅作引导。"}}],
            "files_title": "相关资料",
            "files": [f"{{name}}.md"],
            "primary_action": "发送",
        }}
    if kind == "chart":
        return {{
            "kpis": [
                {{"label": "本周", "value": "—", "hint": "接真数据后刷新"}},
                {{"label": "转化", "value": "—", "hint": "—"}},
                {{"label": name[:6], "value": "—", "hint": "—"}},
            ],
            "list_title": f"{{name}}趋势",
            "primary_action": "刷新数据",
        }}
    if kind in {{"notify", "integration"}} and not row.get("fields"):
        return {{
            "list_title": name,
            "list": [{{"id": "01", "title": f"{{name}}（空库无业务数据）", "status": "待配置"}}],
            "primary_action": "打开配置",
        }}
    fields = row.get("fields") or [
        {{"key": "title", "label": "标题", "placeholder": name}},
        {{"key": "note", "label": "说明", "placeholder": "", "optional": True}},
    ]
    return {{
        "form_title": str(row.get("form_headline") or f"新建 · {{name}}"),
        "fields": [
            {{
                **{{
                    "key": str(f.get("key") or ""),
                    "label": str(f["label"]),
                    "value": "",
                    "placeholder": str(f.get("placeholder") or ""),
                    "optional": bool(f.get("optional")),
                }},
                **({{"type": str(f["type"])}} if f.get("type") else {{}}),
            }}
            for f in fields
        ],
        "list_title": f"{{name}}记录",
        "list": [],
        "primary_action": "提交",
    }}
'''
    OUT_PY.write_text(py, encoding="utf-8")
    print(f"wrote {OUT_PY} scenes={count} dropped={dropped}")

    import importlib.util

    spec = importlib.util.spec_from_file_location("sales_scene_capabilities", OUT_PY)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    ts_items = []
    for i, r in enumerate(mod._SALES_SCENE_ROWS, 1):
        mock = mod.page_mock_for_scene(r["name"])
        kind = KIND_MAP.get(str(r.get("page_kind") or "form_list"), "understood")
        item = {
            "id": f"s{i}",
            "name": r["name"],
            "category": r["category"],
            "summary": r.get("problem") or r["name"],
            "pages": r.get("pages") or "form",
            "kind": kind,
            "capabilityHint": r["capability_key"],
        }
        if mock:
            item["pageMock"] = mock
        ts_items.append("  " + json.dumps(item, ensure_ascii=False))

    header = f'''/** Auto-aligned with backend sales_scene_capabilities ({count} sales-only). Regenerate via scripts/apply_sales_scenes_from_deepseek.py */
export type SalesSceneSeed = {{
  id: string
  name: string
  category: string
  summary: string
  pages: string
  kind: string
  capabilityHint: string
  pageMock?: Record<string, unknown>
}}

export const SALES_SCENE_SEEDS: SalesSceneSeed[] = [
'''
    footer = """
]

export const SALES_SCENE_NAMES = SALES_SCENE_SEEDS.map((s) => s.name)
export const SALES_SCENE_COUNT = SALES_SCENE_SEEDS.length
"""
    OUT_TS.write_text(header + ",\n".join(ts_items) + "\n" + footer, encoding="utf-8")
    print(f"wrote {OUT_TS}")
    print("by category:", dict(Counter(r["category"] for r in rows)))
    print("by capability:", dict(Counter(r["capability_key"] for r in rows)))


if __name__ == "__main__":
    main()
