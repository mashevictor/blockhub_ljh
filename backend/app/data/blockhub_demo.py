"""积木仓演示页面 — 默认办公/模块空选时的丰富场景 SSOT。

Free 可用（industry_key=office，不占行业包配额）；布局按独立站侧栏工作台交付。
贪吃蛇为 Path B 内嵌 HTML（gen_snake），与 game_2048 / game_support 一并挂出。
"""

from __future__ import annotations

from typing import Any

BLOCKHUB_DEMO_NAME = "积木仓演示页面"

# 与首页「自由搭配」默认勾选、空能力回退一致：主业务在前，通知/看板垫后
BLOCKHUB_DEMO_KEYS: list[str] = [
    "game_2048",
    "game_support",
    "leave_request",
    "expense_claim",
    "approval_flow",
    "hire_onboard",
    "policy_qa",
    "kb_document",
    "legal_case",
    "ops_kpi",
    "chat_qa",
    "chart_dashboard",
    "notify_inapp",
]

SNAKE_DEMO_KEY = "gen_snake"
SNAKE_DEMO_TITLE = "贪吃蛇小游戏"
SNAKE_DEMO_ROUTE = "/gen/snake"


def snake_demo_html(title: str = SNAKE_DEMO_TITLE) -> str:
    """紧凑可玩贪吃蛇：首屏内可见方向键与再来一局（约 520px 高）。"""
    t = (title or SNAKE_DEMO_TITLE).replace("<", "")[:40]
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{t}</title>
<style>
*{{box-sizing:border-box}}
body{{margin:0;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 12px 16px}}
h2{{margin:0;font-size:16px;font-weight:700}}
.meta{{margin:0;font-size:12px;opacity:.8}}
canvas{{background:#020617;border:2px solid #334155;border-radius:10px;image-rendering:pixelated;touch-action:none;display:block}}
button{{border:0;border-radius:8px;padding:8px 12px;background:#0d9488;color:#fff;cursor:pointer;font-size:13px;min-width:40px;min-height:40px}}
.pad{{display:grid;grid-template-columns:40px 40px 40px;gap:5px;justify-items:center}}
.pad .u{{grid-column:2}}.pad .l{{grid-column:1;grid-row:2}}.pad .d{{grid-column:2;grid-row:2}}.pad .r{{grid-column:3;grid-row:2}}
.row{{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;font-size:13px}}
#msg{{min-height:16px;font-size:12px;color:#fbbf24;margin:0}}
</style></head><body>
<h2>{t}</h2>
<p class="meta">方向键 / WASD / 下方按钮 · 得分 <b id="sc">0</b></p>
<canvas id="c" width="280" height="280" tabindex="0"></canvas>
<p id="msg"></p>
<div class="row"><button type="button" id="go">再来一局</button></div>
<div class="pad" aria-label="方向">
<button type="button" class="u" data-d="u">↑</button>
<button type="button" class="l" data-d="l">←</button>
<button type="button" class="d" data-d="d">↓</button>
<button type="button" class="r" data-d="r">→</button>
</div>
<script>
(function(){{
const N=14,S=20,C=document.getElementById('c'),X=C.getContext('2d'),MSG=document.getElementById('msg');
let snake,dir,food,score,alive,timer,pending=null;
function rnd(){{return Math.floor(Math.random()*N)}}
function place(){{let p;do{{p={{x:rnd(),y:rnd()}}}}while(snake.some(s=>s.x===p.x&&s.y===p.y));return p}}
function setDir(nx,ny){{if(!alive)return;if(nx===-dir.x&&ny===-dir.y)return;pending={{x:nx,y:ny}}}}
function reset(){{snake=[{{x:7,y:7}}];dir={{x:1,y:0}};pending=null;food=place();score=0;alive=true;MSG.textContent='';
document.getElementById('sc').textContent=score;clearInterval(timer);timer=setInterval(tick,140);draw();try{{C.focus()}}catch(e){{}}}}
function tick(){{if(!alive)return;if(pending){{dir=pending;pending=null}}
const h={{x:snake[0].x+dir.x,y:snake[0].y+dir.y}};
if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(s=>s.x===h.x&&s.y===h.y)){{alive=false;MSG.textContent='撞到了 · 点「再来一局」';draw();return}}
snake.unshift(h);if(h.x===food.x&&h.y===food.y){{score++;document.getElementById('sc').textContent=score;food=place()}}else snake.pop();draw()}}
function draw(){{X.clearRect(0,0,280,280);X.fillStyle='#f59e0b';X.fillRect(food.x*S,food.y*S,S-1,S-1);
snake.forEach((s,i)=>{{X.fillStyle=i?'#34d399':'#6ee7b7';X.fillRect(s.x*S,s.y*S,S-1,S-1)}});
if(!alive){{X.fillStyle='rgba(15,23,42,.55)';X.fillRect(0,0,280,280);X.fillStyle='#f87171';X.font='bold 20px sans-serif';X.fillText('Game Over',90,145)}}}}
window.addEventListener('keydown',e=>{{
const k=e.key;let handled=true;
if(['ArrowUp','w','W'].includes(k))setDir(0,-1);
else if(['ArrowDown','s','S'].includes(k))setDir(0,1);
else if(['ArrowLeft','a','A'].includes(k))setDir(-1,0);
else if(['ArrowRight','d','D'].includes(k))setDir(1,0);
else handled=false;
if(handled)e.preventDefault();
}});
document.querySelectorAll('.pad button').forEach(b=>b.addEventListener('click',()=>{{
const d=b.getAttribute('data-d');
if(d==='u')setDir(0,-1);if(d==='d')setDir(0,1);if(d==='l')setDir(-1,0);if(d==='r')setDir(1,0);
}}));
document.getElementById('go').onclick=reset;C.addEventListener('click',()=>{{try{{C.focus()}}catch(e){{}}}});reset();
}})();
</script></body></html>"""


def snake_demo_page() -> dict[str, Any]:
    return {
        "key": SNAKE_DEMO_KEY,
        "title": SNAKE_DEMO_TITLE,
        "route": SNAKE_DEMO_ROUTE,
        "summary": "触屏方向键 · 可玩演示",
        "source_html": snake_demo_html(),
        "source": "blockhub_demo",
    }


def is_blockhub_demo_publish(
    *,
    app_name: str = "",
    capability_keys: list[str] | None = None,
    publish_source: str = "",
) -> bool:
    name = (app_name or "").strip()
    if name == BLOCKHUB_DEMO_NAME or "积木仓演示" in name:
        return True
    keys = [k for k in (capability_keys or []) if k and not str(k).startswith("gen_")]
    if not keys:
        return False
    demo = set(BLOCKHUB_DEMO_KEYS)
    # 勾选覆盖演示清单（或超集）→ 按演示页交付
    return demo.issubset(set(keys))


def append_snake_to_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """把贪吃蛇挂进 page_schema（菜单 + children），幂等。"""
    page = snake_demo_page()
    key = SNAKE_DEMO_KEY
    route = SNAKE_DEMO_ROUTE
    title = SNAKE_DEMO_TITLE

    root = dict(schema.get("root") or {})
    children = list(root.get("children") or [])
    menu = list(schema.get("menu") or [])
    keys = list(schema.get("capability_keys") or [])

    if any(
        (
            isinstance(c, dict)
            and (c.get("id") == key or (c.get("props") or {}).get("capability_key") == key)
        )
        for c in children
    ):
        return schema

    props: dict[str, Any] = {
        "widget": "GeneratedPageWidget",
        "capability_key": key,
        "route": route,
        "source": "generated",
        "title": title,
        "summary": page.get("summary") or "",
        "source_html": page["source_html"],
        "page_kind": "generated_code",
        "ui_kind": "generated_code",
        "page_mock": {"ui_kind": "generated_code", "form_title": title},
        "codegen_pending": False,
    }
    children.insert(0, {"id": key, "type": "generated_page", "props": props})
    if not any(isinstance(m, dict) and m.get("route") == route for m in menu):
        menu.insert(0, {"key": key, "label": title, "icon": "game", "route": route})
    if key not in keys:
        keys = [key, *[k for k in keys if k != key]]

    schema = {**schema, "menu": menu, "capability_keys": keys}
    schema["root"] = {**root, "children": children}
    return schema
