#!/usr/bin/env python3
"""端到端：compose-edit 二次修订 → 智能出页 job → 结果含 source_html。

用法（仓库根或 backend）:
  backend/.venv/bin/python scripts/e2e_smart_page_revise.py [BASE_URL]
默认 BASE=http://127.0.0.1:8001
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001").rstrip("/")
API = f"{BASE}/api/v1"

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
        print(f"    {detail[:500]}")


def http_json(method: str, path: str, body: dict | None = None, token: str | None = None) -> tuple[int, dict | list | str]:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw
    except urllib.error.URLError as e:
        raise SystemExit(
            f"无法连接 {API}{path}\n"
            f"原因: {e.reason}\n"
            f"API 可能未启动。请执行:\n"
            f"  sudo systemctl restart blockhub-api\n"
            f"  sleep 2 && curl -s http://127.0.0.1:8001/api/v1/health\n"
            f"  journalctl -u blockhub-api -n 40 --no-pager"
        ) from e


def main() -> int:
    print("=" * 50)
    print(f" Smart-page revise E2E · {BASE}")
    print("=" * 50)

    try:
        code, health = http_json("GET", "/health")
    except SystemExit:
        raise
    except Exception as e:
        no("health", str(e))
        return 1
    if code != 200:
        no("health", str(health))
        return 1
    ok("health")

    code, login = http_json(
        "POST",
        "/auth/login",
        {"email": "admin@trackchat.local", "password": "admin123"},
    )
    if code != 200 or not isinstance(login, dict) or not login.get("access_token"):
        http_json("POST", "/auth/demo-bootstrap", {})
        code, login = http_json(
            "POST",
            "/auth/login",
            {"email": "admin@trackchat.local", "password": "admin123"},
        )
    if code != 200 or not isinstance(login, dict) or not login.get("access_token"):
        no("admin login", str(login))
        return 1
    token = str(login["access_token"])
    ok("admin login")

    key = "gen_e2e_alarm_memo"
    label = "闹钟日期备忘录"
    instruction = "闹钟日期网络页面能不能有一个日期闹钟显示，并把提醒放到界面上"
    menu = [{"key": key, "label": label, "capability_key": key}]
    # 模拟线上表单壳：无 source_html
    snaps_empty = [
        {
            "key": key,
            "capability_key": key,
            "title": label,
            "label": label,
            "widget": "GeneratedPageWidget",
            "page_kind": "",
            "source_html": "",
        }
    ]

    code, result = http_json(
        "POST",
        "/creation/compose-edit",
        {
            "instruction": instruction,
            "app_name": "E2E修订探测",
            "app_id": "preview-e2e-revise",
            "menu": menu,
            "capability_keys": [key],
            "page_snapshots": snaps_empty,
        },
        token=token,
    )
    if code != 200 or not isinstance(result, dict):
        no(f"compose-edit HTTP {code}", str(result))
        return 1

    ops = result.get("ops") or []
    pending = result.get("pending_codegen_keys") or []
    job_id = str(result.get("codegen_job_id") or "")
    op_kinds = [str(o.get("op")) for o in ops if isinstance(o, dict)]

    if "revise_generated" not in op_kinds:
        no("ops 含 revise_generated", f"got {op_kinds} reply={result.get('reply')}")
    else:
        ok("compose-edit → revise_generated")

    if key not in pending:
        no("pending_codegen_keys", str(pending))
    else:
        ok(f"pending includes {key}")

    if not job_id:
        no("codegen_job_id 已下发", str(result.get("reply")))
        print("  (无 job 则前端无法轮询合并，链路未通)")
        return 1
    ok(f"codegen_job_id={job_id}")

    # 带底稿再测一次意图（不强制等 LLM，只校验 ops）
    snaps_html = [
        {
            **snaps_empty[0],
            "source_html": "<!DOCTYPE html><html><body><h1>A1备忘</h1><p>旧版</p></body></html>",
            "page_kind": "generated_code",
        }
    ]
    code2, result2 = http_json(
        "POST",
        "/creation/compose-edit",
        {
            "instruction": "把提醒列表放到界面上方，并加大日期显示",
            "app_name": "E2E修订探测",
            "app_id": "preview-e2e-revise",
            "menu": menu,
            "capability_keys": [key],
            "page_snapshots": snaps_html,
        },
        token=token,
    )
    if code2 == 200 and isinstance(result2, dict):
        kinds2 = [str(o.get("op")) for o in (result2.get("ops") or []) if isinstance(o, dict)]
        if "revise_generated" in kinds2 and result2.get("codegen_job_id"):
            ok("有底稿二次修订仍走 revise_generated + job")
            job_id = str(result2.get("codegen_job_id") or job_id)
        else:
            no("有底稿二次修订", f"ops={kinds2} job={result2.get('codegen_job_id')}")
    else:
        no(f"有底稿 compose-edit HTTP {code2}", str(result2))

    # 轮询 job（最长 ~90s）
    pages = []
    status = ""
    for i in range(60):
        time.sleep(1.5)
        jc, job = http_json("GET", f"/creation/codegen-jobs/{job_id}", token=token)
        if jc != 200 or not isinstance(job, dict):
            # 兼容路径
            jc, job = http_json("GET", f"/creation/codegen-job/{job_id}", token=token)
        if jc != 200 or not isinstance(job, dict):
            continue
        status = str(job.get("status") or "")
        if status == "failed":
            no("codegen job failed", str(job.get("error") or job))
            break
        if status == "ready":
            pages = ((job.get("result") or {}).get("generated_pages")) or []
            ok(f"codegen job ready ({i * 1.5:.0f}s)")
            break
    else:
        no("codegen job 超时", f"last_status={status}")

    if pages:
        p0 = pages[0] if isinstance(pages[0], dict) else {}
        html = str(p0.get("source_html") or "")
        if html and "<html" in html.lower():
            ok(f"generated_pages[0].source_html len={len(html)}")
        else:
            # tool_pad 也可接受
            if isinstance(p0.get("interactive"), dict):
                ok("generated_pages 含 interactive tool_pad")
            else:
                no("结果缺 source_html/interactive", str(p0)[:300])
        if str(p0.get("key") or "") == key or str(p0.get("key") or "").startswith("gen_"):
            ok(f"结果 key={p0.get('key')}")
        else:
            no("结果 key 不对", str(p0.get("key")))
    elif status != "failed":
        no("ready 但无 generated_pages")

    # 前端合并契约：applyGeneratedPages 同构校验
    try:
        sys.path.insert(0, str(__file__).replace("\\", "/").rsplit("/scripts/", 1)[0] + "/backend")
        # 仅验证 compose 单元仍返回 revise（不依赖前端包）
        from app.services.compose_edit import compose_edit_from_instruction

        unit = compose_edit_from_instruction(
            instruction=instruction,
            menu=menu,
            page_snapshots=snaps_empty,
            app_name="unit",
        )
        if unit.get("source") == "revise_generated" and key in (unit.get("pending_codegen_keys") or []):
            ok("compose_edit 单元：无源码壳 → revise_generated")
        else:
            no("compose_edit 单元", str(unit)[:200])
    except Exception as e:
        no("compose_edit 单元 import", str(e))

    print("")
    print(f" Result: {PASS} passed, {FAIL} failed")
    print("=" * 50)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
