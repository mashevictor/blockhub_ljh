# -*- coding: utf-8 -*-
"""
独立生成 BlockHub 行业落地网页（与 CapShip 应用发布解耦）。

输入：
  - home/public/industry-microsites/{template}/  （视觉模板）
  - backend industry_enrich_static + industry_packs_all （内容 SSOT）

输出：
  - home/public/industry-sites/{packKey}/index.html + style.css
  - home/public/industry-sites/index.html （解耦目录页）

用法：
  python scripts/generate_industry_pack_sites.py
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
TEMPLATE_ROOT = ROOT / "home" / "public" / "industry-microsites"
OUT_ROOT = ROOT / "home" / "public" / "industry-sites"

sys.path.insert(0, str(BACKEND))

from app.data.industry_enrich_static import build_static_enrichment  # noqa: E402
from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, pack_meta  # noqa: E402

# pack → 视觉模板 id（与 home industryMicrositeTemplates 一致）
PACK_DEFAULT_MICROSITE: dict[str, str] = {
    "legal": "law-firm",
    "bank": "accounting",
    "securities": "accounting",
    "insurance": "accounting",
    "fund": "accounting",
    "fintech": "saas",
    "office": "consulting",
    "med": "clinic",
    "sales": "dental",
    "hotel": "hotel",
    "edu": "education",
    "hr": "training",
    "gov": "study-abroad",
    "retail": "restaurant",
    "realestate": "real-estate",
    "construction": "interior",
    "marketing": "saas",
    "auto": "hardware",
    "mfg": "manufacturing",
    "media": "beauty",
    "game": "game",
    "logistics": "pet",
    "agriculture": "photography",
    "energy": "wellness",
}


def _esc(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _scene_cards(scenes: list[dict], limit: int = 6) -> str:
    cards = []
    for s in scenes[:limit]:
        name = _esc(s.get("name") or "场景")
        problem = _esc(s.get("problem") or name)
        cards.append(f"<article class=\"card\"><h3>{name}</h3><p>{problem}</p></article>")
    while len(cards) < 3:
        cards.append('<article class="card"><h3>可扩展场景</h3><p>支持继续增减业务模块，网页与应用分开交付。</p></article>')
    return "".join(cards)


def _highlight_cards(highlights: list[str]) -> str:
    rows = []
    for h in (highlights or [])[:3]:
        rows.append(f"<article class=\"card\"><h3>{_esc(h)}</h3><p>行业方案亮点，可直接用于投放与线索转化。</p></article>")
    while len(rows) < 3:
        rows.append('<article class="card"><h3>独立交付</h3><p>本页为纯静态站点，不依赖登录或应用运行时。</p></article>')
    return "".join(rows)


def build_pack_html(
    *,
    pack_key: str,
    pack_name: str,
    tagline: str,
    brand: str,
    enrichment: dict,
    scenes: list[dict],
    template_label: str,
) -> str:
    overview = enrichment.get("overview") or tagline
    highlights = enrichment.get("highlights") or []
    modules = enrichment.get("recommended_modules") or []
    tip_line = " · ".join(modules[:4]) if modules else "场景可选 · 独立上线"

    nav = (
        f"<a href='#scenes'>业务场景</a>"
        f"<a href='#highlights'>方案亮点</a>"
        f"<a href='#contact'>获取方案</a>"
    )

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{_esc(brand)} · {_esc(pack_name)}独立网页</title>
  <meta name="description" content="{_esc(overview[:140])}" />
  <meta name="generator" content="blockhub-industry-sites" />
  <meta name="blockhub-pack" content="{_esc(pack_key)}" />
  <meta name="blockhub-decoupled" content="true" />
  <link rel="stylesheet" href="style.css" />
</head>
<body data-pack="{_esc(pack_key)}" data-decoupled="1">

<div class="wrap">
  <div class="topbar">
    <div class="brand">{_esc(brand)}</div>
    <nav class="nav">{nav}</nav>
  </div>
  <header class="hero">
    <div>
      <span class="badge reveal">{_esc(pack_name.upper() if pack_name.isascii() else pack_name)}</span>
      <h1 class="reveal d2">{_esc(tagline)}</h1>
      <p class="lead reveal d3">{_esc(overview)}</p>
      <div class="cta-row reveal d3">
        <a class="btn" href="#contact">获取方案</a>
        <a class="btn ghost" href="#scenes">查看场景</a>
      </div>
      <p class="lead reveal d3" style="margin-top:1rem;font-size:.85rem">{_esc(tip_line)}</p>
    </div>
  </header>
</div>

<section class="wrap block" id="scenes">
  <h2>业务场景</h2>
  <p class="section-lead">来自 {_esc(pack_name)} 深度包的生产文案；本页可独立托管，无需积木仓运行时。</p>
  <div class="grid-3">{_scene_cards(scenes)}</div>
</section>

<section class="wrap block" id="highlights">
  <h2>方案亮点</h2>
  <p class="section-lead">视觉模板：{_esc(template_label)} · 内容与 CapShip 应用发布解耦。</p>
  <div class="grid-3">{_highlight_cards(list(highlights))}</div>
</section>

<section class="wrap block" id="contact">
  <h2>获取方案</h2>
  <p class="section-lead">需要 Web/App 能力编排时，可回到积木仓独立站继续选型；本页本身即可对外投放。</p>
  <div class="cta-row">
    <a class="btn" href="/industry/{_esc(pack_key)}">打开行业方案站</a>
    <a class="btn ghost" href="/industry-sites/">返回解耦目录</a>
  </div>
</section>

<footer class="wrap">
  <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">
    <span>© {_esc(brand)} · {_esc(pack_name)}独立网页 · BlockHub 解耦生成</span>
    <a class="back" href="/industry-sites/">← 全部行业网页</a>
  </div>
</footer>

</body>
</html>
"""


def build_catalog_html(items: list[dict]) -> str:
    cards = []
    for it in items:
        cards.append(
            f"""<a class="site-card" href="{_esc(it['href'])}">
  <strong>{_esc(it['name'])}</strong>
  <span>{_esc(it['tagline'])}</span>
  <em>{_esc(it['template'])}</em>
</a>"""
        )
    grid = "\n".join(cards)
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>行业独立网页目录 · BlockHub</title>
  <meta name="description" content="20 个行业落地页，静态解耦生成，不依赖应用运行时。" />
  <style>
    :root {{ --bg:#0a0908; --text:#fef9e7; --muted:rgba(254,243,199,.7); --line:rgba(212,175,55,.28); --pri:#d4af37; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; font-family: "Segoe UI", "PingFang SC", sans-serif; background:
      radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,.14), transparent), var(--bg);
      color:var(--text); }}
    .wrap {{ max-width:1080px; margin:0 auto; padding:32px 20px 64px; }}
    h1 {{ font-size:28px; margin:0 0 8px; }}
    .lead {{ color:var(--muted); margin:0 0 28px; line-height:1.6; }}
    .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; }}
    .site-card {{
      display:flex; flex-direction:column; gap:6px; text-decoration:none; color:inherit;
      background:rgba(212,175,55,.06); border:1px solid var(--line); border-radius:12px; padding:16px;
      box-shadow:0 8px 28px rgba(0,0,0,.35);
    }}
    .site-card:hover {{ border-color:var(--pri); background:rgba(212,175,55,.12); }}
    .site-card strong {{ font-size:16px; }}
    .site-card span {{ font-size:13px; color:var(--muted); line-height:1.45; }}
    .site-card em {{ font-style:normal; font-size:12px; color:var(--pri); }}
    .bar {{ display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; }}
    .bar a {{ color:var(--pri); }}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>行业独立网页 · 解耦目录</h1>
    <p class="lead">以下站点为纯静态 HTML，可单独托管/投放；与积木仓「生成应用」链路解耦。需要能力编排时再进入行业方案站。</p>
    <div class="bar">
      <a href="/">积木仓首页</a>
      <a href="/#product">行业方案入口</a>
    </div>
    <div class="grid">
{grid}
    </div>
  </div>
</body>
</html>
"""


def main() -> None:
    if not TEMPLATE_ROOT.is_dir():
        raise SystemExit(f"missing templates: {TEMPLATE_ROOT}")

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    catalog_items: list[dict] = []

    for pack in ALL_INDUSTRY_PACKS:
        pack_key = pack["key"]
        meta = pack_meta(pack_key) or pack
        pack_name = str(meta.get("name") or pack_key)
        tagline = str(meta.get("tagline") or pack_name)
        template_id = PACK_DEFAULT_MICROSITE.get(pack_key, "consulting")
        src = TEMPLATE_ROOT / template_id
        if not src.is_dir():
            print(f"skip {pack_key}: template {template_id} missing")
            continue

        enrichment = build_static_enrichment(pack_key)
        scenes = list(pack.get("scenes") or [])
        if pack_key == "office" and not scenes:
            scenes = [
                {"name": t["name"], "problem": t["tip"]}
                for t in enrichment.get("scene_tips") or []
            ]

        brand = f"{pack_name}方案"
        # 尽量沿用模板品牌名气质：取 catalog brand if present
        catalog_path = TEMPLATE_ROOT / "catalog.json"
        template_label = template_id
        if catalog_path.exists():
            try:
                rows = json.loads(catalog_path.read_text(encoding="utf-8"))
                row = next((r for r in rows if r.get("id") == template_id), None)
                if row:
                    template_label = row.get("styleLabel") or template_id
                    brand = row.get("brand") or brand
            except Exception:
                pass

        out_dir = OUT_ROOT / pack_key
        if out_dir.exists():
            shutil.rmtree(out_dir)
        out_dir.mkdir(parents=True)

        # 复制样式
        css_src = src / "style.css"
        if css_src.exists():
            shutil.copy2(css_src, out_dir / "style.css")
        else:
            (out_dir / "style.css").write_text("body{font-family:sans-serif;margin:2rem}", encoding="utf-8")

        html = build_pack_html(
            pack_key=pack_key,
            pack_name=pack_name,
            tagline=tagline,
            brand=brand,
            enrichment=enrichment,
            scenes=scenes,
            template_label=template_label,
        )
        (out_dir / "index.html").write_text(html, encoding="utf-8")

        # 元数据，便于二次生成/CI
        (out_dir / "site.json").write_text(
            json.dumps(
                {
                    "pack_key": pack_key,
                    "pack_name": pack_name,
                    "template_id": template_id,
                    "decoupled": True,
                    "href": f"/industry-sites/{pack_key}/index.html",
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        catalog_items.append(
            {
                "key": pack_key,
                "name": pack_name,
                "tagline": tagline,
                "template": template_label,
                "href": f"./{pack_key}/index.html",
            }
        )
        print(f"ok {pack_key} <- {template_id}")

    (OUT_ROOT / "index.html").write_text(build_catalog_html(catalog_items), encoding="utf-8")
    (OUT_ROOT / "catalog.json").write_text(
        json.dumps(catalog_items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"catalog {len(catalog_items)} -> {OUT_ROOT}")


if __name__ == "__main__":
    main()
