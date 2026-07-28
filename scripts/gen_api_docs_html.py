#!/usr/bin/env python3
"""Static-scan backend/app/api/v1 and emit a business-oriented HTML API doc."""

from __future__ import annotations

import ast
import html
import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "backend" / "app" / "api" / "v1"
OUT = ROOT / "docs" / "api-reference.html"
API_PREFIX = "/api/v1"

# Business grouping for sidebar (tag/file → section)
SECTION_ORDER = [
    ("平台基础", ["health", "smoke", "auth", "tenant", "billing", "audit", "seed", "stats"]),
    ("目录与交付", ["catalog", "agents", "creation", "runtime", "share", "demo-bookings", "demo_booking"]),
    ("AI 与知识库", ["chat", "kb", "voice", "contracts"]),
    ("审批与通知", ["approvals", "notifications"]),
    ("CapShip 能力包", []),  # catch-all for capability routers
    ("行业运营", [
        "mfg-ops", "finance-ops", "finance-news", "logistics-ops", "realestate-ops",
        "retail-ops", "hotel-ops", "vertical-ops",
    ]),
    ("报表与集成", ["reports", "integrations"]),
]

CORE_LABELS = {
    "health": "健康检查",
    "smoke": "冒烟探测",
    "auth": "认证鉴权",
    "tenant": "租户配置",
    "billing": "计费套餐",
    "audit": "操作审计",
    "seed": "目录种子",
    "stats": "统计概览",
    "catalog": "能力目录",
    "agents": "Agent 目录",
    "creation": "智能创建 / 交付",
    "runtime": "Runtime 运行时",
    "share": "分享分发",
    "demo-bookings": "预约演示",
    "chat": "智能问答",
    "kb": "知识库 RAG",
    "voice": "语音 Agent",
    "contracts": "电子合同",
    "approvals": "通用审批",
    "notifications": "消息通知",
    "reports": "数据报表",
    "integrations": "系统集成",
    "mfg-ops": "制造运营",
    "finance-ops": "金融运营",
    "finance-news": "财经资讯",
    "logistics-ops": "物流运营",
    "realestate-ops": "地产运营",
    "retail-ops": "零售运营",
    "hotel-ops": "酒店运营",
    "vertical-ops": "垂直运营",
}

# Routers mounted with router-level auth in main.py
ROUTER_AUTH = {
    "agents": "JWT*",
    "stats": "JWT*",
    "chat": "JWT*",
    "contracts": "JWT*",
    "kb": "JWT*",
    "approvals": "JWT*",
    "notifications": "JWT*",
    "reports": "JWT*",
    "audit": "JWT*",
    "seed": "PlatformAdmin",
}

CAPABILITY_HINTS = {
    "device-repair": "设备报修",
    "quality-inspect": "质检 SOP",
    "inventory-count": "库存盘点",
    "member-loyalty": "会员营销",
    "med-triage": "医疗导诊",
    "nurse-shift": "护士排班",
    "game-support": "玩家 FAQ",
    "school-notice": "家校通知",
    "homework-qa": "作业答疑",
    "property-repair": "物业报修",
    "site-patrol": "巡检打卡",
    "class-schedule": "课表查询",
    "hotel-booking": "酒店预订",
    "study-coach": "课本学习",
    "travel-plan": "旅行攻略",
    "legal-case": "法务合同",
    "ops-kpi": "经营看板",
    "quote-contract": "报价合同",
    "sales-lead": "销售获客",
    "deal-evidence": "成交证据",
    "kill-pipeline": "杀单工作台",
    "hire-onboard": "招聘入职",
    "policy-qa": "制度问答",
    "expense-claim": "报销记账",
    "leave-request": "请假审批",
    "it-ticket": "IT 工单",
    "meeting-booking": "会议预约",
    "asset-manage": "资产管理",
    "gov-service": "政务办事",
    "pet-clinic": "宠物问诊",
    "deco-material": "装修选材",
    "wedding-plan": "婚礼筹备",
    "fitness-checkin": "健身打卡",
    "campaign-ops": "活动运营",
    "house-viewing": "看房签约",
    "delivery-order": "外卖配送",
}

SECTION_DESC = {
    "平台基础": "健康检查、认证鉴权、租户配置、计费、审计与种子数据。",
    "目录与交付": "能力目录、Agent 分组、一句话创建、Runtime Schema / Manifest、分享与预约演示。",
    "AI 与知识库": "智能问答（含 RAG）、知识库上传检索、语音 Agent、合同 AI 起草。",
    "审批与通知": "通用审批流与站内通知。",
    "CapShip 能力包": "选型即交付的业务能力 REST：报修、会员、导诊、销售等；空库=空列表。",
    "行业运营": "制造 / 金融 / 物流 / 地产 / 零售 / 酒店等垂直运营接口。",
    "报表与集成": "报表导出与 ERP/OA/Webhook 对接。",
}


def _base_name(node: ast.expr) -> str:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return ""


def parse_models(src: str) -> dict[str, list[dict]]:
    models: dict[str, list[dict]] = {}
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return models
    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        if not any(_base_name(b) == "BaseModel" for b in node.bases):
            continue
        fields = []
        for stmt in node.body:
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                name = stmt.target.id
                ann = ast.unparse(stmt.annotation)
                default = ast.unparse(stmt.value) if stmt.value is not None else None
                fields.append({"name": name, "type": ann, "default": default})
        models[node.name] = fields
    return models


def parse_file(fp: Path) -> list[dict]:
    src = fp.read_text(encoding="utf-8")
    pm = re.search(r'APIRouter\(\s*prefix\s*=\s*["\']([^"\']+)["\']', src)
    prefix = pm.group(1) if pm else ""
    tm = re.search(r"tags\s*=\s*\[([^\]]+)\]", src)
    tag = fp.stem.replace("_", "-")
    if tm:
        found = re.findall(r'["\']([^"\']+)["\']', tm.group(1))
        if found:
            tag = found[0]

    models = parse_models(src)
    routes: list[dict] = []

    # Match decorator + function; allow multiline params
    pattern = re.compile(
        r"@router\.(get|post|put|patch|delete)\(\s*[\"']([^\"']*)[\"']"
        r"(?P<extra>[^)]*)\)\s*\n"
        r"(?:async\s+)?def\s+(?P<fname>\w+)\s*\((?P<params>.*?)\)\s*"
        r"(?:->\s*(?P<ret>[^:]+))?:\s*(?P<body>(?:\n(?:[ \t].*)?)*)",
        re.S,
    )
    for m in pattern.finditer(src):
        method = m.group(1).upper()
        path = m.group(2)
        fname = m.group("fname")
        params = m.group("params")
        ret = (m.group("ret") or "").strip()
        fbody = m.group("body") or ""

        full = f"{API_PREFIX}{prefix}{path}".replace("//", "/")
        if full != "/" and full.endswith("/"):
            full = full.rstrip("/")

        auth = ""
        if "require_platform_admin" in params or "require_platform_admin" in m.group("extra"):
            auth = "PlatformAdmin"
        elif "require_admin" in params or "require_admin" in m.group("extra"):
            auth = "Admin"
        elif "get_current_user" in params:
            auth = "JWT"
        elif tag in ROUTER_AUTH:
            auth = ROUTER_AUTH[tag]
        elif tag in CAPABILITY_HINTS or tag.endswith("-ops"):
            # main.py mounts capability / ops routers with dependencies=_auth
            auth = "JWT*"

        body_model = ""
        bm = re.search(r"\bbody:\s*(\w+)", params)
        if bm:
            body_model = bm.group(1)

        doc = ""
        dm = re.match(r'\s*("""|\'\'\')(.*?)\1', fbody, re.S)
        if dm:
            doc = " ".join(dm.group(2).strip().split())
        if not doc:
            # Use first comment line if any
            cm = re.search(r"^\s*#\s*(.+)$", fbody, re.M)
            if cm:
                doc = cm.group(1).strip()

        # Query/path params from signature (simple)
        qparams = []
        for part in re.split(r",(?![^\[\]]*\]|[^(]*\))", params):
            part = part.strip()
            if not part or part.startswith("*"):
                continue
            name = part.split(":")[0].strip()
            if name in {"db", "user", "background_tasks", "request", "response", "file"}:
                continue
            if name == "body" or "Depends" in part or "File(" in part or "Form(" in part:
                if "Form(" in part or "File(" in part:
                    qparams.append({"name": name, "in": "form", "type": part})
                continue
            if "{" + name + "}" in full or "{" + name.replace("_", "") in full:
                qparams.append({"name": name, "in": "path", "type": part})
            elif "Query" in part or "=" in part:
                qparams.append({"name": name, "in": "query", "type": part.split("=", 1)[0].strip()})

        routes.append(
            {
                "file": fp.name,
                "tag": tag,
                "method": method,
                "path": full,
                "name": fname,
                "auth": auth,
                "body": body_model,
                "body_fields": models.get(body_model, []),
                "params": qparams,
                "doc": doc,
                "return": ret,
            }
        )
    return routes


def section_for(tag: str) -> str:
    for title, tags in SECTION_ORDER:
        if title == "CapShip 能力包":
            continue
        if tag in tags or tag.replace("_", "-") in tags:
            return title
    if tag in CAPABILITY_HINTS or tag.replace("_", "-") in CAPABILITY_HINTS:
        return "CapShip 能力包"
    # heuristic: kebab capability routers
    if re.match(r"^[a-z]+(-[a-z]+)+$", tag) and tag not in {"demo-bookings", "finance-news"}:
        return "CapShip 能力包"
    return "其它"


def method_class(m: str) -> str:
    return {
        "GET": "m-get",
        "POST": "m-post",
        "PUT": "m-put",
        "PATCH": "m-patch",
        "DELETE": "m-del",
    }.get(m, "m-get")


def render_fields(fields: list[dict]) -> str:
    if not fields:
        return ""
    rows = []
    for f in fields:
        default = html.escape(f["default"] or "—")
        rows.append(
            f"<tr><td><code>{html.escape(f['name'])}</code></td>"
            f"<td><code>{html.escape(f['type'])}</code></td>"
            f"<td>{default}</td></tr>"
        )
    return (
        '<table class="fields"><thead><tr><th>字段</th><th>类型</th><th>默认</th></tr></thead>'
        f"<tbody>{''.join(rows)}</tbody></table>"
    )


def render_params(params: list[dict]) -> str:
    if not params:
        return ""
    rows = []
    for p in params:
        rows.append(
            f"<tr><td><code>{html.escape(p['name'])}</code></td>"
            f"<td>{html.escape(p['in'])}</td>"
            f"<td><code>{html.escape(p['type'][:80])}</code></td></tr>"
        )
    return (
        '<table class="fields"><thead><tr><th>参数</th><th>位置</th><th>签名</th></tr></thead>'
        f"<tbody>{''.join(rows)}</tbody></table>"
    )


def build_html(routes: list[dict]) -> str:
    by_section: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for r in routes:
        sec = section_for(r["tag"])
        by_section[sec][r["tag"]].append(r)

    # ordered sections
    ordered_titles = [t for t, _ in SECTION_ORDER] + ["其它"]
    seen = set()
    sections = []
    for title in ordered_titles:
        if title in by_section and title not in seen:
            sections.append(title)
            seen.add(title)
    for title in by_section:
        if title not in seen:
            sections.append(title)

    total = len(routes)
    tag_count = len({r["tag"] for r in routes})
    today = date.today().isoformat()

    nav_parts = []
    body_parts = []
    for sec in sections:
        tags = by_section[sec]
        sec_id = f"sec-{abs(hash(sec)) % 10**8}"
        n = sum(len(v) for v in tags.values())
        nav_parts.append(
            f'<a class="nav-sec" href="#{sec_id}">{html.escape(sec)} <span>{n}</span></a>'
        )
        blocks = []
        for tag in sorted(tags.keys()):
            items = tags[tag]
            label = CORE_LABELS.get(tag) or CAPABILITY_HINTS.get(tag, tag)
            tag_id = f"tag-{tag}"
            nav_parts.append(
                f'<a class="nav-tag" href="#{html.escape(tag_id)}">{html.escape(label)}</a>'
            )
            cards = []
            for r in items:
                rid = f"op-{r['method']}-{r['path']}".replace("/", "-").replace("{", "").replace("}", "")
                auth_badge = (
                    f'<span class="badge auth">{html.escape(r["auth"])}</span>' if r["auth"] else
                    '<span class="badge open">公开</span>'
                )
                doc = html.escape(r["doc"]) if r["doc"] else "（见实现 / OpenAPI）"
                body_html = ""
                if r["body"]:
                    body_html = (
                        f'<div class="sub"><strong>Body</strong> <code>{html.escape(r["body"])}</code>'
                        f'{render_fields(r["body_fields"])}</div>'
                    )
                params_html = render_params(r["params"])
                if params_html:
                    params_html = f'<div class="sub"><strong>参数</strong>{params_html}</div>'
                ret = f'<div class="sub"><strong>返回</strong> <code>{html.escape(r["return"])}</code></div>' if r["return"] else ""
                cards.append(
                    f'''
<article class="op" id="{html.escape(rid)}">
  <header>
    <span class="method {method_class(r["method"])}">{r["method"]}</span>
    <code class="path">{html.escape(r["path"])}</code>
    {auth_badge}
  </header>
  <p class="summary">{html.escape(r["name"])} — {doc}</p>
  {params_html}
  {body_html}
  {ret}
  <p class="meta">源码 <code>{html.escape(r["file"])}</code></p>
</article>'''
                )
            blocks.append(
                f'<section class="tag" id="{html.escape(tag_id)}">'
                f"<h3>{html.escape(label)} <small>{html.escape(tag)}</small></h3>"
                f'{"".join(cards)}</section>'
            )
        desc = SECTION_DESC.get(sec, "")
        body_parts.append(
            f'<section class="section" id="{sec_id}">'
            f"<h2>{html.escape(sec)}</h2>"
            f'<p class="sec-desc">{html.escape(desc)}</p>'
            f'{"".join(blocks)}</section>'
        )

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>BlockHub / TrackChat API 接口文档</title>
<style>
:root {{
  --bg: #0f1419;
  --panel: #171d25;
  --panel2: #1e2630;
  --line: #2a3441;
  --text: #e7edf5;
  --muted: #93a1b3;
  --accent: #3d9cf0;
  --get: #3ecf8e;
  --post: #3d9cf0;
  --put: #f0b429;
  --patch: #c084fc;
  --del: #f07178;
  --font: "IBM Plex Sans", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --mono: "IBM Plex Mono", "Cascadia Code", Consolas, monospace;
}}
* {{ box-sizing: border-box; }}
body {{
  margin: 0;
  font-family: var(--font);
  background: radial-gradient(1200px 600px at 10% -10%, #1a2740 0%, transparent 55%),
              radial-gradient(900px 500px at 100% 0%, #1a3028 0%, transparent 50%),
              var(--bg);
  color: var(--text);
  line-height: 1.55;
}}
a {{ color: var(--accent); text-decoration: none; }}
a:hover {{ text-decoration: underline; }}
.layout {{ display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }}
aside {{
  position: sticky; top: 0; height: 100vh; overflow: auto;
  background: rgba(15,20,25,.92); border-right: 1px solid var(--line);
  padding: 20px 14px 40px;
}}
aside h1 {{ font-size: 15px; margin: 0 0 4px; letter-spacing: .02em; }}
aside .sub {{ color: var(--muted); font-size: 12px; margin-bottom: 16px; }}
.nav-sec {{
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 14px; padding: 6px 8px; border-radius: 6px;
  color: var(--text); font-weight: 600; font-size: 13px;
}}
.nav-sec span {{ color: var(--muted); font-weight: 500; font-size: 11px; }}
.nav-tag {{
  display: block; padding: 3px 12px; color: var(--muted); font-size: 12px;
  border-left: 2px solid transparent;
}}
.nav-tag:hover {{ color: var(--text); border-left-color: var(--accent); text-decoration: none; }}
main {{ padding: 28px 36px 80px; max-width: 1100px; }}
.hero {{
  margin-bottom: 28px; padding: 22px 24px; border: 1px solid var(--line);
  border-radius: 14px; background: linear-gradient(135deg, var(--panel), var(--panel2));
}}
.hero h1 {{ margin: 0 0 8px; font-size: 26px; }}
.hero p {{ margin: 0; color: var(--muted); max-width: 70ch; }}
.stats {{ display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }}
.stat {{
  background: rgba(0,0,0,.25); border: 1px solid var(--line); border-radius: 10px;
  padding: 10px 14px; min-width: 110px;
}}
.stat b {{ display: block; font-size: 20px; }}
.stat span {{ color: var(--muted); font-size: 12px; }}
.callout {{
  margin-top: 14px; padding: 12px 14px; border-radius: 10px;
  background: rgba(61,156,240,.08); border: 1px solid rgba(61,156,240,.25);
  color: #c5daf0; font-size: 13px;
}}
.section {{ margin-top: 36px; }}
.section h2 {{
  margin: 0 0 6px; font-size: 22px; border-bottom: 1px solid var(--line); padding-bottom: 8px;
}}
.sec-desc {{ color: var(--muted); margin: 0 0 18px; font-size: 14px; }}
.tag {{ margin: 22px 0 28px; }}
.tag h3 {{ margin: 0 0 12px; font-size: 17px; }}
.tag h3 small {{ color: var(--muted); font-weight: 500; margin-left: 8px; }}
.op {{
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 14px 16px; margin-bottom: 10px;
}}
.op header {{ display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }}
.method {{
  font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: .04em;
  padding: 3px 8px; border-radius: 6px; color: #0b1220;
}}
.m-get {{ background: var(--get); }}
.m-post {{ background: var(--post); color: #fff; }}
.m-put {{ background: var(--put); }}
.m-patch {{ background: var(--patch); color: #1a1025; }}
.m-del {{ background: var(--del); color: #fff; }}
.path {{ font-family: var(--mono); font-size: 13px; color: #d7e3f4; }}
.badge {{
  font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--line);
  color: var(--muted);
}}
.badge.auth {{ color: #f6d58a; border-color: rgba(240,180,41,.35); background: rgba(240,180,41,.08); }}
.badge.open {{ color: #8fd9b0; border-color: rgba(62,207,142,.3); background: rgba(62,207,142,.08); }}
.summary {{ margin: 10px 0 0; font-size: 13.5px; color: #d0dae8; }}
.sub {{ margin-top: 10px; font-size: 13px; }}
.sub strong {{ color: var(--muted); font-weight: 600; margin-right: 6px; }}
.fields {{
  width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12.5px;
}}
.fields th, .fields td {{
  border: 1px solid var(--line); padding: 6px 8px; text-align: left;
}}
.fields th {{ background: rgba(0,0,0,.2); color: var(--muted); font-weight: 600; }}
.meta {{ margin: 10px 0 0; font-size: 12px; color: var(--muted); }}
code {{ font-family: var(--mono); font-size: .92em; }}
.toolbar {{
  display: flex; gap: 8px; margin: 16px 0 0; flex-wrap: wrap;
}}
.toolbar input {{
  flex: 1; min-width: 220px; background: #0c1117; border: 1px solid var(--line);
  color: var(--text); border-radius: 8px; padding: 10px 12px; font: inherit;
}}
.toolbar input:focus {{ outline: 1px solid var(--accent); }}
footer {{
  margin-top: 48px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--line);
  padding-top: 16px;
}}
@media (max-width: 900px) {{
  .layout {{ grid-template-columns: 1fr; }}
  aside {{ position: relative; height: auto; max-height: 40vh; }}
  main {{ padding: 18px; }}
}}
.op.hidden {{ display: none; }}
.tag.hidden-tag {{ display: none; }}
</style>
</head>
<body>
<div class="layout">
<aside>
  <h1>BlockHub API</h1>
  <div class="sub">TrackChat PaaS · /api/v1</div>
  {"".join(nav_parts)}
</aside>
<main>
  <div class="hero">
    <h1>后端业务接口文档</h1>
    <p>
      由 <code>backend/app/api/v1</code> 静态扫描生成。基址前缀 <code>/api/v1</code>。
      运行时亦可使用 FastAPI 自带 <code>/docs</code>（Swagger）与 <code>/redoc</code>。
    </p>
    <div class="stats">
      <div class="stat"><b>{total}</b><span>接口</span></div>
      <div class="stat"><b>{tag_count}</b><span>业务标签</span></div>
      <div class="stat"><b>{len(sections)}</b><span>业务分组</span></div>
      <div class="stat"><b>{today}</b><span>生成日期</span></div>
    </div>
    <div class="callout">
      <strong>鉴权说明：</strong>
      <code>Authorization: Bearer &lt;JWT&gt;</code>。
      标 <em>JWT*</em> 表示该路由在 <code>main.py</code> 以 router 级 <code>dependencies=_auth</code> 挂载；
      <em>Admin</em> / <em>PlatformAdmin</em> 需管理员角色。
      CapShip 能力包遵循「空库=空列表、真 API 读写」。
    </div>
    <div class="toolbar">
      <input id="q" type="search" placeholder="搜索路径 / 方法 / 函数名 / 标签…" autocomplete="off"/>
    </div>
  </div>

  {"".join(body_parts)}

  <footer>
    重新生成：<code>python scripts/gen_api_docs_html.py</code> ·
    源码目录 <code>backend/app/api/v1/</code> ·
    产品契约见 <code>docs/opensource/capship.html</code>
  </footer>
</main>
</div>
<script>
const q = document.getElementById('q');
q.addEventListener('input', () => {{
  const s = q.value.trim().toLowerCase();
  document.querySelectorAll('.op').forEach(op => {{
    const text = op.textContent.toLowerCase();
    op.classList.toggle('hidden', s && !text.includes(s));
  }});
  document.querySelectorAll('.tag').forEach(tag => {{
    const visible = [...tag.querySelectorAll('.op')].some(op => !op.classList.contains('hidden'));
    tag.classList.toggle('hidden-tag', s && !visible);
  }});
}});
</script>
</body>
</html>
"""


def main() -> None:
    routes: list[dict] = []
    for fp in sorted(API_DIR.glob("*.py")):
        if fp.name.startswith("_"):
            continue
        routes.extend(parse_file(fp))

    # de-dupe by method+path
    seen = set()
    uniq = []
    for r in routes:
        key = (r["method"], r["path"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(r)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build_html(uniq), encoding="utf-8")
    print(f"Wrote {OUT} ({len(uniq)} endpoints)")


if __name__ == "__main__":
    main()
