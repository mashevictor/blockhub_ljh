#!/usr/bin/env python3
"""CapShip 四维能力定标实测：理解上下文 / 出码 / 前端交互契约 / 接口。

对照 Cursor 式 Agent：有内容、有思考、有进度。
输出每维分数（0–5）与达标线。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

PASS = 0
FAIL = 0
SCORES: dict[str, list[tuple[str, int, str]]] = {}


def ok(dim: str, pts: int, msg: str) -> None:
    global PASS
    PASS += 1
    SCORES.setdefault(dim, []).append((msg, pts, "ok"))
    print(f"  [OK +{pts}] {msg}")


def bad(dim: str, pts: int, msg: str) -> None:
    global FAIL
    FAIL += 1
    SCORES.setdefault(dim, []).append((msg, 0, "fail"))
    print(f"  [FAIL 0/{pts}] {msg}")


def section(t: str) -> None:
    print(f"\n=== {t} ===")


def main() -> int:
    print("=" * 56)
    print(" CapShip × Cursor-like capability scorecard")
    print("=" * 56)

    # ── 1 理解用户上下文 ──
    section("1) 理解用户上下文")
    from app.services.compose_edit import compose_edit_from_instruction

    menu = [
        {"key": "leave_request", "label": "请假申请", "capability_key": "leave_request"},
        {"key": "chat_qa", "label": "智能问答", "capability_key": "chat_qa"},
    ]
    keys = ["leave_request", "chat_qa"]

    r = compose_edit_from_instruction(
        instruction="把智能问答改名叫员工助手",
        menu=menu,
        capability_keys=keys,
        app_name="ctx",
        entry_source="capship_workbench",
        chat_history=[
            {"role": "user", "content": "先看看现在菜单"},
            {"role": "assistant", "content": "当前有请假和智能问答"},
        ],
    )
    if any(o.get("op") == "rename" and o.get("to") == "员工助手" for o in (r.get("ops") or [])):
        ok("context", 2, "多轮上下文下正确 rename")
    else:
        bad("context", 2, f"rename 失败 ops={r.get('ops')}")

    r2 = compose_edit_from_instruction(
        instruction="删掉企微通知这个菜单",
        menu=menu
        + [{"key": "notify_im", "label": "企微通知", "capability_key": "notify_im"}],
        capability_keys=keys + ["notify_im"],
        app_name="ctx",
        entry_source="capship_workbench",
    )
    if any(o.get("op") == "remove" for o in (r2.get("ops") or [])):
        ok("context", 1, "删除意图识别")
    else:
        bad("context", 1, "删除意图失败")

    r3 = compose_edit_from_instruction(
        instruction="加一个设备报修",
        menu=menu,
        capability_keys=keys,
        app_name="ctx",
        entry_source="capship_workbench",
        page_snapshots=[],
    )
    has_intent = bool(r3.get("intent_summary") or r3.get("matched") or r3.get("reply"))
    has_ops = bool(r3.get("ops"))
    if has_intent and has_ops:
        ok("context", 2, f"意图+ops 双通道（intent={bool(r3.get('intent_summary'))} matched={len(r3.get('matched') or [])}）")
    else:
        bad("context", 2, "缺意图或 ops")

    # ── 2 代码编写 / 智能出页契约 ──
    section("2) 代码编写能力（智能出页契约）")
    from app.services.codegen_jobs import get_codegen_job
    from app.data.blockhub_demo import snake_demo_html

    html = snake_demo_html()
    if "<canvas" in html and "function tick" in html and len(html) > 500:
        ok("codegen", 2, f"演示页 HTML 可玩骨架 len={len(html)}")
    else:
        bad("codegen", 2, "演示 HTML 不合格")

    r4 = compose_edit_from_instruction(
        instruction="做一个可玩的贪吃蛇小游戏页面",
        menu=menu,
        capability_keys=keys,
        app_name="snake",
        entry_source="capship_workbench",
    )
    pending = r4.get("pending_codegen_keys") or []
    ops4 = r4.get("ops") or []
    if pending or any("gen_" in str(o) or "snake" in str(o).lower() or o.get("pending_codegen") for o in ops4):
        ok("codegen", 2, f"小游戏走 Path B / gen_ · pending={pending[:2]} ops={len(ops4)}")
    else:
        # 也可能直接 foresight add
        if any(o.get("op") == "add" for o in ops4):
            ok("codegen", 1, f"小游戏 add 落地（非 pending）ops={ops4[:1]}")
        else:
            bad("codegen", 2, f"小游戏未出页 ops={ops4}")

    # job API shape
    missing = get_codegen_job("nonexistent-job-id-smoke")
    if missing.get("status") == "failed":
        ok("codegen", 1, "codegen job 查询契约（缺失→failed）")
    else:
        bad("codegen", 1, f"job 契约异常 {missing}")

    from app.services.codegen_jobs import cancel_codegen_job, enqueue_codegen_job

    jid = enqueue_codegen_job(
        app_id="smoke-cancel-app",
        app_name="smoke",
        unknown_keys=["gen_smoke_cancel"],
        prompt="cancel me",
        web_template_id="tabs_portal",
        app_ui_id="bottom_tabs",
    )
    cancelled = cancel_codegen_job(jid)
    if cancelled.get("status") == "cancelled" or cancelled.get("cancel_requested"):
        ok("codegen", 1, f"codegen job 可取消 status={cancelled.get('status')}")
    else:
        bad("codegen", 1, f"cancel 失败 {cancelled}")

    # ── 3 前端渲染与交互 ──
    section("3) 前端渲染与交互（Composer AgentTurn）")
    agent = ROOT / "packages/capship-composer/src/AgentTurn.tsx"
    composer = ROOT / "packages/capship-composer/src/CapShipComposer.tsx"
    api_ts = ROOT / "packages/capship-composer/src/api.ts"
    css = ROOT / "packages/capship-composer/src/styles.css"
    a_txt = agent.read_text(encoding="utf-8")
    c_txt = composer.read_text(encoding="utf-8")
    api_txt = api_ts.read_text(encoding="utf-8")
    css_txt = css.read_text(encoding="utf-8")

    checks = [
        ("AgentTurnBody", "AgentTurnBody" in a_txt and "AgentTurnBody" in c_txt, 1),
        ("SSE 流式思考 askComposeEditStream", "askComposeEditStream" in c_txt and "compose-edit/stream" in api_txt, 1),
        ("出页可恢复 loadCodegenResume", "loadCodegenResume" in c_txt and "findActiveCodegenJob" in c_txt, 1),
        ("工具步可取消 cancelCodegenJob/stopChat", "cancelCodegenJob" in c_txt and "capship-agent-cancel" in a_txt, 1),
        ("出页进度 codegen fill", "capship-agent-codegen-fill" in css_txt and ("'codegen'" in c_txt or '"codegen"' in c_txt), 1),
    ]
    for name, hit, pts in checks:
        (ok if hit else bad)("frontend", pts, name if hit else f"缺失 {name}")

    # ── 4 接口能力 ──
    section("4) 接口能力（compose-edit / SSE / cancel）")
    required = ["reply", "ops", "source"]
    optional_rich = ["intent_summary", "matched", "pending_codegen_keys", "llm_configured"]
    sample = r3
    for f in required:
        if f in sample:
            ok("api", 1, f"必有字段 {f}")
        else:
            bad("api", 1, f"缺字段 {f}")
    rich_n = sum(1 for f in optional_rich if sample.get(f) is not None or f in sample)
    if rich_n >= 2:
        ok("api", 1, f"富字段可用 {rich_n}/{len(optional_rich)}")
    else:
        bad("api", 1, f"富字段不足 {rich_n}")

    from app.services.compose_edit_stream import compose_thinking_steps

    steps = compose_thinking_steps("做一个贪吃蛇", has_images=False)
    if len(steps) >= 3 and any("可玩" in s["label"] or "意图" in s["label"] for s in steps):
        ok("api", 1, f"SSE 思考步骤规划 n={len(steps)}")
    else:
        bad("api", 1, f"思考步骤异常 {steps}")

    src = (ROOT / "backend/app/api/v1/creation.py").read_text(encoding="utf-8")
    if "/compose-edit/stream" in src and "cancel_codegen_job" in src and "find_active_codegen_job" in src:
        ok("api", 1, "creation 暴露 stream + cancel + resume lookup")
    else:
        bad("api", 1, "creation 缺 SSE/cancel/resume 路由")

    # ── 记分板 ──
    section("记分板（达标线：每维 ≥3/5，整体 ≥14/20）")
    total = 0
    max_total = 0
    dim_max = {"context": 5, "codegen": 5, "frontend": 5, "api": 5}
    for dim, max_pts in dim_max.items():
        got = sum(p for _, p, _ in SCORES.get(dim, []))
        got_c = min(got, max_pts)
        total += got_c
        max_total += max_pts
        bar = "█" * got_c + "░" * (max_pts - got_c)
        gate = "PASS" if got_c >= 3 else "NEED"
        print(f"  {dim:10s} {got_c}/{max_pts} {bar}  [{gate}]")

    print(f"\n  TOTAL {total}/{max_total}  fail_checks={FAIL} pass_checks={PASS}")
    print(
        "\n  达标线说明：\n"
        "  · context≥3：口语增删改 + 多轮 chat_history\n"
        "  · codegen≥3：Path B / job 契约 + 可取消\n"
        "  · frontend≥3：SSE 思考 + 出页续跑 + 取消步\n"
        "  · api≥3：reply/ops + stream/cancel 路由\n"
        "  Cursor 对齐：SSE 流式思考、codegen job 可恢复、工具步可取消"
    )
    return 0 if FAIL == 0 and total >= 14 else 1


if __name__ == "__main__":
    raise SystemExit(main())
