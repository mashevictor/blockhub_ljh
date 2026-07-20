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
from app.services.web_capability_gate import ensure_web_ready_key, is_web_ready_capability

_PAGE_KINDS = ("form_list", "chat_kb", "chart", "roster", "notify", "approval", "files")

# 口语 / 同义 → 正式能力（fallback 与 enrich 共用；优先于 approval_flow）
_SYNONYM_TO_CAP: list[tuple[tuple[str, ...], str]] = [
    (("请假", "年假", "调休", "病假", "事假", "休假", "加班申请", "出差申请"), "leave_request"),
    (("报销", "费用报销", "发票", "差旅费", "借款", "付款申请", "团建", "经费", "活动经费", "预算审批"), "expense_claim"),
    (("入职", "招聘", "面试", "候选人", "onboard", "劳动合同", "雇佣合同", "用工合同", "工资5000", "入职日期"), "hire_onboard"),
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
    (("法务", "合同审查", "案件", "法务合同", "合同生成", "生成合同"), "legal_case"),
    (("报价合同", "销售合同", "特价申请"), "quote_contract"),
    (("政务", "办事指南", "诉求提交"), "gov_service"),
    (("销售线索", "客户跟进", "线索录入"), "sales_lead"),
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
    (("2048", "合成2048", "数字合成", "益智2048", "玩2048", "2048小游戏", "数字方块游戏"), "game_2048"),
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

# 可玩小游戏（非 2048）→ Path B gen_* + DeepSeek 出页，勿落到 FAQ/问答
_MINIGAME_HINTS = (
    "贪吃蛇", "俄罗斯方块", "消消乐", "扫雷", "连连看", "飞机大战", "打砖块",
    "五子棋", "象棋", "扑克", "麻将", "节奏游戏", "跑酷", "消除",
)


def _looks_like_minigame(text: str) -> bool:
    t = (text or "").strip()
    if not t or "2048" in t:
        return False
    if any(w in t for w in _MINIGAME_HINTS):
        return True
    return ("小游戏" in t or "单机游戏" in t) and any(w in t for w in ("生成", "做", "加", "来个", "玩", "页面"))


def _looks_like_calculator(text: str) -> bool:
    t = (text or "").strip()
    if not t:
        return False
    if any(w in t for w in ("科学计算器", "计算器", "calculator", "scientific calc")):
        return True
    if "计算" in t and any(w in t for w in ("手机", "苹果", "按键", "科学", "sin", "cos")):
        return True
    return False


def _interactive_schema_for_intent(text: str) -> dict[str, Any] | None:
    """按意图泛化 tool_pad schema（模板库），禁止为每个需求写死前端组件。"""
    t = text or ""
    if _looks_like_calculator(t) or ("数字按钮" in t and "sin" in t.lower()):
        return {
            "type": "tool_pad",
            "theme": "phone_dark",
            "columns": 4,
            "hint": "Agent 泛化 · 科学/普通计算器 tool_pad",
            "buttons": [
                {"label": "AC", "style": "fn", "ops": [{"op": "clear_all"}]},
                {"label": "C", "style": "fn", "ops": [{"op": "clear"}]},
                {"label": "±", "style": "fn", "ops": [{"op": "unary", "fn": "neg"}]},
                {"label": "÷", "style": "op", "ops": [{"op": "push_binop", "value": "/"}]},
                {"label": "7", "style": "digit", "ops": [{"op": "append_digit", "value": "7"}]},
                {"label": "8", "style": "digit", "ops": [{"op": "append_digit", "value": "8"}]},
                {"label": "9", "style": "digit", "ops": [{"op": "append_digit", "value": "9"}]},
                {"label": "×", "style": "op", "ops": [{"op": "push_binop", "value": "*"}]},
                {"label": "4", "style": "digit", "ops": [{"op": "append_digit", "value": "4"}]},
                {"label": "5", "style": "digit", "ops": [{"op": "append_digit", "value": "5"}]},
                {"label": "6", "style": "digit", "ops": [{"op": "append_digit", "value": "6"}]},
                {"label": "-", "style": "op", "ops": [{"op": "push_binop", "value": "-"}]},
                {"label": "1", "style": "digit", "ops": [{"op": "append_digit", "value": "1"}]},
                {"label": "2", "style": "digit", "ops": [{"op": "append_digit", "value": "2"}]},
                {"label": "3", "style": "digit", "ops": [{"op": "append_digit", "value": "3"}]},
                {"label": "+", "style": "op", "ops": [{"op": "push_binop", "value": "+"}]},
                {"label": "0", "style": "digit", "ops": [{"op": "append_digit", "value": "0"}]},
                {"label": ".", "style": "digit", "ops": [{"op": "append_dot"}]},
                {"label": "=", "style": "accent", "ops": [{"op": "evaluate"}]},
                {"label": "sin", "style": "fn", "ops": [{"op": "unary", "fn": "sin_deg"}]},
            ],
        }
    if any(w in t for w in ("计数器", "counter", "点数器")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 3,
            "hint": "Agent 泛化 · 计数器 tool_pad",
            "buttons": [
                {"label": "+1", "style": "accent", "ops": [{"op": "add", "value": 1}]},
                {"label": "+5", "style": "op", "ops": [{"op": "add", "value": 5}]},
                {"label": "-1", "style": "fn", "ops": [{"op": "add", "value": -1}]},
                {"label": "归零", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    if any(w in t for w in ("骰子", "随机数", "抽签")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 2,
            "hint": "Agent 泛化 · 随机 tool_pad",
            "buttons": [
                {"label": "掷骰子", "style": "accent", "ops": [{"op": "random_int", "min": 1, "max": 6}]},
                {"label": "重置", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    return None


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

_SYSTEM = f"""你是积木仓 Runtime 编排助手。用户用中文描述业务需求或要怎么改当前应用菜单/表单交互。
你必须先真正理解用户的业务语言与意图，再**泛化**到可执行 ops（同类需求共用同一交互模型，禁止每来一个产品名就只吐文字列表）。
**禁止**在未产出有效 ops 时回复「页面已更新」「已改好」——无 ops 只能澄清或提问。

输出 JSON（不要 markdown）：
{{
  "reply": "用两三句中文说明：你理解的需求、改了什么（菜单/控件）、真 API 是否已就绪",
  "intent_summary": "一句话业务意图",
  "ops": [
    {{
      "op":"add",
      "label":"场景名（用用户原话里的业务名，如「团建经费审批」）",
      "capability_key":"registry_key 或 gen_自定义slug",
      "category":"分类",
      "summary":"一句业务说明（回应用户语境）",
      "page_kind":"form_list|chat_kb|chart|roster|notify|approval|files",
      "widget":"可选；未知能力用 GeneratedPageWidget",
      "page_mock":{{
        "form_title":"贴合场景的表单标题",
        "fields":[{{"key":"start_at","label":"开始日期","type":"date","value":""}}],
        "list_title":"列表标题",
        "list":[{{"id":"01","title":"示例条目","status":"待办"}}],
        "primary_action":"提交按钮文案"
      }}
    }},
    {{
      "op":"patch_page",
      "label":"已有场景名（须与当前菜单匹配，如「请假审批」）",
      "capability_key":"可选；leave_request",
      "page_mock":{{
        "form_title":"请假审批 · 提交",
        "fields":[
          {{"key":"start_at","label":"开始日期","type":"date","value":""}},
          {{"key":"end_at","label":"结束日期","type":"date","value":""}},
          {{"key":"note","label":"事由","type":"text","value":""}}
        ],
        "primary_action":"提交"
      }},
      "form_fields":[
        {{"key":"start_at","label":"开始日期","type":"date"}},
        {{"key":"end_at","label":"结束日期","type":"date"}},
        {{"key":"note","label":"事由","type":"text"}}
      ]
    }},
    {{"op":"remove","label":"场景名"}},
    {{"op":"rename","from":"旧名","to":"新名"}},
    {{"op":"move","label":"场景名","index":0}}
  ]
}}

规则：
1. 即使用户没说「增加/添加」，只要在描述业务痛点，也应 add 对应页面。
2. 能匹配正式能力则用正式 key（请假→leave_request，报销→expense_claim，报修→device_repair，会议室→meeting_booking，IT→it_ticket，制度→policy_qa 等）。禁止用 approval_flow 顶替专用能力。
3. 禁止 contract_editor 等无 Web 真包；劳动合同/入职→hire_onboard，法务→legal_case。
4. **每个 add 必须带 page_mock**，字段名/列表示例要反映用户原话（如「团建」「差旅」「季度 OKR」），禁止复制无关制造/产线话术。
5. 没有合适正式能力时：capability_key 用 gen_拼音或英文短 slug，widget=GeneratedPageWidget，page_mock 写清表单；接口可异步落地，reply 里说明「页面已出，接口后台生成」。
5b. **可点按工具 UI**（计算器/计数器/骰子/按键面板等）：必须理解并泛化，在 page_mock 写入 interactive 对象（type=tool_pad，buttons 数组，白名单 ops），**禁止**用 list 文字罗列按键冒充 UI。改交互同样用 patch_page 更新 interactive。
5c. **仅改标题/菜单名/文案**：用 **rename**（from→to）或 patch_page 文案，**禁止** add 新模块。用户说「改标题」「改名叫」「把请假改成事假」时不得默认挂新能力。
6. 同一正式能力可对应多个不同 label 场景页（加班申请与请假申请可并存）。
7. 已有相同 label 不要重复 add；可 rename/move。
8. **改交互控件**（日期弹框/选择器、金额改数字、把文本框改成 date/number）：必须用 **patch_page**，针对当前菜单已有项写完整 page_mock.fields 与 form_fields（含 key/label/type）。type 可用 date / datetime-local / number / text / textarea。禁止空 ops 却说已更新。
9. ops 可为空（仅澄清时）；此时 reply 只能提问或说明未改动，禁止谎称已更新。
10. {NO_MARKDOWN_STYLE_RULE}
"""


def _looks_like_title_rename_intent(text: str) -> bool:
    """改标题 / 重命名菜单 — 不得走 add。"""
    t = (text or "").strip()
    if not t:
        return False
    if _looks_like_ui_patch_intent(t):
        return False
    if any(w in t for w in ("增加", "添加", "加上", "新建", "挂上", "开通", "做一个", "来个")):
        return False
    if re.search(r"(改|修改|更换|调整).{0,6}(标题|名称|名字|菜单名|显示名)", t):
        return True
    if re.search(r"重命名|改名叫|改名为|叫做|叫成", t):
        return True
    if re.search(r"把\s*[「『\"].+[」』\"]\s*改成", t) or re.search(r"把.{1,16}改成.{1,16}", t):
        return True
    return False


def _infer_rename_ops(instruction: str, menu: list[dict[str, Any]]) -> list[dict[str, Any]]:
    text = instruction.strip()
    labels = [str(m.get("label") or "") for m in menu if m.get("label")]
    if not labels:
        return []

    m = re.search(
        r"把\s*[「『\"]?([^「『」』\"，,]{1,24})[」』\"]?\s*改成\s*[「『\"]?([^「『」』\"，,]{1,24})[」』\"]?",
        text,
    )
    if m:
        src, dst = m.group(1).strip(), m.group(2).strip()
        for lab in labels:
            if src == lab or src in lab or lab in src:
                return [{"op": "rename", "from": lab, "to": dst}]

    m2 = re.search(
        r"(?:标题|名称|名字|菜单名|显示名)\s*(?:改成|改为|改叫|叫)\s*[「『\"]?([^「『」』\"，,]{1,24})[」』\"]?",
        text,
    )
    if m2:
        return [{"op": "rename", "from": labels[0], "to": m2.group(1).strip()}]

    m3 = re.search(
        r"重命名\s*[「『\"]?([^「『」』\"，,]{1,24})[」』\"]?\s*(?:为|成|叫)\s*[「『\"]?([^「『」』\"，,]{1,24})",
        text,
    )
    if m3:
        src, dst = m3.group(1).strip(), m3.group(2).strip()
        for lab in labels:
            if src == lab or src in lab or lab in src:
                return [{"op": "rename", "from": lab, "to": dst}]

    return []


def _catalog_brief() -> str:
    rows = []
    for key, cap in ALL_CAPABILITIES.items():
        if not is_web_ready_capability(key):
            continue
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


def _looks_like_date_ui_intent(text: str) -> bool:
    t = text.strip().lower()
    hints = (
        "日期弹框", "日期选择", "选日期", "datepicker", "date picker",
        "日历", "时间选择", "datetime", "日期控件", "改成日期", "改成时间",
    )
    if any(h in text or h in t for h in hints):
        return True
    if re.search(r"日期.{0,6}(弹|选|改|框)", text) or re.search(r"(弹|选|改).{0,6}日期", text):
        return True
    if re.search(r"(开始|结束).{0,4}(日期|时间).{0,8}(选|弹|改)", text):
        return True
    return False


def _looks_like_number_ui_intent(text: str) -> bool:
    if any(w in text for w in ("金额改数字", "金额用数字", "数字输入", "number", "改成数字")):
        return True
    if re.search(r"金额.{0,6}(数字|number|控件)", text):
        return True
    return False


def _looks_like_ui_patch_intent(text: str) -> bool:
    return _looks_like_date_ui_intent(text) or _looks_like_number_ui_intent(text)


def _pick_patch_targets(text: str, menu: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """从当前菜单挑出要改控件的场景。"""
    scored: list[tuple[int, dict[str, Any]]] = []
    for m in menu:
        lab = str(m.get("label") or "")
        cap = str(m.get("capability_key") or m.get("key") or "")
        score = 0
        if any(w in text for w in ("请假", "年假", "病假", "事假")) and (
            "请假" in lab or cap == "leave_request"
        ):
            score += 5
        if "加班" in text and ("加班" in lab or cap == "leave_request"):
            score += 5
        if "出差" in text and ("出差" in lab or cap == "leave_request"):
            score += 5
        if any(w in text for w in ("会议", "会议室")) and (
            "会议" in lab or cap == "meeting_booking"
        ):
            score += 5
        if any(w in text for w in ("报销", "借款", "付款", "金额")) and (
            "报销" in lab or "借款" in lab or "付款" in lab or cap == "expense_claim"
        ):
            score += 5
        if cap == "leave_request" and _looks_like_date_ui_intent(text):
            score += 2
        if cap == "expense_claim" and _looks_like_number_ui_intent(text):
            score += 2
        if any(w in lab for w in ("开始", "结束", "日期")) and "日期" in text:
            score += 1
        if score:
            scored.append((score, m))
    scored.sort(key=lambda x: -x[0])
    if scored:
        top = scored[0][0]
        return [m for s, m in scored if s >= top]
    if _looks_like_date_ui_intent(text):
        for m in menu:
            lab = str(m.get("label") or "")
            cap = str(m.get("capability_key") or "")
            if cap == "leave_request" or "请假" in lab:
                return [m]
    if _looks_like_number_ui_intent(text):
        for m in menu:
            lab = str(m.get("label") or "")
            cap = str(m.get("capability_key") or "")
            if cap == "expense_claim" or any(w in lab for w in ("报销", "借款", "付款")):
                return [m]
    return []


def _date_patch_op_for_menu_item(m: dict[str, Any]) -> dict[str, Any]:
    lab = str(m.get("label") or "表单")
    cap = str(m.get("capability_key") or "leave_request")
    overtime = "加班" in lab
    meeting = cap == "meeting_booking" or "会议" in lab
    itype = "datetime-local" if (overtime or meeting) else "date"
    start_label = "开始时间" if itype == "datetime-local" else "开始日期"
    end_label = "结束时间" if itype == "datetime-local" else "结束日期"
    fields = [
        {"key": "start_at", "label": start_label, "type": itype, "value": ""},
        {"key": "end_at", "label": end_label, "type": itype, "value": ""},
        {"key": "note", "label": "事由", "type": "text", "value": ""},
    ]
    if meeting:
        fields = [
            {"key": "room_name", "label": "会议室", "type": "text", "value": ""},
            {"key": "title", "label": "会议主题", "type": "text", "value": ""},
            {"key": "start_at", "label": start_label, "type": itype, "value": ""},
            {"key": "end_at", "label": end_label, "type": itype, "value": ""},
        ]
    form_fields = [{"key": f["key"], "label": f["label"], "type": f["type"]} for f in fields]
    return {
        "op": "patch_page",
        "label": lab,
        "capability_key": cap,
        "page_mock": {
            "form_title": f"{lab} · 提交",
            "fields": fields,
            "primary_action": "提交",
        },
        "form_fields": form_fields,
        "summary": f"将「{lab}」起止字段改为原生日期/时间选择器",
    }


def _number_patch_op_for_menu_item(m: dict[str, Any]) -> dict[str, Any]:
    lab = str(m.get("label") or "报销")
    cap = str(m.get("capability_key") or "expense_claim")
    fields = [
        {"key": "title", "label": "标题", "type": "text", "value": ""},
        {"key": "amount", "label": "金额", "type": "number", "value": ""},
        {"key": "note", "label": "说明", "type": "text", "value": ""},
    ]
    form_fields = [{"key": f["key"], "label": f["label"], "type": f["type"]} for f in fields]
    return {
        "op": "patch_page",
        "label": lab,
        "capability_key": cap,
        "page_mock": {
            "form_title": f"{lab} · 提交",
            "fields": fields,
            "primary_action": "提交",
        },
        "form_fields": form_fields,
        "summary": f"将「{lab}」金额字段改为数字输入控件",
    }


def _infer_patch_ops(instruction: str, menu: list[dict[str, Any]]) -> list[dict[str, Any]]:
    targets = _pick_patch_targets(instruction, menu)
    if not targets:
        return []
    ops: list[dict[str, Any]] = []
    if _looks_like_date_ui_intent(instruction):
        ops.extend(_date_patch_op_for_menu_item(m) for m in targets)
    if _looks_like_number_ui_intent(instruction):
        # 金额意图优先打到 expense；若 targets 已是 expense 则补 number patch
        for m in targets:
            cap = str(m.get("capability_key") or "")
            lab = str(m.get("label") or "")
            if cap == "expense_claim" or any(w in lab for w in ("报销", "借款", "付款", "费用")):
                ops.append(_number_patch_op_for_menu_item(m))
        if not any(o.get("capability_key") == "expense_claim" for o in ops):
            for m in menu:
                cap = str(m.get("capability_key") or "")
                lab = str(m.get("label") or "")
                if cap == "expense_claim" or any(w in lab for w in ("报销", "借款", "付款")):
                    ops.append(_number_patch_op_for_menu_item(m))
                    break
    # 去重 label
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for o in ops:
        lab = str(o.get("label") or "")
        kind = "date" if any(f.get("type") in {"date", "datetime-local"} for f in (o.get("form_fields") or [])) else "num"
        key = f"{lab}:{kind}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(o)
    return deduped


def _clean_patch_op(op: dict[str, Any]) -> dict[str, Any] | None:
    lab = str(op.get("label") or "").strip()
    if not lab:
        return None
    cleaned: dict[str, Any] = {"op": "patch_page", "label": lab}
    if op.get("capability_key"):
        cleaned["capability_key"] = str(op.get("capability_key"))
    if op.get("summary"):
        cleaned["summary"] = str(op.get("summary"))
    mock = op.get("page_mock")
    if isinstance(mock, dict):
        cleaned["page_mock"] = mock
    ff = op.get("form_fields")
    if isinstance(ff, list) and ff:
        cleaned["form_fields"] = ff
    elif isinstance(mock, dict) and isinstance(mock.get("fields"), list):
        cleaned["form_fields"] = [
            {
                "key": str(f.get("key") or f"f_{i}"),
                "label": str(f.get("label") or ""),
                "type": str(f.get("type") or "text"),
            }
            for i, f in enumerate(mock["fields"])
            if isinstance(f, dict) and f.get("label")
        ]
    if not cleaned.get("page_mock") and not cleaned.get("form_fields"):
        return None
    return cleaned


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
        # 精准口语（如 2048）抬高分，避免行业包附带的看板/ERP 一并灌入
        score = 9.5 if cap_key == "game_2048" else 8.0
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
        r"(?:增加|添加|加上|新建|加一个|加个|挂上|开通|启用|生成|做一个|做个|来个|创建)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,24})",
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
    if cap == "game_2048":
        return "game"
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


def _slug_gen_key(label: str) -> str:
    raw = re.sub(r"[^\w\u4e00-\u9fff]+", "_", (label or "").strip(), flags=re.UNICODE)
    raw = raw.strip("_").lower()[:28] or "custom"
    # 中文保留时用 hash 缩短，避免 key 过长
    if re.search(r"[\u4e00-\u9fff]", raw):
        h = abs(hash(label)) % 100000
        return f"gen_{h}"
    return f"gen_{raw}"


def _formal_cap_from_text(text: str) -> str | None:
    """口语 / 场景名 → 正式 web_ready 能力（优先于 gen_）。"""
    blob = (text or "").strip()
    if not blob:
        return None
    hits = _resolve_matches(blob)
    if hits:
        key = str(hits[0].get("key") or "")
        if key and is_web_ready_capability(key):
            return key
    for aliases, key in _SYNONYM_TO_CAP:
        if any(a in blob for a in aliases) and is_web_ready_capability(key):
            return key
    if any(w in blob for w in ("经费", "团建", "报销", "预算", "借款", "付款", "费用")):
        if is_web_ready_capability("expense_claim"):
            return "expense_claim"
    if any(w in blob for w in ("审批", "申请")) and is_web_ready_capability("approval_flow"):
        return "approval_flow"
    return None


def _enrich_add_op(op: dict[str, Any]) -> dict[str, Any]:
    """补全 capability / widget；页面先出（page_mock），正式能力仍挂真 widget。"""
    label = str(op.get("label") or "").strip()
    if not label:
        return op
    text = label + str(op.get("summary") or "")
    cap = str(op.get("capability_key") or "").strip()
    pending_codegen = False
    cap_def = None

    # LLM 误给 gen_*：若文案能落到正式能力，改回 Path-A（可真提交）
    if cap.startswith("gen_"):
        remapped = _formal_cap_from_text(text)
        if remapped:
            cap = remapped
            pending_codegen = False
        else:
            pending_codegen = True
    elif not cap or cap not in ALL_CAPABILITIES:
        remapped = _formal_cap_from_text(text)
        if remapped:
            cap = remapped
        else:
            cap = _slug_gen_key(label)
            pending_codegen = True

    if cap == "approval_flow":
        for aliases, key in _SYNONYM_TO_CAP:
            if key == "approval_flow":
                continue
            if any(a in text for a in aliases) and key in ALL_CAPABILITIES:
                cap = key
                break

    # 可点按工具 / 小游戏：Path B + 声明式 interactive（泛化，不写死组件）
    blob = f"{label} {text} {op.get('summary') or ''}"
    interactive = op.get("interactive") if isinstance(op.get("interactive"), dict) else None
    if not interactive:
        mock0 = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else {}
        if isinstance(mock0.get("interactive"), dict):
            interactive = mock0.get("interactive")
    if not interactive:
        interactive = _interactive_schema_for_intent(blob)

    if interactive:
        pending_codegen = True
        if not str(cap).startswith("gen_"):
            cap = _slug_gen_key(label or "tool")
        op["capability_key"] = cap
        op["widget"] = "GeneratedPageWidget"
        op["interactive"] = interactive
        mock = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else {}
        op["page_mock"] = {
            **mock,
            "interactive": interactive,
            "ui_kind": "tool_pad",
            "form_title": label or mock.get("form_title") or "交互工具",
            "primary_action": mock.get("primary_action") or "开始",
        }
        # 清掉文字假按键列表
        if isinstance(op["page_mock"].get("list"), list):
            op["page_mock"]["list"] = [
                row
                for row in op["page_mock"]["list"]
                if not any(w in str(row) for w in ("数字按钮", "运算符", "科学函数"))
            ]
        if not op.get("summary"):
            op["summary"] = f"{label}：已按意图泛化为可交互 tool_pad"
        cap_def = None
    elif _looks_like_minigame(blob) and cap != "game_2048":
        cap = _slug_gen_key(label or "minigame")
        pending_codegen = True

    if cap.startswith("gen_"):
        pending_codegen = True
        op["capability_key"] = cap
        op["widget"] = "GeneratedPageWidget"
        cap_def = None
    else:
        cap = ensure_web_ready_key(cap if cap in ALL_CAPABILITIES else "", hint=text)
        if not is_web_ready_capability(cap):
            remapped = _formal_cap_from_text(text)
            if remapped and is_web_ready_capability(remapped):
                cap = remapped
                pending_codegen = False
                op["capability_key"] = cap
                cap_def = ALL_CAPABILITIES.get(cap)
                if cap_def:
                    op["widget"] = cap_def.widget
                    if not op.get("category"):
                        op["category"] = cap_def.category
            else:
                cap = _slug_gen_key(label)
                pending_codegen = True
                op["capability_key"] = cap
                op["widget"] = "GeneratedPageWidget"
                cap_def = None
        else:
            op["capability_key"] = cap
            cap_def = ALL_CAPABILITIES.get(cap)
            if cap_def:
                op["widget"] = cap_def.widget
                if not op.get("category"):
                    op["category"] = cap_def.category
                # 保留用户场景名（如「团建经费审批」）
            else:
                op["widget"] = "ListWidget"
                if not op.get("category"):
                    op["category"] = "自定义"

    if pending_codegen:
        op["pending_codegen"] = True
        if not op.get("category"):
            op["category"] = "自定义"
        if not op.get("summary"):
            op["summary"] = f"{label}：页面已生成预览，业务接口后台异步落地"
    else:
        op.pop("pending_codegen", None)

    if not op.get("summary") and not pending_codegen:
        name = cap_def.name if cap_def else label
        op["summary"] = f"{label}：接入正式能力「{name}」，提交写入真 API"

    kind = str(op.get("page_kind") or "").strip()
    if kind not in _PAGE_KINDS:
        kind = _page_kind_for(cap if not cap.startswith("gen_") else "chat_qa")
    op["page_kind"] = kind

    # UI 先行：一律保留/补齐 page_mock（贴合 label，避免千篇一律）
    mock = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else None
    if not mock:
        op["page_mock"] = _intent_page_mock(label, cap, kind, text)
    else:
        blob = json.dumps(mock, ensure_ascii=False)
        if any(k in blob for k in ("冲压", "换模", "SOP-", "工艺卡")) and not any(
            k in text for k in ("冲压", "换模", "SOP", "工艺", "产线")
        ):
            op["page_mock"] = _intent_page_mock(label, cap, kind, text)
    return op


def _intent_page_mock(label: str, cap: str, kind: str, hint: str = "") -> dict[str, Any]:
    """按用户场景文案生成差异化预览页（非假业务数据冒充真 API）。"""
    ctx = (hint or label).strip()
    blob = f"{label} {ctx}"
    if _looks_like_calculator(blob) or str(cap).startswith("gen_calculator"):
        schema = _interactive_schema_for_intent(blob) or _interactive_schema_for_intent("计算器")
        return {
            "ui_kind": "tool_pad",
            "interactive": schema,
            "form_title": label or "科学计算器",
            "primary_action": "开始计算",
        }
    if kind == "game" or cap == "game_2048":
        return {
            "list_title": "2048",
            "list": [{"id": "tip", "title": "方向键 / 滑动合并数字", "status": "可玩"}],
            "primary_action": "开始游戏",
        }
    if kind == "roster" or cap == "shift_attendance":
        return {
            "list_title": f"{label} · 本周安排",
            "list": [
                {"id": "一", "title": "白班", "status": "正常"},
                {"id": "二", "title": "白班", "status": "正常"},
                {"id": "三", "title": "夜班", "status": "正常"},
            ],
            "primary_action": "提交申诉",
        }
    if kind == "chart" or cap in {"ops_kpi", "chart_dashboard", "mfg_oee"}:
        return {
            "kpis": [
                {"label": "本周", "value": "—", "hint": "接真数据后刷新"},
                {"label": "待办", "value": "—", "hint": "—"},
                {"label": label[:6] or "指标", "value": "—", "hint": "—"},
            ],
            "list_title": f"{label}趋势",
            "primary_action": "刷新数据",
        }
    if kind in {"chat_kb", "files"} or cap in {"chat_qa", "policy_qa", "kb_document"}:
        return {
            "chat_title": f"{label}助手",
            "chat": [
                {"role": "bot", "text": f"已理解「{ctx[:40]}」。可以问规则、查进度或说明办理要点。"},
            ],
            "files_title": "相关资料",
            "files": [f"{label}说明.md"],
            "primary_action": "发送",
        }

    # 办公常见场景：字段随语义变化；日期类必须带 type=date / datetime-local
    if any(w in blob for w in ("请假", "年假", "事假", "病假")):
        fields = [
            {"key": "category", "label": "请假类型", "type": "text", "value": ""},
            {"key": "start_at", "label": "开始日期", "type": "date", "value": ""},
            {"key": "end_at", "label": "结束日期", "type": "date", "value": ""},
            {"key": "note", "label": "事由", "type": "textarea", "value": ""},
        ]
        action = "提交请假"
    elif any(w in blob for w in ("加班",)):
        fields = [
            {"key": "start_at", "label": "开始时间", "type": "datetime-local", "value": ""},
            {"key": "end_at", "label": "结束时间", "type": "datetime-local", "value": ""},
            {"key": "note", "label": "加班事由", "type": "textarea", "value": ""},
        ]
        action = "提交加班"
    elif any(w in blob for w in ("出差", "差旅", "外勤")):
        fields = [
            {"key": "destination", "label": "目的地", "type": "text", "value": ""},
            {"key": "start_at", "label": "出发日期", "type": "date", "value": ""},
            {"key": "end_at", "label": "返回日期", "type": "date", "value": ""},
            {"key": "note", "label": "出差事由", "type": "textarea", "value": ""},
        ]
        action = "提交出差"
    elif any(w in blob for w in ("报销", "发票", "团建", "经费")):
        fields = [
            {"key": "title", "label": "费用类型", "type": "text", "value": "团建经费" if "团建" in blob else ""},
            {"key": "amount", "label": "金额（元）", "type": "number", "value": ""},
            {"key": "note", "label": "事由说明", "type": "textarea", "value": ""},
        ]
        action = "提交报销"
    elif any(w in blob for w in ("借款", "预支")):
        fields = [
            {"key": "amount", "label": "借款金额", "type": "number", "value": ""},
            {"key": "due_date", "label": "预计归还日", "type": "date", "value": ""},
            {"key": "note", "label": "用途", "type": "textarea", "value": ""},
        ]
        action = "提交借款"
    elif any(w in blob for w in ("付款", "对公")):
        fields = [
            {"key": "payee", "label": "收款方", "type": "text", "value": ""},
            {"key": "amount", "label": "付款金额", "type": "number", "value": ""},
            {"key": "note", "label": "合同/单据号", "type": "text", "value": ""},
        ]
        action = "提交付款"
    elif any(w in blob for w in ("会议室", "预约", "会议")):
        fields = [
            {"key": "room_name", "label": "会议室", "type": "text", "value": ""},
            {"key": "start_at", "label": "开始时间", "type": "datetime-local", "value": ""},
            {"key": "end_at", "label": "结束时间", "type": "datetime-local", "value": ""},
            {"key": "title", "label": "会议主题", "type": "text", "value": ""},
        ]
        action = "提交预约"
    elif any(w in blob for w in ("用印", "印章")):
        fields = [
            {"key": "seal_type", "label": "印章类型", "type": "text", "value": ""},
            {"key": "doc_name", "label": "文件名称", "type": "text", "value": ""},
            {"key": "purpose", "label": "用途说明", "type": "textarea", "value": ""},
        ]
        action = "提交用印"
    elif any(w in blob for w in ("入职", "招聘", "办理")):
        fields = [
            {"key": "candidate", "label": "候选人", "type": "text", "value": ""},
            {"key": "join_date", "label": "入职日期", "type": "date", "value": ""},
            {"key": "role", "label": "岗位", "type": "text", "value": ""},
        ]
        action = "提交办理"
    elif any(w in blob for w in ("资产", "领用", "盘点")):
        fields = [
            {"key": "asset_name", "label": "资产名称", "type": "text", "value": ""},
            {"key": "qty", "label": "数量", "type": "number", "value": ""},
            {"key": "assignee", "label": "领用人", "type": "text", "value": ""},
        ]
        action = "提交领用"
    elif any(w in blob for w in ("报障", "IT", "工单", "报修")):
        fields = [
            {"key": "fault", "label": "故障现象", "type": "textarea", "value": ""},
            {"key": "scope", "label": "影响范围", "type": "text", "value": ""},
            {"key": "priority", "label": "紧急程度", "type": "text", "value": ""},
        ]
        action = "提交工单"
    else:
        field_a = "事项说明" if any(w in blob for w in ("审批", "申请")) else "标题"
        field_b = "金额" if any(w in blob for w in ("费", "款", "预算", "付款")) else "负责人"
        field_c = "期望完成日" if any(w in blob for w in ("计划", "排期", "OKR")) else "备注"
        type_b = "number" if "金额" in field_b else "text"
        type_c = "date" if "日" in field_c else ("textarea" if field_c == "备注" else "text")
        fields = [
            {"key": "f_a", "label": field_a, "type": "text", "value": ""},
            {"key": "f_b", "label": field_b, "type": type_b, "value": ""},
            {"key": "f_c", "label": field_c, "type": type_c, "value": ""},
        ]
        action = "提交"

    return {
        "form_title": f"新建 · {label}",
        "fields": fields,
        "list_title": f"{label}记录",
        # 空库提示，禁止假业务条目冒充已有数据
        "list": [],
        "primary_action": action,
    }


def _default_page_mock(label: str, cap: str, kind: str) -> dict[str, Any]:
    return _intent_page_mock(label, cap, kind, label)


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
        # 改标题 / 重命名：优先 rename，禁止误 add
        if _looks_like_title_rename_intent(text):
            rename_ops = _infer_rename_ops(text, menu)
            if rename_ops:
                ops.extend(rename_ops)
        # 改控件意图优先：菜单已有目标则 patch，禁止误 add
        if not ops and _looks_like_ui_patch_intent(text):
            patch_ops = _infer_patch_ops(text, menu)
            if patch_ops:
                ops.extend(patch_ops)
        if not ops and not _looks_like_title_rename_intent(text):
            for add_op in _infer_add_from_text(text):
                lab = str(add_op.get("label") or "")
                # 同名已有则跳过；不同场景标签可共用同一能力 key
                if _menu_has_label(menu, lab):
                    continue
                # 改控件话术且能力已在菜单：不要再 add
                ck = str(add_op.get("capability_key") or "")
                if _looks_like_ui_patch_intent(text) and ck and _menu_has_cap(menu, ck):
                    continue
                ops.append(add_op)
        if not ops:
            ops.extend(_infer_patch_ops(text, menu))

    pending = [
        str(o.get("capability_key"))
        for o in ops
        if o.get("op") == "add"
        and (o.get("pending_codegen") or str(o.get("capability_key") or "").startswith("gen_"))
    ]

    if ops:
        added = [str(o.get("label") or o.get("capability_key") or "") for o in ops if o.get("op") == "add"]
        removed = [str(o.get("label") or "") for o in ops if o.get("op") == "remove"]
        patched = [str(o.get("label") or "") for o in ops if o.get("op") == "patch_page"]
        renamed = [
            f"{o.get('from')}→{o.get('to')}"
            for o in ops
            if o.get("op") == "rename"
        ]
        parts = []
        if added and pending:
            parts.append(f"已理解并挂上页面：{'、'.join(added)}")
            parts.append("可先打开菜单体验；未匹配正式能力的接口将异步生成")
        elif added:
            parts.append(f"已挂上：{'、'.join(added)}")
            parts.append("打开菜单即可办理（正式能力走真 API，空库为空列表）")
        if removed:
            parts.append(f"已移除：{'、'.join(removed)}")
        if renamed:
            parts.append(f"已改名：{'、'.join(renamed)}")
        if patched:
            parts.append(f"已改控件：{'、'.join(patched)}（日期/时间改为原生选择器，打开左侧菜单即可体验）")
        reply = "；".join(parts) + "。"
    else:
        hits = _resolve_matches(text)
        if _looks_like_title_rename_intent(text):
            reply = (
                "已理解你想改标题/菜单名，但没定位到目标项。"
                "请说明从哪个名字改到哪个（如「把请假审批改成事假申请」）。"
            )
        elif _looks_like_ui_patch_intent(text):
            reply = (
                "已理解你想改表单交互，但当前菜单里没定位到目标场景。"
                "请说明要改哪一项（如「请假审批」或「费用报销」）。"
            )
        elif hits:
            tips = "、".join(f"{h['label']}({h['key']})" for h in hits[:3])
            reply = f"理解到可能相关能力：{tips}。可以说「加上{hits[0]['label']}」直接挂进菜单。"
        else:
            reply = (
                "已收到。请用自然语言描述新页面/功能（如「加一个团建经费审批」「要一个季度 OKR 看板」），"
                "或说明要改哪个已有表单的控件（如「请假开始结束日期改成日期选择」）。"
            )

    return {
        "reply": reply,
        "ops": ops,
        "intent_summary": (ops and "按本地语义匹配落地页面/能力") or "待澄清",
        "matched": _resolve_matches(text)[:5],
        "source": "fallback",
        "llm_configured": bool(settings.deepseek_api_key),
        "pending_codegen_keys": pending,
    }


def _merge_llm_with_matches(
    ops: list[dict[str, Any]],
    instruction: str,
    menu: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """LLM 未产出 add/patch 时，用本地匹配补齐；已有 add 则按匹配纠正错误 key。"""
    has_add = any(o.get("op") == "add" for o in ops)
    has_patch = any(o.get("op") == "patch_page" for o in ops)
    has_mutate = any(o.get("op") in {"remove", "rename", "move"} for o in ops)

    if not has_add and not has_mutate and not has_patch:
        for add_op in _infer_add_from_text(instruction):
            lab = str(add_op.get("label") or "")
            if _menu_has_label(menu, lab):
                continue
            ops.append(add_op)
        if not any(o.get("op") == "add" for o in ops):
            ops.extend(_infer_patch_ops(instruction, menu))
        return ops

    # 改控件意图但 LLM 没出 patch：本地补
    if not has_patch and _looks_like_ui_patch_intent(instruction):
        ops.extend(_infer_patch_ops(instruction, menu))

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

    reply = sanitize_llm_plain_text(str(data.get("reply") or ""))
    intent_summary = sanitize_llm_plain_text(str(data.get("intent_summary") or ""))
    ops_raw = data.get("ops") if isinstance(data.get("ops"), list) else []
    ops: list[dict[str, Any]] = []
    for op in ops_raw:
        if not isinstance(op, dict):
            continue
        kind = str(op.get("op") or "").strip()
        if kind not in {"add", "remove", "rename", "move", "patch_page"}:
            continue
        if kind == "patch_page":
            cleaned_patch = _clean_patch_op(op)
            if cleaned_patch:
                ops.append(cleaned_patch)
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
        ck_s = str(ck or "")
        if ck_s.startswith("gen_"):
            cleaned["capability_key"] = ck_s
            cleaned["widget"] = cleaned.get("widget") or "GeneratedPageWidget"
            cleaned["pending_codegen"] = True
        elif ck and (ck not in ALL_CAPABILITIES or not is_web_ready_capability(str(ck))):
            cleaned["capability_key"] = ensure_web_ready_key(
                str(ck or ""),
                hint=str(cleaned.get("label") or instruction),
            )
        if kind == "add":
            cleaned = _enrich_add_op(cleaned)
        ops.append(cleaned)

    ops = _merge_llm_with_matches(ops, q, menu_list)
    # 再次 enrich（纠正后的 key）
    ops = [_enrich_add_op(o) if o.get("op") == "add" else o for o in ops]

    # 改标题意图：丢掉误 add，优先本地 rename
    if _looks_like_title_rename_intent(q):
        renames = [o for o in ops if o.get("op") == "rename"]
        if not renames:
            renames = _infer_rename_ops(q, menu_list)
        ops = [o for o in ops if o.get("op") != "add"]
        if renames:
            # 保留非 add 的其它操作，但 rename 放前面
            rest = [o for o in ops if o.get("op") != "rename"]
            ops = renames + rest

    # 去重：同 label 已在菜单或本批重复；同 capability 允许不同场景页；patch 不去重菜单已有
    deduped: list[dict[str, Any]] = []
    seen_labels: set[str] = set()
    seen_patches: set[str] = set()
    for o in ops:
        if o.get("op") == "add":
            lab = str(o.get("label") or "").strip()
            if not lab or lab in seen_labels or _menu_has_label(menu_list, lab):
                continue
            seen_labels.add(lab)
        if o.get("op") == "patch_page":
            lab = str(o.get("label") or "").strip()
            if not lab or lab in seen_patches:
                continue
            # 菜单必须能对上
            if not _menu_has_label(menu_list, lab) and not any(
                str(m.get("capability_key") or "") == str(o.get("capability_key") or "")
                for m in menu_list
                if o.get("capability_key")
            ):
                continue
            seen_patches.add(lab)
        deduped.append(o)
    ops = deduped

    pending = [
        str(o.get("capability_key"))
        for o in ops
        if o.get("op") == "add" and (o.get("pending_codegen") or str(o.get("capability_key") or "").startswith("gen_"))
    ]

    patched = [str(o.get("label")) for o in ops if o.get("op") == "patch_page"]
    added = [str(o.get("label")) for o in ops if o.get("op") == "add"]

    if not ops:
        # 禁止空 ops 却谎称已更新
        if not reply or any(w in reply for w in ("已更新", "已改", "页面已", "已将")):
            if _looks_like_ui_patch_intent(q):
                reply = (
                    "已理解你想改表单交互，但未能落到可执行修改。"
                    "请指明菜单项名称（如「请假审批」「费用报销」），我会写入字段控件配置。"
                )
            else:
                reply = (
                    intent_summary
                    or "我理解了你的说法，但这次没有改到菜单或控件。请更具体说明要加什么页面，或改哪个字段。"
                )
    elif not reply or reply == "已更新":
        if patched and pending:
            reply = (
                f"已改控件：{'、'.join(patched)}；并挂上 {'、'.join(added)}。"
                "可先打开左侧菜单体验；未覆盖接口将异步生成。"
            )
        elif patched:
            reply = (
                f"已按你的要求改控件：{'、'.join(patched)}。"
                "开始/结束日期现为原生日期（或时间）选择器，打开左侧菜单即可体验；仍走原有真 API。"
            )
        elif added and pending:
            reply = (
                f"已理解并挂上页面：{'、'.join(added)}。"
                "可先在菜单打开使用；未匹配正式能力的接口将异步生成。"
            )
        elif added:
            reply = f"理解需求后已挂上：{'、'.join(added)}。打开菜单即可办理（正式能力走真 API）。"
        elif intent_summary:
            reply = intent_summary

    return {
        "reply": reply or ("已应用修改。" if ops else "未改动，请补充说明。"),
        "ops": ops,
        "intent_summary": intent_summary,
        "matched": local_matches,
        "source": "deepseek",
        "llm_configured": True,
        "pending_codegen_keys": pending,
    }
