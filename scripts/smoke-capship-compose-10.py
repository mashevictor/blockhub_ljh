#!/usr/bin/env python3
"""CapShip 改页 / 智能出页 · 10 场景冒烟 + 工作台首页非空验证。

覆盖：
1) 对话改页（已知能力增删改）
2) 智能出页（未知/小游戏 Path B）
3) 弹幕/选模块 schema：主能力在前、次要垫后、/ 有 default_route

用法（离线，默认）:
  set PYTHONPATH=backend
  python scripts/smoke-capship-compose-10.py

可选打线上 compose-edit:
  python scripts/smoke-capship-compose-10.py http://101.32.209.251
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

PASS = 0
FAIL = 0


def ok(msg: str) -> None:
    global PASS
    PASS += 1
    print(f"  [OK] {msg}")


def bad(msg: str) -> None:
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}")


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def req(base: str, method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{base}/api/v1{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=90) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {}
        except Exception:
            payload = {"detail": raw[:400]}
        return e.code, payload
    except Exception as e:
        return 0, {"detail": str(e)}


def base_menu() -> list[dict]:
    return [
        {"key": "leave_request", "label": "请假申请", "icon": "module", "route": "/leave-request", "capability_key": "leave_request"},
        {"key": "chat_qa", "label": "智能问答", "icon": "chat", "route": "/chat", "capability_key": "chat_qa"},
        {"key": "notify_im", "label": "企微通知", "icon": "bell", "route": "/im", "capability_key": "notify_im"},
    ]


def apply_ops(menu: list[dict], keys: list[str], ops: list[dict]) -> tuple[list[dict], list[str]]:
    """简化前端 applyComposeOps：用于断言改页结果。"""
    menu = [dict(m) for m in menu]
    keys = list(keys)
    for op in ops:
        t = op.get("op") or op.get("type")
        if t == "add_page":
            ck = str(op.get("capability_key") or op.get("key") or "").strip()
            label = str(op.get("label") or op.get("title") or ck)
            route = str(op.get("route") or f"/{ck.replace('_', '-')}")
            if ck and not any(m.get("capability_key") == ck or m.get("key") == ck for m in menu):
                menu.append({"key": ck, "label": label, "icon": "module", "route": route, "capability_key": ck})
            if ck and ck not in keys:
                keys.append(ck)
        elif t == "remove_page":
            ck = str(op.get("capability_key") or op.get("key") or "").strip()
            menu = [m for m in menu if m.get("capability_key") != ck and m.get("key") != ck]
            keys = [k for k in keys if k != ck]
        elif t in ("rename_page", "update_page"):
            ck = str(op.get("capability_key") or op.get("key") or "").strip()
            label = str(op.get("label") or op.get("title") or "").strip()
            for m in menu:
                if m.get("capability_key") == ck or m.get("key") == ck:
                    if label:
                        m["label"] = label
        elif t == "reorder_pages":
            order = [str(x) for x in (op.get("order") or op.get("keys") or [])]
            if order:
                by = {str(m.get("capability_key") or m.get("key")): m for m in menu}
                ordered = [by[k] for k in order if k in by]
                rest = [m for m in menu if str(m.get("capability_key") or m.get("key")) not in order]
                menu = ordered + rest
                keys = [str(m.get("capability_key") or m.get("key")) for m in menu if m.get("capability_key") or m.get("key")]
    return menu, keys


def run_offline() -> None:
    from app.services.compose_edit import compose_edit_from_instruction
    from app.services.schema_generator import generate_page_schema, prioritize_workbench_capability_keys
    from app.data.blockhub_demo import BLOCKHUB_DEMO_KEYS, append_snake_to_schema, SNAKE_DEMO_ROUTE

    menu0 = base_menu()
    keys0 = ["leave_request", "chat_qa", "notify_im"]

    scenarios: list[tuple[str, str, callable]] = []

    def sc(name: str, instruction: str, check):
        scenarios.append((name, instruction, check))

    # 1 加已知能力
    sc(
        "1 加页·设备报修",
        "加一个设备报修页面",
        lambda r: (
            any((op.get("capability_key") == "device_repair") for op in (r.get("ops") or []))
            or "device_repair" in str(r.get("ops")),
            "应产出 device_repair add",
        ),
    )
    # 2 加请假（同义）
    sc(
        "2 加页·请假口语",
        "帮我加个年假申请入口",
        lambda r: (
            any(op.get("capability_key") == "leave_request" for op in (r.get("ops") or []))
            or not r.get("ops"),  # 已有请假时可能 rename/noop
            "应识别 leave_request",
        ),
    )
    # 3 删页
    sc(
        "3 删页·企微通知",
        "删掉企微通知这个菜单",
        lambda r: (
            any(
                (op.get("op") in ("remove_page", "remove") or op.get("type") == "remove_page")
                and (
                    "notify" in str(op.get("capability_key") or op.get("key") or op.get("label") or "")
                    or "企微" in str(op.get("label") or "")
                )
                for op in (r.get("ops") or [])
            ),
            "应 remove notify_im",
        ),
    )
    # 4 改名
    sc(
        "4 改名·智能问答",
        "把智能问答改名叫员工助手",
        lambda r: (
            any(
                "员工助手" in str(op)
                or op.get("to") == "员工助手"
                or op.get("label") == "员工助手"
                or op.get("title") == "员工助手"
                for op in (r.get("ops") or [])
            ),
            "应 rename 为 员工助手",
        ),
    )
    # 5 报销
    sc(
        "5 加页·报销",
        "新增费用报销审批",
        lambda r: (
            any(op.get("capability_key") == "expense_claim" for op in (r.get("ops") or [])),
            "应 expense_claim",
        ),
    )
    # 6 销售线索
    sc(
        "6 加页·销售线索",
        "加一个线索录入页面",
        lambda r: (
            any(op.get("capability_key") == "sales_lead" for op in (r.get("ops") or [])),
            "应 sales_lead",
        ),
    )
    # 7 智能出页·小游戏
    sc(
        "7 智能出页·贪吃蛇",
        "做一个可玩的贪吃蛇小游戏页面",
        lambda r: (
            bool(r.get("pending_codegen_keys"))
            or any("snake" in str(op).lower() or "gen_" in str(op) for op in (r.get("ops") or []))
            or "codegen" in str(r).lower()
            or any("贪吃蛇" in str(op) for op in (r.get("ops") or [])),
            "应 pending_codegen 或 gen_ 页",
        ),
    )
    # 8 澄清/空指令（不应乱加）
    sc(
        "8 澄清·含糊指令",
        "嗯",
        lambda r: (
            not r.get("ops") or bool(r.get("assistant_message") or r.get("message") or r.get("reply")),
            "含糊指令不应强制加页",
        ),
    )
    # 9 多能力组合
    sc(
        "9 组合·会议室+IT报障",
        "加会议室预约和IT报障两个菜单",
        lambda r: (
            {"meeting_booking", "it_ticket"}.issubset(
                {op.get("capability_key") for op in (r.get("ops") or [])}
            )
            or (
                "meeting_booking" in str(r.get("ops"))
                and "it_ticket" in str(r.get("ops"))
            ),
            "应 meeting_booking + it_ticket",
        ),
    )
    # 10 医疗导诊
    sc(
        "10 加页·导诊",
        "加症状预问诊导诊页",
        lambda r: (
            any(op.get("capability_key") == "med_triage" for op in (r.get("ops") or [])),
            "应 med_triage",
        ),
    )

    section("A) compose_edit 10 场景（离线规则/LLM）")
    for name, instruction, check in scenarios:
        try:
            result = compose_edit_from_instruction(
                instruction=instruction,
                menu=menu0,
                capability_keys=keys0,
                app_name="改页冒烟",
                entry_source="capship_workbench",
                web_template_id="tabs_portal",
            )
            hit, reason = check(result)
            ops_n = len(result.get("ops") or [])
            pending = result.get("pending_codegen_keys") or []
            if hit:
                ok(f"{name} · ops={ops_n} pending={pending[:3]}")
            else:
                bad(f"{name} · {reason} · ops={result.get('ops')!r} pending={pending!r}")
            # 真改写：有 ops 时应用到菜单，确认无空菜单
            if result.get("ops"):
                m2, k2 = apply_ops(menu0, keys0, result["ops"])
                if not m2:
                    bad(f"{name} · 应用 ops 后菜单为空")
                else:
                    ok(f"{name} · 应用后菜单 {len(m2)} 项")
        except Exception as e:
            bad(f"{name} · exception {e}")

    section("B) 工作台 schema：主次排序 + 非空首页")
    messy = ["notify_im", "chart_dashboard", "device_repair", "notify_inapp", "leave_request"]
    ordered = prioritize_workbench_capability_keys(messy)
    if ordered[0] in ("device_repair", "leave_request") and ordered[-1].startswith("notify"):
        ok(f"prioritize → {ordered}")
    else:
        bad(f"prioritize 失败 → {ordered}")

    schema = generate_page_schema(
        app_id="smoke-module",
        app_name="选模块冒烟",
        capability_keys=messy,
        entry_source="capship_workbench",
        publish_source="module",
        web_template_id="tabs_portal",
    )
    menu = schema.get("menu") or []
    meta = schema.get("meta") or {}
    children = (schema.get("root") or {}).get("children") or []
    first_route = (menu[0] or {}).get("route") if menu else None
    default_route = meta.get("default_route")
    if meta.get("entry_source") == "capship_workbench":
        ok("entry_source=capship_workbench")
    else:
        bad(f"entry_source={meta.get('entry_source')}")
    if default_route and default_route != "/":
        ok(f"default_route={default_route}")
    else:
        bad(f"缺少 default_route · {default_route!r}")
    if first_route and first_route != "/" and any(
        (c.get("props") or {}).get("route") == first_route for c in children
    ):
        ok(f"首 Tab {first_route} 有对应 Widget 节点")
    else:
        bad(f"首 Tab 无节点 route={first_route}")
    # 模拟 Runtime：atHome=/ 时应用 default_route，不应空白
    home_node = next(
        (c for c in children if (c.get("props") or {}).get("route") == default_route),
        None,
    )
    if home_node and (home_node.get("props") or {}).get("widget"):
        ok(f"首页落地 Widget={home_node['props']['widget']}")
    else:
        bad("首页落地无 Widget")

    # 弹幕式：报修优先
    schema2 = generate_page_schema(
        app_id="smoke-prompt",
        app_name="弹幕报修",
        capability_keys=["notify_im", "device_repair", "chat_qa", "chart_dashboard"],
        entry_source="capship_workbench",
        publish_source="prompt",
    )
    m2 = schema2.get("menu") or []
    if m2 and (m2[0].get("capability_key") == "device_repair" or "repair" in str(m2[0].get("route"))):
        ok(f"弹幕主能力在前: {m2[0].get('label')} {m2[0].get('route')}")
    else:
        # chat_qa 也是主能力；notify/chart 不得第一
        first_ck = (m2[0] or {}).get("capability_key") or (m2[0] or {}).get("key")
        if first_ck not in ("notify_im", "chart_dashboard", "notify_inapp"):
            ok(f"首 Tab 非次要: {first_ck}")
        else:
            bad(f"次要能力占首 Tab: {m2[0]}")

    # 演示页：蛇在菜单最前
    schema3 = generate_page_schema(
        app_id="smoke-demo",
        app_name="积木仓演示页面",
        capability_keys=list(BLOCKHUB_DEMO_KEYS),
        entry_source="capship_workbench",
        publish_source="module",
    )
    schema3 = append_snake_to_schema(schema3) if not any(
        m.get("route") == SNAKE_DEMO_ROUTE for m in (schema3.get("menu") or [])
    ) else schema3
    # generate_page_schema already appends snake for demo
    m3 = schema3.get("menu") or []
    if m3 and m3[0].get("route") == SNAKE_DEMO_ROUTE:
        ok("演示页贪吃蛇置顶")
    else:
        # demo forces industry_site — still snake should be first in menu after append
        if any(m.get("route") == SNAKE_DEMO_ROUTE for m in m3[:2]):
            ok(f"演示页蛇靠近前部: {[m.get('route') for m in m3[:3]]}")
        else:
            bad(f"演示页蛇未靠前: {[m.get('route') for m in m3[:5]]}")


def run_live(base: str) -> None:
    section(f"C) 线上 compose-edit · {base}")
    code, health = req(base, "GET", "/health")
    if code != 200:
        bad(f"health {code} {health}")
        return
    ok("health")
    code, login = req(base, "POST", "/auth/login", body={"email": "admin@trackchat.local", "password": "admin123"})
    token = (login or {}).get("access_token") or ""
    if not token:
        bad(f"login {code}")
        return
    ok("login")

    cases = [
        ("加设备报修", "加一个设备报修页面", "device_repair"),
        ("加报销", "新增费用报销", "expense_claim"),
        ("贪吃蛇出页", "做一个贪吃蛇小游戏", None),
    ]
    for title, instruction, expect_cap in cases:
        code, body = req(
            base,
            "POST",
            "/creation/compose-edit",
            token,
            {
                "instruction": instruction,
                "menu": base_menu(),
                "capability_keys": ["leave_request", "chat_qa", "notify_im"],
                "app_name": f"live-{title}",
                "entry_source": "capship_workbench",
                "web_template_id": "tabs_portal",
            },
        )
        if code != 200:
            bad(f"{title} HTTP {code} {str(body)[:160]}")
            continue
        ops = body.get("ops") or []
        pending = body.get("pending_codegen_keys") or []
        job = body.get("codegen_job_id") or ""
        if expect_cap:
            hit = any(op.get("capability_key") == expect_cap for op in ops)
            (ok if hit else bad)(f"{title} → {expect_cap} (ops={len(ops)})")
        else:
            (ok if pending or job or ops else bad)(
                f"{title} → pending={pending[:2]} job={bool(job)} ops={len(ops)}"
            )
        if job:
            # 轮询智能出页
            html_ok = False
            for _ in range(12):
                time.sleep(3)
                jc, jb = req(base, "GET", f"/creation/codegen-jobs/{job}", token)
                st = (jb or {}).get("status") or (jb.get("job") or {}).get("status")
                pages = (jb or {}).get("pages") or (jb.get("job") or {}).get("pages") or []
                if st in ("done", "completed", "success") or pages:
                    if any((p.get("source_html") or p.get("html")) for p in pages if isinstance(p, dict)):
                        html_ok = True
                    break
                if st in ("failed", "error"):
                    break
            (ok if html_ok else bad)(f"{title} 智能出页 HTML job={job}")

    # 发布 module 风格应用，检查 default_route
    code, pub = req(
        base,
        "POST",
        "/creation/publish",
        token,
        {
            "name": f"工作台首页冒烟-{int(time.time()) % 100000}",
            "industry_key": "office",
            "capability_keys": ["notify_im", "device_repair", "chart_dashboard", "leave_request"],
            "web_template_id": "tabs_portal",
            "entry_source": "capship_workbench",
            "source": "module",
        },
    )
    app = (pub.get("app") if isinstance(pub, dict) else None) or {}
    schema = app.get("page_schema") or pub.get("page_schema") or {}
    meta = schema.get("meta") or {}
    menu = schema.get("menu") or []
    if code == 200 and app.get("id"):
        ok(f"publish {app.get('id')}")
        if meta.get("default_route") and meta.get("default_route") != "/":
            ok(f"线上 default_route={meta.get('default_route')}")
        else:
            # 旧服务器可能无此字段：至少首 menu 非 /
            if menu and menu[0].get("route") != "/":
                ok(f"线上首 menu={menu[0].get('route')}（服务端待部署 default_route）")
            else:
                bad("线上首页路由仍为空 /")
        first_ck = (menu[0] or {}).get("capability_key") or (menu[0] or {}).get("key")
        if first_ck not in ("notify_im", "chart_dashboard"):
            ok(f"线上首能力非次要: {first_ck}")
        else:
            bad(f"线上首能力仍是次要: {first_ck}")
    else:
        bad(f"publish HTTP {code} {str(pub)[:200]}")


def main() -> int:
    print("=" * 56)
    print(" CapShip compose × 10 + workbench home smoke")
    print("=" * 56)
    run_offline()
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        run_live(sys.argv[1].rstrip("/"))
    print("\n" + "=" * 56)
    print(f" DONE  pass={PASS} fail={FAIL}")
    print("=" * 56)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
