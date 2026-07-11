"""为 20 个行业深度包生成统一风格配图：hero / og / thumb。"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"
PUBLIC = REPO / "home" / "public" / "industry"
sys.path.insert(0, str(BACKEND))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS  # noqa: E402
from app.services.industry_site import INDUSTRY_VISUAL_KEYWORDS  # noqa: E402

# 每行业装饰图案：circles | grid | waves | bars | dots
MOTIFS: dict[str, str] = {
    "office": "grid",
    "mfg": "bars",
    "sales": "waves",
    "med": "circles",
    "game": "dots",
    "retail": "grid",
    "edu": "waves",
    "finance": "bars",
    "logistics": "waves",
    "realestate": "grid",
    "hotel": "circles",
    "energy": "bars",
    "gov": "grid",
    "legal": "bars",
    "hr": "circles",
    "marketing": "dots",
    "construction": "bars",
    "agriculture": "waves",
    "media": "dots",
    "auto": "waves",
}


def _hex_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _lerp(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc" if bold else "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _gradient(size: tuple[int, int], c1: str, c2: str) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    rgb1, rgb2 = _hex_rgb(c1), _hex_rgb(c2)
    for y in range(h):
        t = y / max(h - 1, 1)
        row_color = _lerp(rgb1, rgb2, t)
        for x in range(w):
            img.putpixel((x, y), row_color)
    return img


def _shift(hex_color: str, factor: float) -> str:
    r, g, b = _hex_rgb(hex_color)
    r, g, b = min(255, int(r * factor)), min(255, int(g * factor)), min(255, int(b * factor))
    return f"#{r:02x}{g:02x}{b:02x}"


def _draw_motif(draw: ImageDraw.ImageDraw, motif: str, w: int, h: int, color: str) -> None:
    r, g, b = _hex_rgb(color)
    fill = (r, g, b, 40)
    stroke = (r, g, b, 70)
    if motif == "circles":
        for i, (cx, cy, rad) in enumerate([(w * 0.75, h * 0.3, 120), (w * 0.85, h * 0.55, 80), (w * 0.65, h * 0.65, 50)]):
            draw.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=stroke, width=3)
    elif motif == "grid":
        step = 48
        for x in range(int(w * 0.5), w, step):
            draw.line((x, 0, x, h), fill=fill, width=1)
        for y in range(0, h, step):
            draw.line((int(w * 0.45), y, w, y), fill=fill, width=1)
    elif motif == "waves":
        for i in range(5):
            y0 = int(h * 0.2 + i * 35)
            pts = [(int(w * 0.5), y0)]
            for x in range(int(w * 0.5), w, 24):
                pts.append((x, y0 + int(18 * math.sin(x / 40 + i))))
            if len(pts) > 1:
                draw.line(pts, fill=stroke, width=2)
    elif motif == "bars":
        for i in range(8):
            bh = 40 + i * 22
            x = int(w * 0.58 + i * 42)
            draw.rectangle((x, h - bh - 40, x + 28, h - 40), fill=fill, outline=stroke)
    else:
        for i in range(30):
            x = int(w * 0.55 + (i % 6) * 55)
            y = int(h * 0.15 + (i // 6) * 55)
            draw.ellipse((x, y, x + 8, y + 8), fill=stroke)


def _draw_brand_bar(draw: ImageDraw.ImageDraw, w: int, accent: str) -> None:
    draw.rectangle((0, 0, w, 6), fill=_hex_rgb(accent))


def _render_canvas(
    size: tuple[int, int],
    *,
    name: str,
    tagline: str,
    emoji: str,
    color: str,
    motif: str,
    subtitle: str = "积木仓 BlockHub · 行业深度包",
    layout: str = "hero",
) -> Image.Image:
    w, h = size
    dark = _shift(color, 0.45)
    light = _shift(color, 1.15)
    base = _gradient(size, _shift(color, 0.25), "#0f172a")
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    _draw_motif(odraw, motif, w, h, light)
    base = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(base)
    _draw_brand_bar(draw, w, color)

    title_font = _load_font(52 if layout == "hero" else 42, bold=True)
    sub_font = _load_font(22 if layout == "hero" else 18)
    meta_font = _load_font(16)
    emoji_font = _load_font(72 if layout == "hero" else 56)

    pad = 56 if layout == "hero" else 48
    draw.text((pad, pad + 10), emoji, font=emoji_font, fill=(255, 255, 255))
    draw.text((pad, pad + (90 if layout == "hero" else 70)), name, font=title_font, fill=(255, 255, 255))
    ty = pad + (160 if layout == "hero" else 130)
    draw.text((pad, ty), tagline[:36], font=sub_font, fill=(226, 232, 240))
    draw.text((pad, h - pad - 8), subtitle, font=meta_font, fill=_hex_rgb(light))

    if layout == "og":
        badge = "深度包 · 一键生成 Web + App"
        draw.rounded_rectangle((pad, ty + 36, pad + 320, ty + 68), radius=8, fill=_hex_rgb(dark))
        draw.text((pad + 12, ty + 42), badge, font=meta_font, fill=(255, 255, 255))

    return base


def generate_for_pack(pack: dict) -> dict[str, str]:
    key = pack["key"]
    out_dir = PUBLIC / key
    out_dir.mkdir(parents=True, exist_ok=True)
    name = pack["name"]
    tagline = pack.get("tagline", name)
    emoji = pack.get("icon", "📦")
    color = pack.get("color", "#6366f1")
    motif = MOTIFS.get(key, "circles")
    kw = INDUSTRY_VISUAL_KEYWORDS.get(key, name)

    hero = _render_canvas((1440, 520), name=name, tagline=tagline, emoji=emoji, color=color, motif=motif, layout="hero")
    og = _render_canvas((1200, 630), name=name, tagline=tagline, emoji=emoji, color=color, motif=motif, layout="og", subtitle=f"{kw} · BlockHub")
    thumb = _render_canvas((480, 300), name=name, tagline=tagline[:20], emoji=emoji, color=color, motif=motif, layout="thumb")

    hero_path = out_dir / "hero.jpg"
    og_path = out_dir / "og.png"
    thumb_path = out_dir / "thumb.jpg"
    hero.save(hero_path, quality=90, optimize=True)
    og.save(og_path, optimize=True)
    thumb.save(thumb_path, quality=88, optimize=True)

    return {
        "key": key,
        "hero": f"/industry/{key}/hero.jpg",
        "og": f"/industry/{key}/og.png",
        "thumb": f"/industry/{key}/thumb.jpg",
    }


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, str]] = []
    for pack in ALL_INDUSTRY_PACKS:
        row = generate_for_pack(pack)
        manifest.append(row)
        print(f"  {pack['key']}: {pack['name']}")

    (PUBLIC / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\n生成 {len(manifest)} 个行业站点配图 -> {PUBLIC}")


if __name__ == "__main__":
    main()
