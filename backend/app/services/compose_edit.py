"""Runtime / 预览页：自然语言改菜单（大模型 JSON）。"""

from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES
from app.services.deepseek_client import deepseek_json_chat
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

_PAGE_KINDS = ("form_list", "chat_kb", "chart", "roster", "notify", "approval", "files")

_SYSTEM = f"""你是积木仓 Runtime 页面编排助手。用户用中文描述要怎么改当前应用菜单/场景。
根据当前 menu 与可用 capability keys，输出 JSON（不要 markdown）：
{{
  "reply": "用一两句中文说明你做了什么",
  "ops": [
    {{
      "op":"add",
      "label":"场景名",
      "capability_key":"registry_key",
      "category":"分类",
      "summary":"一句业务说明",
      "page_kind":"form_list|chat_kb|chart|roster|notify|approval|files",
      "page_mock":{{
        "form_title":"表单标题",
        "fields":[{{"label":"字段名","value":"示例值"}}],
        "list_title":"列表标题",
        "list":[{{"id":"编号","title":"标题","status":"状态"}}],
        "chat_title":"对话标题",
        "chat":[{{"role":"bot|user","text":"内容"}}],
        "files_title":"资料标题",
        "files":["文件名.pdf"],
        "kpis":[{{"label":"指标","value":"数值","hint":"备注"}}],
        "primary_action":"主按钮文案"
      }}
    }},
    {{"op":"remove","label":"场景名"}},
    {{"op":"rename","from":"旧名","to":"新名"}},
    {{"op":"move","label":"场景名","index":0}}
  ]
}}
规则：
1. capability_key 必须来自可用列表；按语义选最贴切的（请假→leave_request，报销→expense_claim，报修→device_repair）；不确定再用 chat_qa。
2. 新增场景必须带 summary、page_kind、page_mock，且 page_mock 内容必须与场景业务一致，禁止套用无关行业样板（例如请假场景不得出现冲压/SOP/工艺）。
3. page_mock 字段按 page_kind 填写：form_list/approval 用 fields+list；chat_kb 用 chat+files；chart 用 kpis；roster/notify 用 list。
4. ops 可为空（仅回答问题时）。
5. {NO_MARKDOWN_STYLE_RULE}
"""


def _catalog_brief() -> str:
    rows = []
    for key, cap in ALL_CAPABILITIES.items():
        rows.append(f"{key}:{cap.name}")
    return ", ".join(rows)


def _infer_add_from_text(text: str) -> dict[str, Any] | None:
    """本地兜底：从指令推断新增场景。"""
    m = re.search(r"(?:增加|添加|加上|新建|加一个|加个)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,20})", text)
    label = (m.group(1).strip() if m else "").strip("「」『』\"'")
    if not label:
        for hint in ("请假", "报销", "入职", "报修", "考勤", "培训"):
            if hint in text and "去掉" not in text and "删除" not in text:
                label = {
                    "请假": "请假管理",
                    "报销": "报销记账",
                    "入职": "招聘入职",
                    "报修": "设备报修",
                    "考勤": "排班考勤",
                    "培训": "技能培训",
                }[hint]
                break
    if not label:
        return None
    return _enrich_add_op({"op": "add", "label": label})


def _enrich_add_op(op: dict[str, Any]) -> dict[str, Any]:
    """补全 capability / page_mock，保证新增场景内容与语义一致。"""
    label = str(op.get("label") or "").strip()
    if not label:
        return op
    text = label + str(op.get("summary") or "")
    cap = str(op.get("capability_key") or "").strip()
    if not cap or cap not in ALL_CAPABILITIES:
        if any(k in text for k in ("请假", "年假", "调休", "病假")):
            cap = "leave_request"
        elif any(k in text for k in ("报销", "费用", "发票")):
            cap = "expense_claim"
        elif any(k in text for k in ("入职", "招聘", "面试")):
            cap = "hire_onboard"
        elif any(k in text for k in ("报修", "故障", "维修")):
            cap = "device_repair"
        elif any(k in text for k in ("考勤", "排班", "班次")):
            cap = "shift_attendance"
        elif any(k in text for k in ("培训", "上岗证")):
            cap = "training_record"
        elif any(k in text for k in ("质检", "检验")):
            cap = "quality_inspect"
        elif any(k in text for k in ("审批", "流程")):
            cap = "approval_flow"
        else:
            cap = "chat_qa"
    op["capability_key"] = cap
    if not op.get("category"):
        op["category"] = getattr(ALL_CAPABILITIES.get(cap), "category", None) or "自定义"
    name = ALL_CAPABILITIES[cap].name if cap in ALL_CAPABILITIES else label
    if not op.get("summary"):
        op["summary"] = f"{label}：{name}场景工作台"

    kind = str(op.get("page_kind") or "").strip()
    if kind not in _PAGE_KINDS:
        if cap in {"leave_request", "expense_claim", "hire_onboard", "approval_flow", "device_repair", "quality_inspect", "material_issue"}:
            kind = "form_list"
        elif cap in {"shift_attendance"}:
            kind = "roster"
        elif cap in {"mfg_oee", "energy_carbon", "chart_dashboard", "data_nl_query"}:
            kind = "chart"
        elif cap in {"maintenance_plan", "notify_inapp"}:
            kind = "notify"
        elif cap in {"kb_document"}:
            kind = "files"
        else:
            kind = "chat_kb"
    op["page_kind"] = kind

    mock = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else {}
    if not mock:
        mock = _default_page_mock(label, cap, kind)
    else:
        # 粗检：请假场景若仍带制造词，覆盖
        blob = json.dumps(mock, ensure_ascii=False)
        if any(k in label for k in ("请假", "报销", "入职")) and any(k in blob for k in ("冲压", "换模", "SOP-", "工艺")):
            mock = _default_page_mock(label, cap, kind)
    op["page_mock"] = mock
    return op


def _default_page_mock(label: str, cap: str, kind: str) -> dict[str, Any]:
    if cap == "leave_request" or "请假" in label:
        return {
            "form_title": "新建请假单",
            "fields": [
                {"label": "请假类型", "value": "年假"},
                {"label": "开始日期", "value": "2026-07-20"},
                {"label": "结束日期", "value": "2026-07-22"},
                {"label": "事由", "value": "家里有事，申请年假 3 天。"},
            ],
            "list_title": "我的请假",
            "list": [
                {"id": "LV-2408", "title": "年假 · 3 天", "status": "审批中"},
                {"id": "LV-2403", "title": "调休 · 1 天", "status": "已通过"},
                {"id": "LV-2399", "title": "病假 · 0.5 天", "status": "已通过"},
            ],
            "primary_action": "提交审批",
        }
    if cap == "expense_claim" or "报销" in label:
        return {
            "form_title": "新建报销单",
            "fields": [
                {"label": "费用类型", "value": "差旅"},
                {"label": "金额", "value": "856.00"},
                {"label": "说明", "value": "客户拜访往返高铁 + 市内交通。"},
            ],
            "list_title": "报销记录",
            "list": [
                {"id": "EX-118", "title": "差旅 856 元", "status": "待财务"},
                {"id": "EX-112", "title": "办公用品 126 元", "status": "已打款"},
            ],
            "primary_action": "提交报销",
        }
    if cap == "hire_onboard" or "入职" in label or "招聘" in label:
        return {
            "form_title": "候选人入职",
            "fields": [
                {"label": "姓名", "value": "陈晓"},
                {"label": "岗位", "value": "生产计划专员"},
                {"label": "预计入职", "value": "2026-08-01"},
            ],
            "list_title": "入职进度",
            "list": [
                {"id": "OB-31", "title": "陈晓 · 资料收集", "status": "进行中"},
                {"id": "OB-28", "title": "周凯 · 账号开通", "status": "待 IT"},
            ],
            "primary_action": "推进下一步",
        }
    if cap == "device_repair" or "报修" in label:
        return {
            "form_title": "新建报修单",
            "fields": [
                {"label": "设备/位置", "value": "A3 冲压线 · 工位 07"},
                {"label": "故障现象", "value": "液压站异响，压力波动。"},
                {"label": "紧急程度", "value": "高"},
            ],
            "list_title": "在办工单",
            "list": [
                {"id": "WO-24016", "title": "注塑机 #2 温控异常", "status": "维修中"},
                {"id": "WO-24015", "title": "传送带偏移", "status": "待接单"},
            ],
            "primary_action": "提交并派工",
        }
    if kind == "roster" or cap == "shift_attendance":
        return {
            "list_title": f"{label} · 本周安排",
            "list": [
                {"id": "一", "title": "白班", "status": "正常"},
                {"id": "二", "title": "白班", "status": "正常"},
                {"id": "三", "title": "夜班", "status": "正常"},
                {"id": "四", "title": "夜班", "status": "正常"},
                {"id": "五", "title": "白班", "status": "正常"},
                {"id": "六", "title": "休", "status": "—"},
                {"id": "日", "title": "休", "status": "—"},
            ],
            "primary_action": "班次申诉",
        }
    if kind == "chart":
        return {
            "kpis": [
                {"label": "本周", "value": "128", "hint": "办结"},
                {"label": "待办", "value": "14", "hint": "处理中"},
                {"label": "通过率", "value": "96%", "hint": "—"},
            ],
            "list_title": f"{label}趋势",
            "primary_action": "刷新数据",
        }
    # chat / kb 默认：围绕场景名，禁止制造 SOP 硬编码
    return {
        "chat_title": f"{label}助手",
        "chat": [
            {"role": "bot", "text": f"你好，我是「{label}」助手，可以帮你查询规则、进度或填写指引。"},
            {"role": "user", "text": f"{label}一般怎么办理？"},
            {"role": "bot", "text": f"先提交申请，系统会按流程流转审批；可在右侧查看相关制度与模板。"},
        ],
        "files_title": "相关资料",
        "files": [f"{label}制度.pdf", f"{label}申请模板.docx", "常见问题.md"],
        "primary_action": "发送",
    }


def _fallback_ops(instruction: str, menu: list[dict[str, Any]]) -> dict[str, Any]:
    text = instruction.strip()
    labels = [str(m.get("label") or "") for m in menu]
    ops: list[dict[str, Any]] = []
    for prefix in ("去掉", "删除", "移除", "关掉"):
        if text.startswith(prefix) or prefix in text[:6]:
            target = text
            for p in ("去掉", "删除", "移除", "关掉"):
                target = target.replace(p, "", 1)
            target = target.strip(" ：:，,")
            for lab in labels:
                if target and (target in lab or lab in target):
                    ops.append({"op": "remove", "label": lab})
                    break
            break
    if not ops:
        add_op = _infer_add_from_text(text)
        if add_op and not any(add_op["label"] in lab or lab in add_op["label"] for lab in labels):
            ops.append(add_op)
    reply = "已按本地规则处理。" if ops else "已收到，请说得更具体，例如「增加请假管理」或「去掉保养计划」。"
    return {"reply": reply, "ops": ops, "source": "fallback", "llm_configured": bool(settings.deepseek_api_key)}


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
        return {"reply": "请输入要修改的内容。", "ops": [], "source": "fallback", "llm_configured": llm_ok}

    if not llm_ok:
        return _fallback_ops(q, menu_list)

    user = (
        f"应用：{app_name or 'Runtime 预览'}\n"
        f"当前菜单：{json.dumps([{'label': m.get('label'), 'key': m.get('key'), 'capability_key': m.get('capability_key')} for m in menu_list], ensure_ascii=False)}\n"
        f"已选能力：{', '.join(keys) if keys else '无'}\n"
        f"可用能力目录：{_catalog_brief()}\n"
        f"用户指令：{q}"
    )
    data = deepseek_json_chat(_SYSTEM, user, temperature=0.2)
    if not isinstance(data, dict):
        return _fallback_ops(q, menu_list)

    reply = sanitize_llm_plain_text(str(data.get("reply") or "已更新"))
    ops_raw = data.get("ops") if isinstance(data.get("ops"), list) else []
    ops: list[dict[str, Any]] = []
    for op in ops_raw:
        if not isinstance(op, dict):
            continue
        kind = str(op.get("op") or "").strip()
        if kind not in {"add", "remove", "rename", "move"}:
            continue
        cleaned: dict[str, Any] = {"op": kind}
        for k in ("label", "from", "to", "capability_key", "category", "summary", "page_kind"):
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

    return {
        "reply": reply or "已更新",
        "ops": ops,
        "source": "deepseek",
        "llm_configured": True,
    }
