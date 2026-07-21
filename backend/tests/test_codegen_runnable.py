"""codegen 生成 + 静默校验冒烟。"""

from __future__ import annotations

from app.services.codegen_deepseek import _fallback_html_for, _snake_fallback_html
from app.services.codegen_verify import verify_full
from app.services.compose_edit import compose_edit_from_instruction


def test_snake_fallback_verifies():
    html, tests = _fallback_html_for("贪吃蛇", "加一个贪吃蛇")
    report = verify_full(html=html, unit_tests=tests)
    assert report["ok"], report.get("errors")
    assert "<canvas" in html.lower()


def test_compose_snake_pending_codegen_not_form():
    r = compose_edit_from_instruction(instruction="加一个贪吃蛇小游戏", menu=[], capability_keys=[])
    ops = r.get("ops") or []
    assert ops, r
    add = next(o for o in ops if o.get("op") == "add")
    assert add.get("pending_codegen") is True
    assert add.get("page_kind") == "generated_code"
    assert not add.get("form_fields")
    assert (add.get("page_mock") or {}).get("ui_kind") == "generated_code"


def test_snake_html_has_controls():
    html = _snake_fallback_html("贪吃蛇")
    assert "keydown" in html or "Arrow" in html
    assert "再来" in html
