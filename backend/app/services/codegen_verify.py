"""后台静默校验生成页：结构检查 + Node 跑纯函数单测。用户端不展示细节。"""

from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_MAX_HTML = 180_000


def _node_bin() -> str | None:
    return shutil.which("node")


def static_check_html(html: str) -> list[str]:
    errs: list[str] = []
    raw = (html or "").strip()
    if not raw:
        return ["empty html"]
    if len(raw) > _MAX_HTML:
        return [f"html too large ({len(raw)})"]
    low = raw.lower()
    if "<html" not in low and "<!doctype" not in low:
        errs.append("missing html document")
    if "<script" not in low and "<canvas" not in low and "<button" not in low:
        errs.append("no interactive surface")
    # 只拦危险跨窗/动态执行；普通 function 声明允许
    for bad in ("parent.", "top.", "frames[", "eval(", "new function(", "document.cookie"):
        if bad in low:
            errs.append(f"forbidden: {bad}")
    return errs


def run_unit_tests(tests: list[dict[str, Any]]) -> list[str]:
    """tests: [{name, code}] — code 为可在 Node 执行的纯 JS，失败 throw。"""
    node = _node_bin()
    if not node:
        return []  # 无 Node 时跳过单测，仅靠静态检查
    cases = [t for t in tests if isinstance(t, dict) and str(t.get("code") or "").strip()]
    if not cases:
        return []
    payload = [{"name": str(t.get("name") or f"t{i}"), "code": str(t["code"])} for i, t in enumerate(cases[:12])]
    script = """
const cases = JSON.parse(process.argv[1]);
const fails = [];
for (const c of cases) {
  try {
    const fn = new Function(c.code + '\\n;');
    fn();
  } catch (e) {
    fails.push((c.name || 'test') + ': ' + String(e && e.message || e).slice(0, 120));
  }
}
process.stdout.write(JSON.stringify(fails));
"""
    try:
        proc = subprocess.run(
            [node, "-e", script, json.dumps(payload, ensure_ascii=False)],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )
        if proc.returncode != 0 and not (proc.stdout or "").strip():
            return [f"node exit {proc.returncode}: {(proc.stderr or '')[:200]}"]
        out = (proc.stdout or "").strip() or "[]"
        return list(json.loads(out))
    except Exception as exc:
        logger.warning("unit test runner failed: %s", exc)
        return [f"runner error: {exc}"]


def verify_generated_page(*, html: str, unit_tests: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    errs = static_check_html(html)
    errs.extend(run_unit_tests(unit_tests or []))
    return {"ok": len(errs) == 0, "errors": errs}


def extract_scripts_for_syntax(html: str) -> list[str]:
    return re.findall(r"<script[^>]*>(.*?)</script>", html or "", flags=re.I | re.S)


def syntax_check_scripts(html: str) -> list[str]:
    node = _node_bin()
    if not node:
        return []
    errs: list[str] = []
    with tempfile.TemporaryDirectory(prefix="bh_cg_") as tmp:
        tdir = Path(tmp)
        for i, body in enumerate(extract_scripts_for_syntax(html)[:8]):
            body = body.strip()
            if not body or body.startswith("src="):
                continue
            path = tdir / f"s{i}.js"
            path.write_text(body, encoding="utf-8")
            proc = subprocess.run(
                [node, "--check", str(path)],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
            if proc.returncode != 0:
                errs.append(f"script[{i}] syntax: {(proc.stderr or proc.stdout or '')[:160]}")
    return errs


def verify_full(*, html: str, unit_tests: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    report = verify_generated_page(html=html, unit_tests=unit_tests)
    if report["ok"]:
        syn = syntax_check_scripts(html)
        if syn:
            report = {"ok": False, "errors": syn}
    return report
