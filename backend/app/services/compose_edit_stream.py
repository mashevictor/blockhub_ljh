"""CapShip compose-edit · SSE 思考步骤规划。"""

from __future__ import annotations

from typing import Any


def compose_thinking_steps(instruction: str, *, has_images: bool = False) -> list[dict[str, str]]:
    """按指令启发式给出可流式推送的思考步骤（id/label）。"""
    q = (instruction or "").strip()
    steps: list[dict[str, str]] = [
        {"id": "ctx", "label": "读取当前菜单与对话上下文"},
    ]
    if has_images:
        steps.append({"id": "vision", "label": "识别界面截图内容"})
    if any(w in q for w in ("删", "去掉", "移除", "关掉")):
        steps.append({"id": "intent", "label": "识别删除意图"})
    elif any(w in q for w in ("改名", "改成", "重命名", "叫成")):
        steps.append({"id": "intent", "label": "识别改名意图"})
    elif any(w in q for w in ("贪吃蛇", "小游戏", "2048", "俄罗斯", "可玩")):
        steps.append({"id": "intent", "label": "识别可玩页 / 智能出页意图"})
    elif any(w in q for w in ("审批", "请假", "报销", "报修")):
        steps.append({"id": "intent", "label": "匹配正式业务能力"})
    else:
        steps.append({"id": "intent", "label": "理解改页意图"})
    steps.append({"id": "ops", "label": "规划页面操作（增删改/出页）"})
    steps.append({"id": "apply", "label": "写入预览并核算配额"})
    return steps
