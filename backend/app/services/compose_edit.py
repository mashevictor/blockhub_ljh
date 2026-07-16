"""Runtime / 预览页：自然语言改菜单。

理解链路：关键词 + 弹幕英雄预设 →（可选）DeepSeek → 落到 capability_registry 真能力。
新增场景必须带 registry widget，禁止一律 chat_qa / ListWidget 假页。
"""

from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES
from app.services.deepseek_client import deepseek_json_chat
from app.services.hero_preset_match import match_hero_presets
from app.services.keyword_match import match_modules_keyword
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

_PAGE_KINDS = ("form_list", "chat_kb", "chart", "roster", "notify", "approval", "files")

# 口语 / 同义 → 正式能力（fallback 与 enrich 共用；优先于 approval_flow）
_SYNONYM_TO_CAP: list[tuple[tuple[str, ...], str]] = [
    (("请假", "年假", "调休", "病假", "事假", "休假", "加班申请", "出差申请"), "leave_request"),
    (("报销", "费用报销", "发票", "差旅费", "借款", "付款申请"), "expense_claim"),
    (("入职", "招聘", "面试", "候选人", "onboard"), "hire_onboard"),
    (("设备报修", "报修", "产线坏", "机器坏", "故障", "维修工单", "派工维修"), "device_repair"),
    (("物业报修", "业主报修", "小区报修"), "property_repair"),
    (("质检", "sop", "不合格", "终检"), "quality_inspect"),
    (("盘点", "库存", "sku", "货位", "补货"), "inventory_count"),
    (("会员", "积分", "券码", "促销触达"), "member_loyalty"),
    (("会议室", "订会议室", "预约会议", "开会预约"), "meeting_booking"),
    (("it报障", "it 报障", "电脑坏", "网络不通", "帮我修电脑", "it工单"), "it_ticket"),
    (("用印", "盖章", "印章申请"), "seal_request"),
    (("资产领用", "固定资产", "资产台账"), "asset_manage"),
    (("制度", "政策问答", "福利政策", "制度查询"), "policy_qa"),
    (("知识库", "上传文档", "制度文档", "手册"), "kb_document"),
    (("导诊", "挂号指引", "科室", "预问诊"), "med_triage"),
    (("护士排班", "调班", "值班表"), "nurse_shift"),
    (("课表", "教室查询", "考试安排"), "class_schedule"),
    (("作业答疑", "错题", "课程答疑"), "homework_qa"),
    (("家校", "家长通知", "学校通知"), "school_notice"),
    (("酒店", "客房", "入住", "退房"), "hotel_booking"),
    (("看房", "带看", "意向登记", "签约跟进"), "house_viewing"),
    (("外卖", "配送", "骑手", "运单"), "delivery_order"),
    (("巡检", "隐患上报", "安全巡检"), "site_patrol"),
    (("法务", "合同审查", "案件"), "legal_case"),
    (("政务", "办事指南", "诉求提交"), "gov_service"),
    (("销售线索", "客户跟进", "线索录入"), "sales_lead"),
    (("报价", "合同评审", "特价申请"), "quote_contract"),
    (("经营看板", "问数", "老板看板", "kpi看板"), "ops_kpi"),
    (("数据看板", "统计报表", "可视化看板"), "chart_dashboard"),
    (("自然语言查数", "智能问数"), "data_nl_query"),
    (("考勤", "排班", "班次"), "shift_attendance"),
    (("培训", "上岗证", "技能培训"), "training_record"),
    (("企微", "钉钉", "飞书", "群通知"), "notify_im"),
    (("站内信", "站内通知"), "notify_inapp"),
    (("审批流", "通用审批", "流程审批"), "approval_flow"),
    (("待办", "审批中心", "待我审批"), "approval_inbox"),
    (("智能问答", "客服faq", "对话助手"), "chat_qa"),
]

_FORM_CAPS = frozenset({
    "leave_request", "expense_claim", "hire_onboard", "approval_flow", "device_repair",
    "quality_inspect", "material_issue", "property_repair", "seal_request", "it_ticket",
    "meeting_booking", "asset_manage", "inventory_count", "member_loyalty", "med_triage",
    "hotel_booking", "house_viewing", "delivery_order", "site_patrol", "legal_case",
    "gov_service", "sales_lead", "quote_contract", "nurse_shift", "homework_qa",
    "school_notice", "class_schedule", "fitness_checkin", "pet_clinic", "wedding_plan",
    "deco_material", "campaign_ops", "travel_plan", "game_support", "study_coach",
})

# 未在用户话里点名时，不作为「改页新增」主能力（易被行业包/弹幕附带带出）
_WEAK_COMPANION = frozenset({
    "notify_im", "notify_inapp", "chat_qa", "approval_flow", "kb_document", "flutter_push",
})


def _companion_explicit(text: str, key: str) -> bool:
    t = text.lower()
    if key == "chat_qa":
        return any(w in text for w in ("问答", "客服", "faq", "助手", "对话"))
    if key == "approval_flow":
        return any(w in text for w in ("审批流", "通用审批", "流程引擎"))
    if key in {"notify_im", "notify_inapp", "flutter_push"}:
        return any(w in text or w in t for w in ("通知", "企微", "钉钉", "飞书", "推送", "站内信"))
    if key == "kb_document":
        return any(w in text for w in ("知识库", "上传文档", "制度文档", "手册"))
    return True


def _select_add_caps(matches: list[dict[str, Any]], text: str) -> list[dict[str, Any]]:
    """挑主能力：高分、彼此接近，过滤未点名的弱附带。"""
    if not matches:
        return []
    strong = [m for m in matches if float(m.get("score") or 0) >= 7.0]
    pool = strong or matches[:1]
    top = float(pool[0].get("score") or 0)
    selected: list[dict[str, Any]] = []
    for m in pool:
        if float(m.get("score") or 0) < top - 1.5:
            continue
        key = str(m.get("key") or "")
        if key in _WEAK_COMPANION and not _companion_explicit(text, key):
            continue
        selected.append(m)
        if len(selected) >= 3:
            break
    return selected

_SYSTEM = f"""你是积木仓 Runtime 编排助手。用户用中文描述业务需求或要怎么改当前应用菜单。
你的任务：理解真实业务意图，把需求落到「已有正式能力」（capability_key），输出可执行 ops。

输出 JSON（不要 markdown）：
{{
  "reply": "用两三句中文说明你理解了什么、挂了哪些正式能力、用户接下来能做什么",
  "intent_summary": "一句话业务意图",
  "ops": [
    {{
      "op":"add",
      "label":"场景名",
      "capability_key":"registry_key",
      "category":"分类",
      "summary":"一句业务说明",
      "page_kind":"form_list|chat_kb|chart|roster|notify|approval|files"
    }},
    {{"op":"remove","label":"场景名"}},
    {{"op":"rename","from":"旧名","to":"新名"}},
    {{"op":"move","label":"场景名","index":0}}
  ]
}}

规则：
1. 即使用户没说「增加/添加」，只要在描述业务痛点（如「产线常坏要报修」「员工要请假报销」），也应 add 对应正式能力。
2. capability_key 必须来自可用列表。优先：请假→leave_request，报销→expense_claim，设备报修→device_repair，会议室→meeting_booking，IT报障→it_ticket，制度→policy_qa/kb_document。禁止用 approval_flow 顶替上述专用能力。
3. 一句需求可挂多个能力（例如「要请假和报销」→ 两个 add）。
4. 已在当前菜单的同类能力不要重复 add；可 rename/move。
5. 仅当完全无法匹配正式能力时才用 chat_qa；不要用 page_mock 伪造业务数据。
6. ops 可为空（仅回答问题、澄清时）。
7. {NO_MARKDOWN_STYLE_RULE}
"""


def _catalog_brief() -> str:
    rows = []
    for key, cap in ALL_CAPABILITIES.items():
        kw = "、".join(cap.keywords[:6]) if cap.keywords else ""
        if kw:
            rows.append(f"{key}:{cap.name}({kw})")
        else:
            rows.append(f"{key}:{cap.name}")
    return ", ".join(rows)


def _menu_has_cap(menu: list[dict[str, Any]], cap_key: str) -> bool:
    for m in menu:
        if str(m.get("capability_key") or "") == cap_key:
            return True
        if str(m.get("key") or "") == cap_key:
            return True
    return False


def _menu_has_label(menu: list[dict[str, Any]], label: str) -> bool:
    lab = label.strip()
    if not lab:
        return False
    for m in menu:
        existing = str(m.get("label") or "")
        if existing == lab or lab in existing or existing in lab:
            return True
    return False


def _resolve_matches(text: str) -> list[dict[str, Any]]:
    """关键词 + 弹幕预设 → 正式能力列表（按分数）。"""
    by_key: dict[str, dict[str, Any]] = {}

    for item in match_hero_presets(text):
        key = str(item.get("key") or "").strip()
        if key not in ALL_CAPABILITIES:
            continue
        score = float(item.get("score") or 0) + 2.0  # 弹幕加权
        prev = by_key.get(key)
        if prev is None or score > float(prev.get("score") or 0):
            by_key[key] = {
                "key": key,
                "label": item.get("label") or ALL_CAPABILITIES[key].name,
                "score": score,
                "source": "hero_preset",
                "reason": item.get("reason") or "弹幕场景匹配",
            }

    for item in match_modules_keyword(text):
        key = str(item.get("key") or "").strip()
        if key not in ALL_CAPABILITIES:
            continue
        # 行业包整包展开的低相关项略过（Runtime 改页要精准）
        if item.get("type") == "industry":
            continue
        score = float(item.get("score") or 0)
        prev = by_key.get(key)
        if prev is None or score > float(prev.get("score") or 0):
            by_key[key] = {
                "key": key,
                "label": item.get("label") or ALL_CAPABILITIES[key].name,
                "score": score,
                "source": item.get("source") or "keyword",
                "reason": item.get("reason") or "关键词匹配",
            }

    # 同义表补强（口语）
    t = text.strip().lower()
    for aliases, cap_key in _SYNONYM_TO_CAP:
        if cap_key not in ALL_CAPABILITIES:
            continue
        hit = any(a.lower() in t or a in text for a in aliases)
        if not hit:
            continue
        score = 8.0
        prev = by_key.get(cap_key)
        if prev is None or score > float(prev.get("score") or 0):
            by_key[cap_key] = {
                "key": cap_key,
                "label": ALL_CAPABILITIES[cap_key].name,
                "score": score,
                "source": "synonym",
                "reason": f"口语命中「{aliases[0]}」",
            }

    ranked = sorted(by_key.values(), key=lambda x: float(x["score"]), reverse=True)
    # Runtime 改页：取高相关，避免整包灌入
    return [x for x in ranked if float(x["score"]) >= 5.0][:8]


def _infer_add_from_text(text: str) -> list[dict[str, Any]]:
    """本地兜底：从自然语言推断要新增的正式能力（可多个）。"""
    # 显式「增加 X」
    explicit_labels: list[str] = []
    for m in re.finditer(
        r"(?:增加|添加|加上|新建|加一个|加个|挂上|开通|启用)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,20})",
        text,
    ):
        lab = m.group(1).strip().strip("「」『』\"'")
        if lab:
            explicit_labels.append(lab)

    matches = _select_add_caps(_resolve_matches(text), text)
    ops: list[dict[str, Any]] = []

    if matches:
        for hit in matches:
            label = str(hit["label"])
            # 若用户写了显式场景名且只有一个匹配，用用户名
            if len(explicit_labels) == 1 and len(matches) == 1:
                label = explicit_labels[0]
            ops.append(
                _enrich_add_op(
                    {
                        "op": "add",
                        "label": label,
                        "capability_key": hit["key"],
                        "summary": str(hit.get("reason") or ""),
                    }
                )
            )
        return ops

    # 仅有「增加 X」但未命中注册表：用标签 enrich
    for lab in explicit_labels:
        ops.append(_enrich_add_op({"op": "add", "label": lab}))
    return ops


def _page_kind_for(cap: str) -> str:
    if cap in _FORM_CAPS:
        return "form_list"
    if cap in {"shift_attendance", "nurse_shift", "class_schedule"}:
        return "roster"
    if cap in {"mfg_oee", "energy_carbon", "chart_dashboard", "data_nl_query", "ops_kpi", "chart_funnel"}:
        return "chart"
    if cap in {"maintenance_plan", "notify_inapp", "notify_im", "school_notice"}:
        return "notify"
    if cap in {"kb_document"}:
        return "files"
    if cap in {"approval_inbox", "approval_flow"}:
        return "approval"
    return "chat_kb"


def _enrich_add_op(op: dict[str, Any]) -> dict[str, Any]:
    """补全 capability / widget；正式能力不塞 page_mock 假数据。"""
    label = str(op.get("label") or "").strip()
    if not label:
        return op
    text = label + str(op.get("summary") or "")
    cap = str(op.get("capability_key") or "").strip()

    if not cap or cap not in ALL_CAPABILITIES:
        # 先走匹配
        hits = _resolve_matches(text)
        if hits:
            cap = str(hits[0]["key"])
        else:
            for aliases, key in _SYNONYM_TO_CAP:
                if any(a in text for a in aliases):
                    cap = key
                    break
            else:
                cap = "chat_qa"

    # 禁止用 approval_flow 顶替专用能力（若 label 已点名专用场景）
    if cap == "approval_flow":
        for aliases, key in _SYNONYM_TO_CAP:
            if key == "approval_flow":
                continue
            if any(a in text for a in aliases) and key in ALL_CAPABILITIES:
                cap = key
                break

    op["capability_key"] = cap
    cap_def = ALL_CAPABILITIES.get(cap)
    if cap_def:
        op["widget"] = cap_def.widget
        if not op.get("category"):
            op["category"] = cap_def.category
        if not label or label == cap:
            op["label"] = cap_def.menu_label or cap_def.name
            label = op["label"]
    else:
        op["widget"] = "ListWidget"
        if not op.get("category"):
            op["category"] = "自定义"

    if not op.get("summary"):
        name = cap_def.name if cap_def else label
        op["summary"] = f"{label}：接入正式能力「{name}」，提交写入真 API"

    kind = str(op.get("page_kind") or "").strip()
    if kind not in _PAGE_KINDS:
        kind = _page_kind_for(cap)
    op["page_kind"] = kind

    # 正式注册能力：不依赖 page_mock；仅未知/兜底才给轻量 mock
    if cap in ALL_CAPABILITIES and cap != "chat_qa":
        op.pop("page_mock", None)
    else:
        mock = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else None
        if not mock:
            op["page_mock"] = _default_page_mock(label, cap, kind)
        else:
            blob = json.dumps(mock, ensure_ascii=False)
            if any(k in label for k in ("请假", "报销", "入职")) and any(
                k in blob for k in ("冲压", "换模", "SOP-", "工艺")
            ):
                op["page_mock"] = _default_page_mock(label, cap, kind)
    return op


def _default_page_mock(label: str, cap: str, kind: str) -> dict[str, Any]:
    if kind == "roster" or cap == "shift_attendance":
        return {
            "list_title": f"{label} · 本周安排",
            "list": [
                {"id": "一", "title": "白班", "status": "正常"},
                {"id": "二", "title": "白班", "status": "正常"},
                {"id": "三", "title": "夜班", "status": "正常"},
            ],
            "primary_action": "班次申诉",
        }
    if kind == "chart":
        return {
            "kpis": [
                {"label": "本周", "value": "—", "hint": "接真数据后刷新"},
                {"label": "待办", "value": "—", "hint": "—"},
            ],
            "list_title": f"{label}趋势",
            "primary_action": "刷新数据",
        }
    return {
        "chat_title": f"{label}助手",
        "chat": [
            {"role": "bot", "text": f"你好，我是「{label}」助手，可以帮你查询规则与办理指引。"},
        ],
        "files_title": "相关资料",
        "files": [f"{label}说明.md"],
        "primary_action": "发送",
    }


def _fallback_ops(instruction: str, menu: list[dict[str, Any]]) -> dict[str, Any]:
    text = instruction.strip()
    labels = [str(m.get("label") or "") for m in menu]
    ops: list[dict[str, Any]] = []

    # 删除
    for prefix in ("去掉", "删除", "移除", "关掉", "不要"):
        if text.startswith(prefix) or prefix in text[:8]:
            target = text
            for p in ("去掉", "删除", "移除", "关掉", "不要"):
                target = target.replace(p, "", 1)
            target = target.strip(" ：:，,")
            for lab in labels:
                if target and (target in lab or lab in target):
                    ops.append({"op": "remove", "label": lab})
                    break
            break

    if not ops:
        for add_op in _infer_add_from_text(text):
            cap = str(add_op.get("capability_key") or "")
            lab = str(add_op.get("label") or "")
            if _menu_has_cap(menu, cap) or _menu_has_label(menu, lab):
                continue
            ops.append(add_op)

    if ops:
        added = [str(o.get("label") or o.get("capability_key") or "") for o in ops if o.get("op") == "add"]
        removed = [str(o.get("label") or "") for o in ops if o.get("op") == "remove"]
        parts = []
        if added:
            parts.append(f"已挂上正式能力：{'、'.join(added)}")
        if removed:
            parts.append(f"已移除：{'、'.join(removed)}")
        reply = "；".join(parts) + "。打开对应菜单即可用真表单/真 API（空库为空列表）。"
    else:
        hits = _resolve_matches(text)
        if hits:
            tips = "、".join(f"{h['label']}({h['key']})" for h in hits[:3])
            reply = f"理解到可能相关能力：{tips}。可以说「加上{hits[0]['label']}」直接挂进菜单。"
        else:
            reply = (
                "已收到。可以说业务痛点（如「产线设备常坏要报修」），"
                "或「增加请假管理 / 去掉保养计划」，我会挂上正式能力包。"
            )

    return {
        "reply": reply,
        "ops": ops,
        "intent_summary": (ops and "按本地语义匹配落地正式能力") or "待澄清",
        "matched": _resolve_matches(text)[:5],
        "source": "fallback",
        "llm_configured": bool(settings.deepseek_api_key),
    }


def _merge_llm_with_matches(
    ops: list[dict[str, Any]],
    instruction: str,
    menu: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """LLM 未产出 add 时，用本地匹配补齐；已有 add 则按匹配纠正错误 key。"""
    has_add = any(o.get("op") == "add" for o in ops)
    has_mutate = any(o.get("op") in {"remove", "rename", "move"} for o in ops)

    if not has_add and not has_mutate:
        for add_op in _infer_add_from_text(instruction):
            cap = str(add_op.get("capability_key") or "")
            lab = str(add_op.get("label") or "")
            if _menu_has_cap(menu, cap) or _menu_has_label(menu, lab):
                continue
            ops.append(add_op)
        return ops

    # 纠正 LLM 误选的 approval_flow / chat_qa
    matches = _resolve_matches(instruction)
    if matches:
        top = matches[0]
        for o in ops:
            if o.get("op") != "add":
                continue
            ck = str(o.get("capability_key") or "")
            if ck in {"approval_flow", "chat_qa"} and top["key"] not in {ck, "approval_flow", "chat_qa"}:
                o["capability_key"] = top["key"]
                o["label"] = o.get("label") or top["label"]
    return ops


def compose_edit_from_instruction(
    *,
    instruction: str,
    menu: list[dict[str, Any]] | None = None,
    capability_keys: list[str] | None = None,
    app_name: str = "",
) -> dict[str, Any]:
    q = (instruction or "").strip()
    menu_list = [m for m in (menu or []) if isinstance(m, dict)]
    keys = [k for k in (capability_keys or []) if k]
    llm_ok = bool(settings.deepseek_api_key)
    if len(q) < 1:
        return {
            "reply": "请输入要修改的内容或业务需求。",
            "ops": [],
            "source": "fallback",
            "llm_configured": llm_ok,
        }

    local_matches = _resolve_matches(q)

    if not llm_ok:
        return _fallback_ops(q, menu_list)

    match_hint = ""
    if local_matches:
        match_hint = (
            "本地语义预匹配（请优先采用，勿改成 approval_flow 顶替）："
            + ", ".join(f"{m['key']}={m['label']}({m['score']:.1f})" for m in local_matches)
            + "\n"
        )

    user = (
        f"应用：{app_name or 'Runtime 预览'}\n"
        f"当前菜单：{json.dumps([{'label': m.get('label'), 'key': m.get('key'), 'capability_key': m.get('capability_key')} for m in menu_list], ensure_ascii=False)}\n"
        f"已选能力：{', '.join(keys) if keys else '无'}\n"
        f"{match_hint}"
        f"可用能力目录：{_catalog_brief()}\n"
        f"用户指令：{q}"
    )
    data = deepseek_json_chat(_SYSTEM, user, temperature=0.25)
    if not isinstance(data, dict):
        return _fallback_ops(q, menu_list)

    reply = sanitize_llm_plain_text(str(data.get("reply") or "已更新"))
    intent_summary = sanitize_llm_plain_text(str(data.get("intent_summary") or ""))
    ops_raw = data.get("ops") if isinstance(data.get("ops"), list) else []
    ops: list[dict[str, Any]] = []
    for op in ops_raw:
        if not isinstance(op, dict):
            continue
        kind = str(op.get("op") or "").strip()
        if kind not in {"add", "remove", "rename", "move"}:
            continue
        cleaned: dict[str, Any] = {"op": kind}
        for k in ("label", "from", "to", "capability_key", "category", "summary", "page_kind", "widget"):
            if op.get(k) is not None:
                cleaned[k] = str(op.get(k))
        if isinstance(op.get("page_mock"), dict):
            cleaned["page_mock"] = op["page_mock"]
        if "index" in op:
            try:
                cleaned["index"] = int(op["index"])
            except (TypeError, ValueError):
                pass
        ck = cleaned.get("capability_key")
        if ck and ck not in ALL_CAPABILITIES:
            cleaned["capability_key"] = "chat_qa"
        if kind == "add":
            cleaned = _enrich_add_op(cleaned)
        ops.append(cleaned)

    ops = _merge_llm_with_matches(ops, q, menu_list)
    # 再次 enrich（纠正后的 key）
    ops = [_enrich_add_op(o) if o.get("op") == "add" else o for o in ops]

    # 去重：同 capability 已在菜单或本批重复
    deduped: list[dict[str, Any]] = []
    seen_caps: set[str] = set()
    for o in ops:
        if o.get("op") == "add":
            ck = str(o.get("capability_key") or "")
            if ck in seen_caps or _menu_has_cap(menu_list, ck):
                continue
            seen_caps.add(ck)
        deduped.append(o)
    ops = deduped

    if not reply or reply == "已更新":
        added = [str(o.get("label")) for o in ops if o.get("op") == "add"]
        if added:
            reply = f"理解需求后已挂上：{'、'.join(added)}。菜单打开即可使用正式能力（真 API）。"
        elif intent_summary:
            reply = intent_summary

    return {
        "reply": reply or "已更新",
        "ops": ops,
        "intent_summary": intent_summary,
        "matched": local_matches,
        "source": "deepseek",
        "llm_configured": True,
    }
