"""数据流自然语言编辑（大模型 JSON）。"""

from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import settings
from app.services.deepseek_client import deepseek_json_chat
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

_SYSTEM = f"""你是积木仓数据流编排助手。用户用中文描述要怎么改模块数据流（步骤顺序与说明）。
根据当前 steps，输出 JSON（不要 markdown）：
{{
  "reply": "用一两句中文说明你做了什么",
  "ops": [
    {{"op":"add","label":"模块名","note":"节点说明","after":"插在该模块之后，可空"}},
    {{"op":"remove","label":"模块名"}},
    {{"op":"rename","from":"旧名","to":"新名"}},
    {{"op":"move","label":"模块名","index":0}},
    {{"op":"note","label":"模块名","note":"新的节点说明"}}
  ]
}}
规则：
1. 只改数据流步骤，不要编造无关业务。
2. ops 可为空（仅回答问题时）。
3. {NO_MARKDOWN_STYLE_RULE}
"""


def _default_note(label: str) -> str:
    hints = {
        "智能问答": "接收提问 · 解析意图",
        "审批流": "生成工单 · 流转审批",
        "知识库": "检索制度 / SOP",
        "请假审批": "提交请假 · 审批流转",
        "请假管理": "提交请假 · 审批流转",
        "设备报修": "报修派工 · 状态回写",
        "数据看板": "聚合指标 · 可视化",
        "站内信": "通知相关人",
    }
    for k, v in hints.items():
        if k in label:
            return v
    return f"处理「{label}」环节"


def _fallback_ops(instruction: str, steps: list[dict[str, Any]]) -> dict[str, Any]:
    text = instruction.strip()
    labels = [str(s.get("label") or "") for s in steps]
    ops: list[dict[str, Any]] = []
    for prefix in ("去掉", "删除", "移除"):
        if prefix in text:
            target = text
            for p in ("去掉", "删除", "移除", "节点", "模块", "步骤"):
                target = target.replace(p, "")
            target = target.strip(" ：:，,")
            for lab in labels:
                if target and (target in lab or lab in target):
                    ops.append({"op": "remove", "label": lab})
                    break
            break
    m = re.search(r"(?:增加|添加|插入|加上)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,16})", text)
    if m and not ops:
        label = m.group(1).strip()
        after = None
        am = re.search(r"(?:在|到)\s*[「『\"]?([^「『」』\"，,。；;\s]{2,16})[」』\"']?\s*(?:后面|之后|后)", text)
        if am:
            after = am.group(1).strip()
        ops.append({"op": "add", "label": label, "note": _default_note(label), "after": after or ""})
    reply = "已按本地规则调整数据流。" if ops else "可以说「在报修后面加审批流」或「去掉知识库」。"
    return {"reply": reply, "ops": ops, "source": "fallback", "llm_configured": bool(settings.deepseek_api_key)}


def flow_edit_from_instruction(
    *,
    instruction: str,
    steps: list[dict[str, Any]] | None = None,
    app_name: str = "",
    available_labels: list[str] | None = None,
) -> dict[str, Any]:
    q = (instruction or "").strip()
    step_list = [s for s in (steps or []) if isinstance(s, dict)]
    avail = [x for x in (available_labels or []) if x]
    llm_ok = bool(settings.deepseek_api_key)
    if len(q) < 1:
        return {"reply": "请输入要修改的内容。", "ops": [], "source": "fallback", "llm_configured": llm_ok}

    if not llm_ok:
        return _fallback_ops(q, step_list)

    user = (
        f"应用：{app_name or 'Runtime'}\n"
        f"当前数据流：{json.dumps([{'label': s.get('label'), 'note': s.get('note'), 'order': s.get('order')} for s in step_list], ensure_ascii=False)}\n"
        f"可选用模块：{', '.join(avail) if avail else '任意业务模块名'}\n"
        f"用户指令：{q}"
    )
    data = deepseek_json_chat(_SYSTEM, user, temperature=0.2)
    if not isinstance(data, dict):
        return _fallback_ops(q, step_list)

    reply = sanitize_llm_plain_text(str(data.get("reply") or "已更新"))
    ops_raw = data.get("ops") if isinstance(data.get("ops"), list) else []
    ops: list[dict[str, Any]] = []
    for op in ops_raw:
        if not isinstance(op, dict):
            continue
        kind = str(op.get("op") or "").strip()
        if kind not in {"add", "remove", "rename", "move", "note"}:
            continue
        cleaned: dict[str, Any] = {"op": kind}
        for k in ("label", "from", "to", "note", "after"):
            if op.get(k) is not None:
                cleaned[k] = str(op.get(k))
        if "index" in op:
            try:
                cleaned["index"] = int(op["index"])
            except (TypeError, ValueError):
                pass
        if kind == "add" and not cleaned.get("note"):
            cleaned["note"] = _default_note(str(cleaned.get("label") or ""))
        ops.append(cleaned)

    return {
        "reply": reply or "已更新",
        "ops": ops,
        "source": "deepseek",
        "llm_configured": True,
    }
