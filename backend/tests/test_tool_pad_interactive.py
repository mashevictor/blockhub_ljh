"""interactive / tool_pad 声明式 schema 冒烟（无 DB）。"""

from __future__ import annotations

from app.services.compose_edit import _interactive_schema_for_intent


def test_calculator_tool_pad():
    schema = _interactive_schema_for_intent("科学计算器")
    assert schema and schema.get("type") == "tool_pad"
    assert isinstance(schema.get("buttons"), list) and len(schema["buttons"]) >= 4
    assert all("ops" in b for b in schema["buttons"])


def test_counter_and_dice():
    assert _interactive_schema_for_intent("做一个计数器")["type"] == "tool_pad"
    assert _interactive_schema_for_intent("掷骰子小工具")["type"] == "tool_pad"
