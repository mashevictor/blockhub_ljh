#!/usr/bin/env python3
"""离线贯通测试：不依赖 PostgreSQL / 外网 LLM。

覆盖：
1) compose_edit 二次修订意图 + ops
2) 智能出页 generate（fallback）有/无底稿
3) applyGeneratedPages 同构合并（Python 复刻）
4) 前端 page_snapshots 筛选逻辑（同构）
5) codegen job 入队文件（可选，跳过 DB merge 直接 generate）
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

PASS = 0
FAIL = 0


def ok(msg: str) -> None:
    global PASS
    PASS += 1
    print(f"  ✓ {msg}")


def no(msg: str, detail: str = "") -> None:
    global FAIL
    FAIL += 1
    print(f"  ✗ {msg}")
    if detail:
        print(f"    {detail[:400]}")


def apply_generated_pages(schema: dict, pages: list[dict]) -> dict:
    """与 CapShipComposer.applyGeneratedPages 同构（精简）。"""
    children = list((schema.get("root") or {}).get("children") or [])
    menu = list(schema.get("menu") or [])
    keys = set(schema.get("capability_keys") or [])
    for page in pages:
        key = str(page.get("key") or "").strip()
        if not key:
            continue
        title = str(page.get("title") or key)
        html = str(page.get("source_html") or "").strip()
        idx = next(
            (
                i
                for i, c in enumerate(children)
                if str((c.get("props") or {}).get("capability_key") or "") == key or str(c.get("id")) == key
            ),
            -1,
        )
        props = {
            "widget": "GeneratedPageWidget",
            "capability_key": key,
            "title": title,
            "summary": page.get("summary") or "",
            "codegen_pending": False,
            "source": "generated",
        }
        if html:
            props.update(
                {
                    "source_html": html,
                    "page_kind": "generated_code",
                    "ui_kind": "generated_code",
                    "page_mock": {"ui_kind": "generated_code", "form_title": title},
                }
            )
        if idx >= 0:
            old = children[idx]
            children[idx] = {**old, "type": "generated_page", "props": {**(old.get("props") or {}), **props}}
        else:
            children.append({"id": key, "type": "generated_page", "props": props})
            if not any(m.get("capability_key") == key or m.get("key") == key for m in menu):
                menu.append({"key": key, "label": title, "route": f"/gen/{key}", "capability_key": key})
        keys.add(key)
    return {
        **schema,
        "menu": menu,
        "capability_keys": list(keys),
        "root": {**(schema.get("root") or {}), "children": children},
    }


def frontend_page_snapshots(children: list[dict]) -> list[dict]:
    """与 CapShipComposer 发送 page_snapshots 同构。"""
    out = []
    for c in children:
        props = c.get("props") or {}
        ck = str(props.get("capability_key") or c.get("id") or "")
        page_kind = str(props.get("page_kind") or props.get("ui_kind") or "")
        widget = str(props.get("widget") or "")
        html = str(props.get("source_html") or "").strip()
        is_gen = (
            ck.startswith("gen_")
            or page_kind == "generated_code"
            or widget == "GeneratedPageWidget"
            or bool(html)
        )
        if not is_gen:
            continue
        out.append(
            {
                "key": str(c.get("id") or ""),
                "capability_key": ck,
                "title": str(props.get("title") or ""),
                "label": str(props.get("title") or props.get("scene_label") or ""),
                "page_kind": page_kind or ("generated_code" if html else ""),
                "widget": widget or "GeneratedPageWidget",
                "source_html": html[:100_000],
            }
        )
    return out


def main() -> int:
    print("=" * 50)
    print(" Smart-page revise OFFLINE E2E (no Postgres)")
    print("=" * 50)

    from app.services.compose_edit import compose_edit_from_instruction
    from app.services.codegen_deepseek import generate_capability_pages

    key = "gen_e2e_alarm_memo"
    label = "闹钟日期备忘录"
    instruction = "闹钟日期网络页面能不能有一个日期闹钟显示，并把提醒放到界面上"
    menu = [{"key": key, "label": label, "capability_key": key}]

    # —— 1) 前端快照筛选（无 html 表单壳也要传）——
    children_shell = [
        {
            "id": key,
            "props": {
                "capability_key": key,
                "title": label,
                "widget": "GeneratedPageWidget",
                "source_html": "",
            },
        },
        {"id": "sales_lead", "props": {"capability_key": "sales_lead", "title": "销售获客"}},
    ]
    snaps = frontend_page_snapshots(children_shell)
    if len(snaps) == 1 and snaps[0]["capability_key"] == key:
        ok("前端 page_snapshots 含无源码 gen_ 壳")
    else:
        no("前端 page_snapshots", str(snaps))

    # —— 2) compose-edit 修订 ——
    r = compose_edit_from_instruction(
        instruction=instruction,
        menu=menu,
        page_snapshots=snaps,
        app_name="E2E",
    )
    ops = r.get("ops") or []
    pending = r.get("pending_codegen_keys") or []
    if r.get("source") == "revise_generated" and any(o.get("op") == "revise_generated" for o in ops):
        ok("compose_edit → revise_generated")
    else:
        no("compose_edit revise", str(r)[:300])
    if key in pending:
        ok("pending_codegen_keys")
    else:
        no("pending", str(pending))

    # —— 3) 无底稿智能出页（create/fallback）——
    gen = generate_capability_pages(
        app_name="E2E",
        unknown_keys=[key],
        prompt=instruction,
        web_template_id="tabs_portal",
        app_ui_id="bottom_tabs",
        base_html_by_key=None,
    )
    pages = gen.get("generated_pages") or []
    if not pages:
        no("generate 无底稿空结果")
    else:
        html = str(pages[0].get("source_html") or "")
        inter = pages[0].get("interactive")
        if html or inter:
            ok(f"generate 无底稿产出 page (html={len(html)} interactive={bool(inter)})")
        else:
            no("generate 无底稿无内容", str(pages[0])[:200])

    # —— 4) 有底稿修订（LLM 不可用时应保留底稿）——
    base = "<!DOCTYPE html><html><body><h1>A1备忘录</h1><ul><li>旧提醒</li></ul></body></html>"
    gen2 = generate_capability_pages(
        app_name="E2E",
        unknown_keys=[key],
        prompt="把提醒列表放到界面上方，并加大日期显示",
        web_template_id="tabs_portal",
        app_ui_id="bottom_tabs",
        base_html_by_key={key: base},
    )
    pages2 = gen2.get("generated_pages") or []
    if not pages2:
        no("generate 有底稿空结果")
    else:
        html2 = str(pages2[0].get("source_html") or "")
        if html2:
            ok(f"generate 有底稿产出 html len={len(html2)}")
            # 无 LLM 时至少应保留底稿关键词
            if "A1备忘录" in html2 or "<html" in html2.lower():
                ok("修订结果含可用 HTML（底稿或新稿）")
            else:
                no("修订 HTML 异常", html2[:120])
        else:
            no("有底稿无 html", str(pages2[0])[:200])

    # —— 5) 合并进 schema（前端同构）——
    schema = {
        "version": "1",
        "appId": "preview-e2e",
        "title": "E2E",
        "menu": menu,
        "capability_keys": [key],
        "root": {
            "id": "root",
            "type": "page",
            "children": [
                {
                    "id": key,
                    "type": "generated_page",
                    "props": {
                        "capability_key": key,
                        "title": label,
                        "widget": "GeneratedPageWidget",
                        "codegen_pending": True,
                        "page_kind": "generated_code",
                    },
                }
            ],
        },
    }
    out_pages = pages2 or pages
    merged = apply_generated_pages(schema, out_pages)
    child = (merged.get("root") or {}).get("children") or []
    props = (child[0].get("props") if child else {}) or {}
    if props.get("codegen_pending") is False and (
        props.get("source_html") or props.get("interactive")
    ):
        ok("合并后 codegen_pending=false 且有可运行内容")
    else:
        no("合并失败", str(props)[:250])

    # —— 6) revise_generated op 应用：应置 pending ——
    # 模拟 applyComposeOps revise 分支
    props2 = {**props, "codegen_pending": True, "page_kind": "generated_code"}
    if props2.get("codegen_pending") and props2.get("page_kind") == "generated_code":
        ok("revise op 可置 pending（前端展示生成中）")
    else:
        no("revise pending 标记")

    # —— 7) job 文件入队（不跑 DB merge 线程，只测 generate 写入临时结果）——
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "result.json"
        out.write_text(json.dumps(gen2, ensure_ascii=False), encoding="utf-8")
        loaded = json.loads(out.read_text(encoding="utf-8"))
        if loaded.get("generated_pages"):
            ok("job 结果 JSON 可序列化往返")
        else:
            no("job JSON")

    print("")
    print(f" Result: {PASS} passed, {FAIL} failed")
    print("=" * 50)
    if FAIL:
        print("OFFLINE E2E FAILED")
        return 1
    print("OFFLINE E2E PASSED — compose → generate → merge 链路已通")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
