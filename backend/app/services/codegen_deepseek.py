"""DeepSeek：未知能力 → 生成可执行单页 HTML，后台校验通过后再入库。

用户端只看到成品（iframe），不展示生成/校验细节。
计算器等仍可用 tool_pad；可玩/自定义页走 source_html。
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from app.services.codegen_verify import verify_full
from app.services.deepseek_client import deepseek_json_chat

logger = logging.getLogger(__name__)

_SYSTEM = """你是积木仓 BlockHub 的页面代码生成器（产品名：智能出页）。
任务：按用户需求生成**可直接在 iframe 中运行**的完整单文件 HTML（含 CSS/JS）。
只输出 JSON，不要 markdown。

输出格式：
{
  "generated_pages": [
    {
      "key": "gen_xxx",
      "title": "短标题",
      "route": "/gen/xxx",
      "summary": "一句话说明",
      "source_html": "<!DOCTYPE html><html>...</html>",
      "unit_tests": [
        {"name": "core_logic", "code": "/* 纯函数断言，失败请 throw */ if (1+1!==2) throw new Error('math');"}
      ]
    }
  ]
}

规则：
1. source_html 必须是完整 HTML 文档，自包含，可交互（游戏/工具/小玩法），禁止只有「标题+说明」表单壳。
2. 禁止：parent/top、eval、Function、fetch、XMLHttpRequest、WebSocket、document.cookie、localStorage。
3. 核心逻辑尽量写成纯函数；unit_tests 用 Node 可跑的纯 JS（无 DOM），至少 1 条。
4. 若是计算器/计数器/骰子，也可不写 source_html，改写 interactive.type=tool_pad（白名单 ops）。
5. 贪吃蛇等小游戏：必须可键盘或点击操作，有得分或再来一局。
"""

_SYSTEM_REVISE = """你是积木仓 BlockHub 的页面修订器（智能出页 · 二次修订）。
用户已有一版可运行 HTML（A1），现在要根据修改意见产出 A2。
**必须在现有页面基础上改**，保留原玩法/布局精髓，只落实用户点名的改动；禁止无视底稿从零重写成无关页面。
只输出 JSON，格式与新建相同（generated_pages[].source_html 为完整 HTML）。

规则同新建：自包含、可交互、禁止危险 API；unit_tests 至少 1 条。
若底稿是游戏，修订后仍须可玩。
"""


def _slug(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", (text or "").strip()).strip("-")
    ascii_part = re.sub(r"[^a-z0-9]+", "-", s.encode("ascii", "ignore").decode("ascii").lower()).strip("-")
    return (ascii_part or "generated")[:40]


def _looks_interactive_tool(text: str) -> bool:
    t = text or ""
    keys = (
        "计算器", "科学计算", "calculator", "计数器", "counter", "骰子", "随机",
        "按键", "小工具", "模拟手机", "仿苹果", "交互样式", "tool_pad",
    )
    return any(k in t for k in keys)


def _interactive_fallback(title: str, prompt: str) -> dict[str, Any] | None:
    blob = f"{title} {prompt}"
    if any(w in blob for w in ("计算器", "科学计算", "calculator")):
        return {
            "type": "tool_pad",
            "theme": "phone_dark",
            "columns": 4,
            "hint": "tool_pad · 计算器",
            "buttons": [
                {"label": "AC", "style": "fn", "ops": [{"op": "clear_all"}]},
                {"label": "C", "style": "fn", "ops": [{"op": "clear"}]},
                {"label": "÷", "style": "op", "ops": [{"op": "push_binop", "value": "/"}]},
                {"label": "×", "style": "op", "ops": [{"op": "push_binop", "value": "*"}]},
                {"label": "7", "style": "digit", "ops": [{"op": "append_digit", "value": "7"}]},
                {"label": "8", "style": "digit", "ops": [{"op": "append_digit", "value": "8"}]},
                {"label": "9", "style": "digit", "ops": [{"op": "append_digit", "value": "9"}]},
                {"label": "-", "style": "op", "ops": [{"op": "push_binop", "value": "-"}]},
                {"label": "4", "style": "digit", "ops": [{"op": "append_digit", "value": "4"}]},
                {"label": "5", "style": "digit", "ops": [{"op": "append_digit", "value": "5"}]},
                {"label": "6", "style": "digit", "ops": [{"op": "append_digit", "value": "6"}]},
                {"label": "+", "style": "op", "ops": [{"op": "push_binop", "value": "+"}]},
                {"label": "1", "style": "digit", "ops": [{"op": "append_digit", "value": "1"}]},
                {"label": "2", "style": "digit", "ops": [{"op": "append_digit", "value": "2"}]},
                {"label": "3", "style": "digit", "ops": [{"op": "append_digit", "value": "3"}]},
                {"label": "=", "style": "accent", "ops": [{"op": "evaluate"}]},
                {"label": "0", "style": "digit", "ops": [{"op": "append_digit", "value": "0"}]},
                {"label": ".", "style": "digit", "ops": [{"op": "append_dot"}]},
            ],
        }
    if any(w in blob for w in ("计数器", "counter")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 3,
            "hint": "tool_pad · 计数器",
            "buttons": [
                {"label": "+1", "style": "accent", "ops": [{"op": "add", "value": 1}]},
                {"label": "-1", "style": "op", "ops": [{"op": "add", "value": -1}]},
                {"label": "归零", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    if any(w in blob for w in ("骰子", "随机")):
        return {
            "type": "tool_pad",
            "theme": "light",
            "columns": 2,
            "hint": "tool_pad · 随机",
            "buttons": [
                {"label": "掷骰子", "style": "accent", "ops": [{"op": "random_int", "min": 1, "max": 6}]},
                {"label": "重置", "style": "fn", "ops": [{"op": "clear_all"}]},
            ],
        }
    return None


def _snake_fallback_html(title: str) -> str:
    t = (title or "贪吃蛇").replace("<", "")[:40]
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{t}</title>
<style>
body{{margin:0;font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px}}
canvas{{background:#020617;border:2px solid #334155;border-radius:10px;image-rendering:pixelated}}
button{{border:0;border-radius:8px;padding:8px 14px;background:#0d9488;color:#fff;cursor:pointer}}
.row{{display:flex;gap:8px;align-items:center}}
</style></head><body>
<h2 style="margin:0">{t}</h2>
<p style="margin:0;font-size:13px;opacity:.85">方向键 / WASD</p>
<canvas id="c" width="320" height="320"></canvas>
<div class="row"><button type="button" id="go">再来</button><span id="sc">0</span></div>
<script>
(function(){{
const N=16,S=20,C=document.getElementById('c'),X=C.getContext('2d');
let snake,dir,food,score,alive,timer;
function rnd(){{return Math.floor(Math.random()*N)}}
function place(){{let p;do{{p={{x:rnd(),y:rnd()}}}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p}}
function reset(){{snake=[{{x:8,y:8}}];dir={{x:1,y:0}};food=place();score=0;alive=true;
document.getElementById('sc').textContent=score;clearInterval(timer);timer=setInterval(tick,140);draw()}}
function tick(){{if(!alive)return;const h={{x:snake[0].x+dir.x,y:snake[0].y+dir.y}};
if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(s=>s.x===h.x&&s.y===h.y)){{alive=false;draw();return}}
snake.unshift(h);if(h.x===food.x&&h.y===food.y){{score++;document.getElementById('sc').textContent=score;food=place()}}else snake.pop();draw()}}
function draw(){{X.clearRect(0,0,320,320);X.fillStyle='#f59e0b';X.fillRect(food.x*S,food.y*S,S-1,S-1);
X.fillStyle='#34d399';snake.forEach((s,i)=>{{X.fillStyle=i? '#34d399':'#6ee7b7';X.fillRect(s.x*S,s.y*S,S-1,S-1)}});
if(!alive){{X.fillStyle='#f87171';X.font='20px sans-serif';X.fillText('Game Over',100,160)}}}}
window.addEventListener('keydown',e=>{{const k=e.key;if(['ArrowUp','w','W'].includes(k)&&dir.y!==1)dir={{x:0,y:-1}};
if(['ArrowDown','s','S'].includes(k)&&dir.y!==-1)dir={{x:0,y:1}};
if(['ArrowLeft','a','A'].includes(k)&&dir.x!==1)dir={{x:-1,y:0}};
if(['ArrowRight','d','D'].includes(k)&&dir.x!==-1)dir={{x:1,y:0}};e.preventDefault()}});
document.getElementById('go').onclick=reset;reset();
}})();
</script></body></html>"""


def _generic_fallback_html(title: str) -> str:
    t = (title or "互动页").replace("<", "")[:40]
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{t}</title>
<style>
body{{margin:0;font-family:sans-serif;background:#f8fafc;color:#0f172a;display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px}}
button{{border:0;border-radius:10px;padding:12px 20px;background:#0d47a1;color:#fff;font-size:16px;cursor:pointer}}
#n{{font-size:40px;font-weight:700}}
</style></head><body>
<h2 style="margin:0">{t}</h2>
<p style="margin:0;color:#64748b">点击互动</p>
<div id="n">0</div>
<button type="button" id="b">+1</button>
<script>
let n=0;document.getElementById('b').onclick=()=>{{n++;document.getElementById('n').textContent=n}};
</script></body></html>"""


def _fallback_html_for(title: str, prompt: str) -> tuple[str, list[dict[str, Any]]]:
    blob = f"{title} {prompt}"
    if any(w in blob for w in ("贪吃蛇", "snake")):
        return _snake_fallback_html(title or "贪吃蛇"), [
            {"name": "smoke", "code": "if (typeof Math.max !== 'function') throw new Error('env');"}
        ]
    return _generic_fallback_html(title), [
        {"name": "smoke", "code": "if (1+1!==2) throw new Error('math');"}
    ]


def generate_capability_pages(
    *,
    app_name: str,
    unknown_keys: list[str],
    prompt: str,
    web_template_id: str,
    app_ui_id: str,
    base_html_by_key: dict[str, str] | None = None,
) -> dict[str, Any]:
    unknown = [k for k in unknown_keys if k] or ["custom_feature"]
    bases = {str(k): str(v) for k, v in (base_html_by_key or {}).items() if str(v).strip()}
    revising = bool(bases)

    pages_payload = []
    for key in unknown:
        item: dict[str, Any] = {"key": key}
        base = bases.get(key) or ""
        if base:
            item["base_source_html"] = base[:120_000]
            item["mode"] = "revise"
        else:
            item["mode"] = "create"
        pages_payload.append(item)

    user = {
        "app_name": app_name,
        "unknown_capability_keys": unknown,
        "user_prompt": (prompt or "")[:1200],
        "web_template_id": web_template_id,
        "app_ui_id": app_ui_id,
        "mode": "revise" if revising else "create",
        "pages": pages_payload,
        "instruction": "若 mode=revise，请基于 pages[].base_source_html 修订；key 必须与输入一致。",
    }

    raw = deepseek_json_chat(
        system=_SYSTEM_REVISE if revising else _SYSTEM,
        user=json.dumps(user, ensure_ascii=False),
        temperature=0.3 if revising else 0.35,
    )
    result = None
    if isinstance(raw, dict) and (raw.get("generated_pages") or raw.get("generated_flutter_screens")):
        result = _normalize(raw, unknown, prompt)
        # 修订失败时保留底稿，避免退回无关兜底
        if revising and result.get("generated_pages"):
            for p in result["generated_pages"]:
                if not isinstance(p, dict):
                    continue
                k = str(p.get("key") or "")
                html = str(p.get("source_html") or "").strip()
                if not html and k in bases:
                    p["source_html"] = bases[k]
        result = _verify_and_fix(result, unknown, prompt, retry_hint=None, base_html_by_key=bases)

    if not result or not result.get("generated_pages"):
        if revising:
            # 模型失败：仍返回底稿，避免「改不动变空白」
            pages = []
            for key in unknown:
                pages.append(
                    {
                        "key": key if str(key).startswith("gen_") else f"gen_{_slug(key)}",
                        "title": key.replace("gen_", "").replace("_", " ")[:64] or "页面",
                        "route": f"/gen/{_slug(key)}",
                        "summary": (prompt or "修订中")[:400],
                        "source_html": bases.get(key) or _fallback_html_for("页面", prompt or "")[0],
                        "unit_tests": [{"name": "smoke", "code": "if (1+1!==2) throw new Error('math');"}],
                        "source": "revise_keep_base",
                    }
                )
            result = {"generated_pages": pages, "generated_flutter_screens": [], "llm": False}
        else:
            result = _fallback(app_name, unknown, prompt)
            result = _verify_and_fix(result, unknown, prompt, retry_hint=None)

    return result


def _verify_and_fix(
    result: dict[str, Any],
    unknown: list[str],
    prompt: str,
    retry_hint: str | None,
    base_html_by_key: dict[str, str] | None = None,
) -> dict[str, Any]:
    bases = base_html_by_key or {}
    pages = list(result.get("generated_pages") or [])
    fixed: list[dict[str, Any]] = []
    for i, page in enumerate(pages):
        if not isinstance(page, dict):
            continue
        key = str(page.get("key") or unknown[min(i, len(unknown) - 1)])
        title = str(page.get("title") or key)
        html = str(page.get("source_html") or "").strip()
        tests = page.get("unit_tests") if isinstance(page.get("unit_tests"), list) else []
        interactive = page.get("interactive") if isinstance(page.get("interactive"), dict) else None

        if interactive and interactive.get("type") == "tool_pad":
            fixed.append(page)
            continue

        if not html:
            if key in bases:
                html = bases[key]
                page = {**page, "source_html": html}
            else:
                html, tests = _fallback_html_for(title, prompt)
                page = {**page, "source_html": html, "unit_tests": tests}

        report = verify_full(html=str(page.get("source_html") or ""), unit_tests=tests if isinstance(tests, list) else [])
        if not report.get("ok"):
            logger.info("smart_page verify fail %s: %s", title, report.get("errors"))
            if key in bases and bases[key].strip():
                # 修订校验失败：保留可用底稿，不整页换成无关兜底
                page = {
                    **page,
                    "source_html": bases[key],
                    "summary": str(page.get("summary") or title)[:400],
                    "source": "revise_keep_base_verify_fail",
                }
            else:
                html2, tests2 = _fallback_html_for(title, prompt)
                page = {
                    **page,
                    "source_html": html2,
                    "unit_tests": tests2,
                    "summary": str(page.get("summary") or title)[:400],
                }
        page.pop("blocks", None)
        fixed.append(page)

    result = {**result, "generated_pages": fixed}
    return result


def _normalize_interactive(raw: Any, title: str, prompt: str) -> dict[str, Any] | None:
    if isinstance(raw, dict) and raw.get("type") == "tool_pad" and isinstance(raw.get("buttons"), list):
        buttons = []
        for b in raw.get("buttons") or []:
            if not isinstance(b, dict):
                continue
            label = str(b.get("label") or "").strip()
            ops = b.get("ops")
            if not label or not isinstance(ops, list) or not ops:
                continue
            buttons.append(
                {
                    "label": label[:8],
                    "style": str(b.get("style") or "digit")[:12],
                    "ops": ops[:6],
                }
            )
        if buttons:
            return {
                "type": "tool_pad",
                "theme": str(raw.get("theme") or "phone_dark"),
                "columns": int(raw.get("columns") or 4),
                "hint": str(raw.get("hint") or "")[:120],
                "buttons": buttons[:48],
            }
    return _interactive_fallback(title, prompt) if _looks_interactive_tool(f"{title} {prompt}") else None


def _normalize(raw: dict[str, Any], unknown: list[str], prompt: str = "") -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for i, p in enumerate(raw.get("generated_pages") or []):
        if not isinstance(p, dict):
            continue
        orig = unknown[min(i, len(unknown) - 1)] if unknown else ""
        raw_key = str(p.get("key") or orig or "generated")
        if str(orig).startswith("gen_"):
            key = str(orig)
        elif raw_key.startswith("gen_"):
            key = raw_key
        else:
            key = f"gen_{_slug(raw_key)}"
        title = str(p.get("title") or key)[:64]
        route = str(p.get("route") or f"/gen/{_slug(key)}")
        if not route.startswith("/"):
            route = f"/{route}"
        source_html = str(p.get("source_html") or p.get("html") or "").strip()
        unit_tests = p.get("unit_tests") if isinstance(p.get("unit_tests"), list) else []
        interactive = _normalize_interactive(p.get("interactive"), title, prompt)
        page: dict[str, Any] = {
            "key": key,
            "title": title,
            "route": route if "/gen/" in route or route.startswith("/s/") else f"/gen/{_slug(key)}",
            "summary": str(p.get("summary") or "")[:400],
            "source": "deepseek",
        }
        if source_html:
            page["source_html"] = source_html[:_MAX_KEEP]
            page["unit_tests"] = [
                {"name": str(t.get("name") or f"t{j}"), "code": str(t.get("code") or "")[:4000]}
                for j, t in enumerate(unit_tests[:12])
                if isinstance(t, dict) and t.get("code")
            ]
        elif interactive:
            page["interactive"] = interactive
            page["blocks"] = [{"type": "paragraph", "text": "可交互工具", "items": []}]
        else:
            # 留给 verify 阶段补 fallback html
            page["source_html"] = ""
            page["unit_tests"] = []
        pages.append(page)

    screens: list[dict[str, Any]] = []
    for i, s in enumerate(raw.get("generated_flutter_screens") or []):
        if not isinstance(s, dict):
            continue
        key = _slug(str(s.get("key") or unknown[min(i, len(unknown) - 1)]))
        screens.append(
            {
                "key": f"gen_{key}",
                "title": str(s.get("title") or key)[:64],
                "route": str(s.get("route") or f"/gen/{key}"),
                "body": str(s.get("body") or "")[:2000],
                "actions": [str(a)[:80] for a in (s.get("actions") or [])][:8],
                "source": "deepseek",
            }
        )

    if not pages:
        return _fallback("应用", unknown, prompt)
    if not screens:
        screens = [
            {
                "key": p["key"],
                "title": p["title"],
                "route": p["route"],
                "body": p.get("summary") or p["title"],
                "actions": ["返回"],
                "source": "deepseek",
            }
            for p in pages
        ]
    return {
        "generated_pages": pages,
        "generated_flutter_screens": screens,
        "llm": True,
    }


_MAX_KEEP = 180_000


def _fallback(app_name: str, unknown: list[str], prompt: str) -> dict[str, Any]:
    pages = []
    screens = []
    for key in unknown:
        page_key = key if str(key).startswith("gen_") else f"gen_{_slug(key)}"
        slug = _slug(key)
        title = key if any("\u4e00" <= c <= "\u9fff" for c in key) else key.replace("_", " ").title()
        if str(key).startswith("gen_"):
            title = key.replace("gen_", "").replace("_", " ")[:64] or title
        # 用 prompt/label 做更好标题
        if prompt and any("\u4e00" <= c <= "\u9fff" for c in prompt):
            for w in ("贪吃蛇", "俄罗斯方块", "扫雷", "打砖块", "消消乐"):
                if w in prompt:
                    title = w
                    break
        route = f"/gen/{slug}"
        interactive = _interactive_fallback(title, prompt or "")
        page: dict[str, Any] = {
            "key": page_key,
            "title": title[:64],
            "route": route,
            "summary": (prompt or title)[:400],
            "source": "fallback",
        }
        if interactive:
            page["interactive"] = interactive
        else:
            html, tests = _fallback_html_for(title, prompt or "")
            page["source_html"] = html
            page["unit_tests"] = tests
        pages.append(page)
        screens.append(
            {
                "key": page_key,
                "title": title[:64],
                "route": route,
                "body": page.get("summary") or title,
                "actions": ["返回"],
                "source": "fallback",
            }
        )
    return {
        "generated_pages": pages,
        "generated_flutter_screens": screens,
        "llm": False,
    }
