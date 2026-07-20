"""compose-edit：改标题不得默认 add。"""

from __future__ import annotations

from app.services.compose_edit import _fallback_ops, _looks_like_title_rename_intent


def test_title_rename_intent_detected():
    assert _looks_like_title_rename_intent("把请假审批改成事假申请")
    assert _looks_like_title_rename_intent("改一下标题叫团建经费")
    assert not _looks_like_title_rename_intent("加一个请假审批")
    assert not _looks_like_title_rename_intent("请假开始日期改成日期选择")


def test_fallback_rename_not_add():
    menu = [{"label": "请假审批", "capability_key": "leave_request", "key": "leave_request"}]
    out = _fallback_ops("把请假审批改成事假申请", menu)
    ops = out.get("ops") or []
    assert ops and ops[0]["op"] == "rename"
    assert ops[0]["from"] == "请假审批"
    assert ops[0]["to"] == "事假申请"
    assert not any(o.get("op") == "add" for o in ops)


def test_fallback_title_phrase_renames_first_menu():
    menu = [{"label": "费用报销", "capability_key": "expense_claim"}]
    out = _fallback_ops("标题改成差旅报销", menu)
    ops = out.get("ops") or []
    assert ops and ops[0]["op"] == "rename"
    assert ops[0]["to"] == "差旅报销"
