"""对话改页 · 意图划分 + 可预见页面模板。

目标：乱七八糟口语也能落到：
1) Path-A 正式能力（优先）
2) 或 Path-B 带齐全字段的可填预览页（禁止空 chat_kb 弱壳）
"""

from __future__ import annotations

import hashlib
import re
from typing import Any

# 意图 → 默认可预见表单（未知能力时用；正式能力仍走 registry）
_IntentSpec = dict[str, Any]

_INTENT_PATTERNS: list[tuple[str, tuple[str, ...], _IntentSpec]] = [
    (
        "survey",
        ("问卷", "满意度", "调研", "反馈表", "NPS", "打分表", "满意度问卷"),
        {
            "label": "满意度问卷",
            "category": "运营调研",
            "page_kind": "form_list",
            "form_headline": "提交问卷",
            "fields": [
                {"key": "respondent", "label": "填写人", "placeholder": "姓名或客户名"},
                {"key": "score", "label": "评分(1-10)", "type": "number", "placeholder": "1-10"},
                {"key": "comment", "label": "意见建议", "type": "textarea", "placeholder": "可选", "optional": True},
            ],
            "primary_action": "提交问卷",
        },
    ),
    (
        "okr",
        ("OKR", "okr", "目标填报", "季度目标", "关键结果", "KPI填报"),
        {
            "label": "OKR 目标填报",
            "category": "目标管理",
            "page_kind": "form_list",
            "form_headline": "新建 OKR",
            "fields": [
                {"key": "period", "label": "周期", "placeholder": "如 2026Q3"},
                {"key": "objective", "label": "目标 O", "type": "textarea", "placeholder": "本季度目标"},
                {"key": "kr", "label": "关键结果 KR", "type": "textarea", "placeholder": "可衡量结果"},
                {"key": "owner", "label": "负责人", "placeholder": "姓名", "optional": True},
            ],
            "primary_action": "提交 OKR",
        },
    ),
    (
        "visitor",
        ("访客", "来访登记", "访客预约", "接待登记"),
        {
            "label": "访客预约登记",
            "category": "行政前台",
            "page_kind": "form_list",
            "form_headline": "访客预约",
            "fields": [
                {"key": "visitor_name", "label": "访客姓名", "placeholder": "姓名"},
                {"key": "company", "label": "来访单位", "placeholder": "公司名", "optional": True},
                {"key": "visit_at", "label": "来访时间", "type": "datetime", "placeholder": "到访时间"},
                {"key": "host", "label": "被访人", "placeholder": "对接员工"},
                {"key": "purpose", "label": "事由", "type": "textarea", "placeholder": "拜访目的", "optional": True},
            ],
            "primary_action": "提交预约",
        },
    ),
    (
        "parking",
        ("停车", "车位", "停车证", "临停"),
        {
            "label": "停车位申请",
            "category": "行政后勤",
            "page_kind": "form_list",
            "form_headline": "停车申请",
            "fields": [
                {"key": "plate", "label": "车牌号", "placeholder": "如 沪A12345"},
                {"key": "date", "label": "使用日期", "type": "date", "placeholder": "日期"},
                {"key": "duration", "label": "时段", "placeholder": "上午/全天"},
                {"key": "reason", "label": "事由", "type": "textarea", "optional": True},
            ],
            "primary_action": "提交申请",
        },
    ),
    (
        "express",
        ("快递", "收发", "寄件", "取件登记", "快递柜"),
        {
            "label": "快递收发登记",
            "category": "行政后勤",
            "page_kind": "form_list",
            "form_headline": "快递登记",
            "fields": [
                {"key": "direction", "label": "收/发", "placeholder": "收件或寄出"},
                {"key": "tracking", "label": "运单号", "placeholder": "快递单号"},
                {"key": "carrier", "label": "快递公司", "placeholder": "顺丰/菜鸟…", "optional": True},
                {"key": "owner", "label": "收件人/寄件人", "placeholder": "姓名"},
                {"key": "note", "label": "备注", "type": "textarea", "optional": True},
            ],
            "primary_action": "登记",
        },
    ),
    (
        "lottery",
        ("抽奖", "转盘", "摇奖", "抽签", "抽奖转盘"),
        {
            "label": "抽奖活动",
            "category": "活动运营",
            "page_kind": "form_list",
            "form_headline": "抽奖配置",
            "fields": [
                {"key": "activity", "label": "活动名称", "placeholder": "如年会抽奖"},
                {"key": "prizes", "label": "奖项列表", "type": "textarea", "placeholder": "一等奖、二等奖…"},
                {"key": "pool", "label": "参与名单", "type": "textarea", "placeholder": "姓名或工号，一行一个"},
            ],
            "primary_action": "保存配置",
            "ui_hint": "lottery_pad",
        },
    ),
    (
        "access_qr",
        ("门禁", "二维码通行", "通行码", "访客码", "门禁二维码", "通行二维码"),
        {
            "label": "通行二维码申请",
            "category": "行政后勤",
            "page_kind": "form_list",
            "form_headline": "通行码申请",
            "fields": [
                {"key": "area", "label": "区域", "placeholder": "如 3F 会议室"},
                {"key": "valid_from", "label": "生效时间", "type": "datetime"},
                {"key": "valid_to", "label": "失效时间", "type": "datetime"},
                {"key": "applicant", "label": "申请人", "placeholder": "姓名"},
            ],
            "primary_action": "申请通行码",
        },
    ),
    (
        "program_signup",
        ("节目报名", "年会报名", "演出报名", "才艺报名"),
        {
            "label": "节目报名",
            "category": "活动运营",
            "page_kind": "form_list",
            "form_headline": "节目报名",
            "fields": [
                {"key": "program", "label": "节目名称", "placeholder": "节目名"},
                {"key": "type", "label": "类型", "placeholder": "歌舞/小品/…"},
                {"key": "members", "label": "参演人员", "type": "textarea", "placeholder": "名单"},
                {"key": "duration", "label": "时长(分钟)", "type": "number", "optional": True},
            ],
            "primary_action": "提交报名",
        },
    ),
    (
        "supplier",
        ("供应商准入", "供应商评估", "供应商审核", "准入评估"),
        {
            "label": "供应商准入评估",
            "category": "采购供应链",
            "page_kind": "form_list",
            "form_headline": "准入评估",
            "fields": [
                {"key": "vendor", "label": "供应商名称", "placeholder": "公司全称"},
                {"key": "category", "label": "品类", "placeholder": "物资/服务"},
                {"key": "contact", "label": "联系人", "placeholder": "姓名电话"},
                {"key": "score", "label": "初评分数", "type": "number", "optional": True},
                {"key": "risk", "label": "风险说明", "type": "textarea", "optional": True},
            ],
            "primary_action": "提交评估",
        },
    ),
    (
        "nl_query",
        ("自然语言查", "问数", "查一下上周", "查审批量", "数据问询"),
        {
            "label": "智能问数",
            "category": "数据报表",
            "page_kind": "chart",
            "capability_hint": "data_nl_query",
            "form_headline": "提问",
            "fields": [
                {"key": "question", "label": "问题", "type": "textarea", "placeholder": "如：上周审批通过率？"},
            ],
            "primary_action": "查询",
        },
    ),
    (
        "generic_approval",
        ("审批流", "走审批", "随便.*审批", "通用审批", "加点.*审批"),
        {
            "label": "通用审批",
            "category": "流程审批",
            "page_kind": "approval",
            "capability_hint": "approval_flow",
            "form_headline": "提交审批",
            "fields": [
                {"key": "title", "label": "标题", "placeholder": "申请主题"},
                {"key": "detail", "label": "说明", "type": "textarea", "placeholder": "事由"},
                {"key": "amount", "label": "金额", "type": "number", "optional": True},
            ],
            "primary_action": "提交",
        },
    ),
]

# 口语碎片 → 正式能力（补 compose_edit 同义表未覆盖的乱口语）
_FRAG_TO_CAP: list[tuple[tuple[str, ...], str, str]] = [
    (("加班", "加班要", "要加班"), "leave_request", "加班申请"),
    (("出差", "出差申请"), "leave_request", "出差申请"),
    (("线索", "录线索", "客户线索", "获客"), "sales_lead", "线索录入"),
    (("公海", "领公海", "公海池"), "sales_lead", "公海领取"),
    (("丢单", "输单", "丢单原因"), "kill_pipeline", "丢单原因"),
    (("赢单", "成交证据", "赢单复盘"), "deal_evidence", "赢单复盘"),
    (("报价", "报价单", "出报价"), "quote_contract", "标准报价"),
    (("问数", "查数", "自然语言查"), "data_nl_query", "自然语言查数"),
]


def _slug_gen(label: str) -> str:
    raw = re.sub(r"[^\w\u4e00-\u9fff]+", "_", (label or "").strip(), flags=re.UNICODE)
    raw = raw.strip("_").lower()[:24] or "custom"
    if re.search(r"[\u4e00-\u9fff]", raw):
        h = abs(hash(label)) % 100000
        return f"gen_{h}"
    return f"gen_{raw}"


def match_fragment_capability(text: str) -> dict[str, str] | None:
    """乱口语碎片 → 正式能力 + 场景标签。"""
    t = (text or "").strip()
    if not t:
        return None
    for aliases, cap, label in _FRAG_TO_CAP:
        if any(a in t for a in aliases):
            return {"capability_key": cap, "label": label, "reason": f"碎片命中「{aliases[0]}」"}
    return None


def classify_compose_intent(text: str) -> dict[str, Any] | None:
    """划分用户意图；返回可预见模板（无命中则 None）。"""
    t = (text or "").strip()
    if not t:
        return None
    best: tuple[int, str, _IntentSpec] | None = None
    for intent_id, aliases, spec in _INTENT_PATTERNS:
        score = 0
        for a in aliases:
            if a.startswith("随便") or ".*" in a:
                if re.search(a, t):
                    score = max(score, 20 + len(a))
            elif a.lower() in t.lower() or a in t:
                score = max(score, 10 + len(a))
        if score and (best is None or score > best[0]):
            best = (score, intent_id, spec)
    if not best:
        return None
    _, intent_id, spec = best
    label = str(spec.get("label") or intent_id)
    # 用户原文里若有更具体短名，优先作 label
    m = re.search(
        r"(?:搞个|来个|做个|加个|加一个|要一个|来一个)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,16})",
        t,
    )
    if m:
        label = m.group(1).strip()
    return {
        "intent": intent_id,
        "label": label,
        "category": spec.get("category") or "自定义",
        "page_kind": spec.get("page_kind") or "form_list",
        "capability_hint": spec.get("capability_hint") or "",
        "form_headline": spec.get("form_headline") or label,
        "fields": list(spec.get("fields") or []),
        "primary_action": spec.get("primary_action") or "提交",
        "ui_hint": spec.get("ui_hint") or "",
    }


def foresight_add_op(text: str) -> dict[str, Any] | None:
    """无 Path-A 时，按意图产出可预见 Path-B add op（带字段模板）。"""
    classified = classify_compose_intent(text)
    if not classified:
        # 兜底：像「登记/申请/填报」的通用表单
        if any(w in text for w in ("登记", "申请", "填报", "报名", "预约", "评估表", "表单")):
            label = "业务登记"
            m = re.search(r"([\u4e00-\u9fffA-Za-z0-9]{2,12})(登记|申请|填报|报名|预约)", text)
            if m:
                label = m.group(0)
            classified = {
                "intent": "generic_form",
                "label": label,
                "category": "自定义",
                "page_kind": "form_list",
                "capability_hint": "",
                "form_headline": f"新建 · {label}",
                "fields": [
                    {"key": "title", "label": "标题", "placeholder": label},
                    {"key": "owner", "label": "负责人", "placeholder": "姓名", "optional": True},
                    {"key": "detail", "label": "说明", "type": "textarea", "placeholder": "补充信息", "optional": True},
                ],
                "primary_action": "提交",
                "ui_hint": "",
            }
        else:
            return None

    label = str(classified["label"])
    # 门禁话术：用用户原话作菜单名，观感更贴需求
    if classified.get("intent") == "access_qr":
        if "会议室" in text and "门禁" in text:
            label = "会议室门禁通行码"
        elif "门禁" in text:
            label = "门禁通行码申请"
    hint = str(classified.get("capability_hint") or "").strip()
    fields = list(classified.get("fields") or [])
    page_mock = {
        "form_title": str(classified.get("form_headline") or label),
        "fields": [
            {
                "key": str(f.get("key") or f"f_{i}"),
                "label": str(f["label"]),
                "value": "",
                "placeholder": str(f.get("placeholder") or ""),
                "optional": bool(f.get("optional")),
                **({"type": str(f["type"])} if f.get("type") else {}),
            }
            for i, f in enumerate(fields)
            if f.get("label")
        ],
        "list_title": f"{label}记录",
        "list": [],
        "primary_action": str(classified.get("primary_action") or "提交"),
    }
    op: dict[str, Any] = {
        "op": "add",
        "label": label,
        "category": classified.get("category") or "自定义",
        "page_kind": classified.get("page_kind") or "form_list",
        "summary": f"{label}：已按「{classified.get('intent')}」意图生成可填预览页",
        "page_mock": page_mock,
        "form_fields": [
            {
                "key": str(f.get("key") or f"f_{i}"),
                "label": str(f["label"]),
                "type": f.get("type"),
                "placeholder": f.get("placeholder"),
                "optional": f.get("optional"),
            }
            for i, f in enumerate(fields)
            if f.get("label")
        ],
        "form_headline": classified.get("form_headline"),
    }
    if hint:
        op["capability_key"] = hint
    else:
        op["capability_key"] = _slug_gen(label)
        op["widget"] = "GeneratedPageWidget"
        # 意图模板已带字段：立即可填，不进骨架；真未知才异步 DeepSeek
        op["pending_codegen"] = False
        op["foresight_ready"] = True
    dig = hashlib.md5(f"intent:{classified.get('intent')}:{label}".encode()).hexdigest()[:10]
    op["scene_key"] = f"scene_{dig}"
    return op
