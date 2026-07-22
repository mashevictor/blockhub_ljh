# -*- coding: utf-8 -*-
"""把 DeepSeek 医疗场景 JSON → med_scene_capabilities.py + home medScenes.ts。"""
from __future__ import annotations

import json
import pprint
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "scripts" / "_med_scenes_full_deepseek.json"
OUT_PY = ROOT / "backend" / "app" / "data" / "med_scene_capabilities.py"
OUT_TS = ROOT / "home" / "src" / "data" / "medScenes.ts"

ALLOWED = {
    "med_triage",
    "nurse_shift",
    "kb_document",
    "chat_qa",
    "policy_qa",
    "approval_flow",
    "approval_inbox",
    "notify_im",
    "leave_request",
    "asset_manage",
    "chart_dashboard",
    "data_nl_query",
    "erp_connector",
    "rbac_page",
    "site_patrol",
    "quality_inspect",
}

# 场景名 → 正确能力（含专业别名）
NAME_KEY_FIX = {
    "智能导诊": "med_triage",
    "AI预问诊": "med_triage",
    "症状预问诊": "med_triage",
    "急诊分诊": "med_triage",
    "ESI分诊": "med_triage",
    "导诊待办": "med_triage",
    "调班申请": "nurse_shift",
    "排班一览": "nurse_shift",
    "诊疗指南查询": "kb_document",
    "药品说明书问答": "chat_qa",
    "不良事件上报": "approval_flow",
    "会诊转诊申请": "approval_flow",
    "MDT会诊": "approval_flow",
    "医疗待办中心": "approval_inbox",
    "医疗问数": "data_nl_query",
    "HIS接口监控": "erp_connector",
    "数据脱敏权限申请": "rbac_page",
    "院感巡查登记": "site_patrol",
    "质控检查记录": "quality_inspect",
}

CAP_REMAP = {
    "notify_inapp": "notify_im",
    "kb": "kb_document",
    "approval": "approval_flow",
    "shift_attendance": "nurse_shift",
}

KIND_MAP = {
    "chat_kb": "chat_kb",
    "form_list": "understood",
    "chart": "oee",
    "notify": "integration",
    "integration": "integration",
}


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
    for s in raw.get("scenes") or []:
        name = str(s.get("name") or "").strip()
        if not name or name in seen:
            continue
        seen.add(name)
        ck = NAME_KEY_FIX.get(name) or str(s.get("capability_key") or "med_triage")
        ck = CAP_REMAP.get(ck, ck)
        if ck not in ALLOWED:
            ck = "med_triage"
        # 名称启发式纠偏
        if any(t in name for t in ("导诊", "分诊", "预问诊", "挂号", "ESI", "主诉", "过敏史", "红旗")):
            ck = "med_triage"
        elif any(t in name for t in ("调班", "排班", "夜班交接", "弹性班", "护理人力", "补位")):
            ck = "nurse_shift"
        elif name in {"请假联动"} or ("请假" in name and "护士" in name):
            ck = "leave_request"
        elif any(t in name for t in ("问数", "NL问数")):
            ck = "data_nl_query"
        elif any(t in name for t in ("HIS", "LIS", "PACS")):
            ck = "erp_connector"
        elif any(t in name for t in ("脱敏", "RBAC")) or name.endswith("权限"):
            ck = "rbac_page"
        elif any(t in name for t in ("院感巡", "巡查登记")):
            ck = "site_patrol"
        elif any(t in name for t in ("质控", "手卫生", "高警示药品")):
            ck = "quality_inspect"
        elif any(t in name for t in ("设备台账", "高值耗材", "灭菌包")):
            ck = "asset_manage"
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

    overview = str(raw.get("overview") or "").strip() or (
        "医疗健康深度包：导诊/排班走 med_triage·nurse_shift 真库；正式能力接真 API，空库空列表。"
    )
    highlights = list(raw.get("highlights") or []) or [
        "导诊工作台 · 预问诊/急诊/待办分场景",
        "护士调班真库闭环",
        "不良事件与会诊走审批流",
        "HIS 对接与知识库可装配",
    ]
    count = len(rows)
    body = pprint.pformat(rows, width=100, sort_dicts=False)
    py = f'''"""医疗健康行业场景 → 正式 capability 映射（SSOT）。

对齐销售包模式：每场景显式 capability_key + default_category + fields；
真 API：med_triage / nurse_shift / kb_document / approval_flow 等；禁止假 seed。
DeepSeek：scripts/gen_med_scenes_deepseek.py → apply_med_scenes_from_deepseek.py
"""

from __future__ import annotations

from typing import Any

_MED_SCENE_ROWS: list[dict[str, Any]] = {body}

MED_SCENE_COUNT = len(_MED_SCENE_ROWS)
assert MED_SCENE_COUNT >= 40, f"expected >=40 med scenes, got {{MED_SCENE_COUNT}}"

MED_SCENES_BY_NAME: dict[str, dict[str, Any]] = {{r["name"]: r for r in _MED_SCENE_ROWS}}

MED_OVERVIEW = {overview!r}
MED_HIGHLIGHTS = {pprint.pformat(highlights, width=100)}


def med_scene_names() -> list[str]:
    return [r["name"] for r in _MED_SCENE_ROWS]


def med_pack_scenes() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for r in _MED_SCENE_ROWS:
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
    row = MED_SCENES_BY_NAME.get(scene_name)
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
    row = MED_SCENES_BY_NAME.get(name)
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
                {{"label": "本日", "value": "—", "hint": "接真数据后刷新"}},
                {{"label": "床位", "value": "—", "hint": "—"}},
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
    print(f"wrote {OUT_PY} scenes={count}")

    import importlib.util

    spec = importlib.util.spec_from_file_location("med_scene_capabilities", OUT_PY)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    ts_items = []
    for i, r in enumerate(mod._MED_SCENE_ROWS, 1):
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

    header = f'''/** Auto-aligned with backend med_scene_capabilities ({count} med). Regenerate via scripts/apply_med_scenes_from_deepseek.py */
export type MedSceneSeed = {{
  id: string
  name: string
  category: string
  summary: string
  pages: string
  kind: string
  capabilityHint: string
  pageMock?: Record<string, unknown>
}}

export const MED_SCENE_SEEDS: MedSceneSeed[] = [
'''
    footer = """
]

export const MED_SCENE_NAMES = MED_SCENE_SEEDS.map((s) => s.name)
export const MED_SCENE_COUNT = MED_SCENE_SEEDS.length
"""
    OUT_TS.write_text(header + ",\n".join(ts_items) + "\n" + footer, encoding="utf-8")
    print(f"wrote {OUT_TS}")
    print("by category:", dict(Counter(r["category"] for r in rows)))
    print("by capability:", dict(Counter(r["capability_key"] for r in rows)))


if __name__ == "__main__":
    main()
