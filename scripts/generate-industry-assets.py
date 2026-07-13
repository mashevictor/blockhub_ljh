"""为 20 个行业深度包生成统一高科技风配图：hero / og / thumb。"""
from __future__ import annotations

import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"
PUBLIC = REPO / "home" / "public" / "industry"
sys.path.insert(0, str(BACKEND))

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS  # noqa: E402
from app.services.industry_site import INDUSTRY_VISUAL_KEYWORDS  # noqa: E402

MOTIFS: dict[str, str] = {
    "office": "mesh",
    "mfg": "circuit",
    "sales": "pulse",
    "med": "hex",
    "game": "nodes",
    "retail": "mesh",
    "edu": "pulse",
    "finance": "circuit",
    "logistics": "pulse",
    "realestate": "mesh",
    "hotel": "hex",
    "energy": "circuit",
    "gov": "mesh",
    "legal": "circuit",
    "hr": "hex",
    "marketing": "nodes",
    "construction": "circuit",
    "agriculture": "pulse",
    "media": "nodes",
    "auto": "pulse",
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


def _shift(hex_color: str, factor: float) -> str:
    r, g, b = _hex_rgb(hex_color)
    r, g, b = min(255, int(r * factor)), min(255, int(g * factor)), min(255, int(b * factor))
    return f"#{r:02x}{g:02x}{b:02x}"


def _radial_glow(size: tuple[int, int], cx: float, cy: float, radius: float, color: str, alpha: int) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    rgb = _hex_rgb(color)
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            if d > radius:
                continue
            a = int(alpha * (1 - d / radius) ** 1.8)
            if a <= 0:
                continue
            layer.putpixel((x, y), (*rgb, a))
    return layer


def _base_canvas(size: tuple[int, int], accent: str) -> Image.Image:
    w, h = size
    dark = (10, 22, 40)
    mid = _hex_rgb(_shift(accent, 0.35))
    img = Image.new("RGB", size, dark)
    for y in range(h):
        t = y / max(h - 1, 1)
        row = _lerp(dark, mid, t * 0.55)
        for x in range(w):
            img.putpixel((x, y), row)
    glow = _radial_glow(size, w * 0.72, h * 0.42, min(w, h) * 0.55, accent, 95)
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    return img


def _draw_mesh(draw: ImageDraw.ImageDraw, w: int, h: int, color: str, ox: float) -> None:
    r, g, b = _hex_rgb(color)
    stroke = (r, g, b, 55)
    fill = (r, g, b, 18)
    step = 36
    x0 = int(w * ox)
    for x in range(x0, w, step):
        draw.line((x, 0, x, h), fill=stroke, width=1)
    for y in range(0, h, step):
        draw.line((x0, y, w, y), fill=stroke, width=1)
    for i in range(6):
        y = int(h * (0.15 + i * 0.13))
        draw.line((x0, y, w, y + 18), fill=fill, width=2)


def _draw_hex(draw: ImageDraw.ImageDraw, w: int, h: int, color: str, ox: float) -> None:
    r, g, b = _hex_rgb(color)
    stroke = (r, g, b, 70)
    size = 28
    x0 = int(w * ox)
    for row in range(8):
        for col in range(10):
            cx = x0 + col * size * 1.75 + (row % 2) * size * 0.85
            cy = row * size * 1.5 + 20
            if cx > w + 40:
                continue
            pts = []
            for k in range(6):
                ang = math.pi / 3 * k - math.pi / 6
                pts.append((cx + size * math.cos(ang), cy + size * math.sin(ang)))
            draw.polygon(pts, outline=stroke)


def _draw_circuit(draw: ImageDraw.ImageDraw, w: int, h: int, color: str, ox: float) -> None:
    r, g, b = _hex_rgb(color)
    stroke = (r, g, b, 85)
    node = (r, g, b, 130)
    x0 = int(w * ox)
    paths = [
        [(x0 + 40, 60), (x0 + 180, 60), (x0 + 180, 140), (x0 + 320, 140)],
        [(x0 + 80, 180), (x0 + 260, 180), (x0 + 260, 260), (x0 + 420, 260)],
        [(x0 + 120, 40), (x0 + 120, 220), (x0 + 360, 220)],
    ]
    for pts in paths:
        draw.line(pts, fill=stroke, width=2)
        for px, py in pts:
            draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=node)


def _draw_pulse(draw: ImageDraw.ImageDraw, w: int, h: int, color: str, ox: float) -> None:
    r, g, b = _hex_rgb(color)
    stroke = (r, g, b, 90)
    x0 = int(w * ox)
    for i in range(4):
        y0 = int(h * (0.22 + i * 0.16))
        pts = [(x0, y0)]
        for x in range(x0, w, 20):
            pts.append((x, y0 + int(22 * math.sin(x / 36 + i * 1.2))))
        if len(pts) > 1:
            draw.line(pts, fill=stroke, width=2)


def _draw_nodes(draw: ImageDraw.ImageDraw, w: int, h: int, color: str, ox: float) -> None:
    r, g, b = _hex_rgb(color)
    rng = random.Random(int(_hex_rgb(color)[0] * 1000 + w))
    x0 = int(w * ox)
    nodes = [(rng.randint(x0 + 20, w - 20), rng.randint(20, h - 20)) for _ in range(18)]
    for i, (x1, y1) in enumerate(nodes):
        for x2, y2 in nodes[i + 1 : i + 4]:
            draw.line((x1, y1, x2, y2), fill=(r, g, b, 35), width=1)
    for x, y in nodes:
        rad = rng.randint(4, 9)
        draw.ellipse((x - rad, y - rad, x + rad, y + rad), fill=(r, g, b, 120))


def _draw_motif(draw: ImageDraw.ImageDraw, motif: str, w: int, h: int, color: str, ox: float = 0.42) -> None:
    fn = {
        "mesh": _draw_mesh,
        "hex": _draw_hex,
        "circuit": _draw_circuit,
        "pulse": _draw_pulse,
        "nodes": _draw_nodes,
    }.get(motif, _draw_mesh)
    fn(draw, w, h, color, ox)


def _draw_accent_bar(draw: ImageDraw.ImageDraw, w: int, accent: str) -> None:
    rgb = _hex_rgb(accent)
    draw.rectangle((0, 0, w, 4), fill=rgb)


def _draw_scanlines(overlay: Image.Image, alpha: int = 18) -> Image.Image:
    w, h = overlay.size
    draw = ImageDraw.Draw(overlay)
    for y in range(0, h, 4):
        draw.line((0, y, w, y), fill=(255, 255, 255, alpha))
    return overlay


def _render_thumb(size: tuple[int, int], *, color: str, motif: str) -> Image.Image:
    """卡片专用：纯视觉氛围，无文字，避免首页裁切错位。"""
    w, h = size
    base = _base_canvas(size, color)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    _draw_motif(ImageDraw.Draw(overlay), motif, w, h, _shift(color, 1.35), ox=0.08)
    glow = _radial_glow(size, w * 0.78, h * 0.35, min(w, h) * 0.65, color, 80)
    overlay = Image.alpha_composite(overlay, glow)
    overlay = _draw_scanlines(overlay, 12)
    out = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(out)
    _draw_accent_bar(draw, w, color)
    # 底部暗角，与卡片文案区过渡
    fade = Image.new("RGBA", size, (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(fade)
    for y in range(int(h * 0.55), h):
        t = (y - h * 0.55) / (h * 0.45)
        fdraw.line((0, y, w, y), fill=(8, 15, 30, int(140 * t)))
    out = Image.alpha_composite(out.convert("RGBA"), fade).convert("RGB")
    return out.filter(ImageFilter.GaussianBlur(radius=0.3))


def _render_hero(
    size: tuple[int, int],
    *,
    name: str,
    tagline: str,
    color: str,
    motif: str,
    subtitle: str = "积木仓 BlockHub · 行业深度包",
    layout: str = "hero",
) -> Image.Image:
    w, h = size
    base = _base_canvas(size, color)
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    _draw_motif(ImageDraw.Draw(overlay), motif, w, h, _shift(color, 1.25), ox=0.38 if layout == "hero" else 0.32)
    overlay = Image.alpha_composite(overlay, _radial_glow(size, w * 0.82, h * 0.45, min(w, h) * 0.5, color, 70))
    overlay = _draw_scanlines(overlay, 10)
    img = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(img)
    _draw_accent_bar(draw, w, color)

    pad = 56 if layout == "hero" else 44
    title_font = _load_font(48 if layout == "hero" else 38, bold=True)
    sub_font = _load_font(20 if layout == "hero" else 16)
    meta_font = _load_font(14)

    # 左侧暗色遮罩，保证文字可读
    shade = Image.new("RGBA", size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shade)
    sdraw.rectangle((0, 0, int(w * 0.58), h), fill=(8, 15, 30, 120))
    img = Image.alpha_composite(img.convert("RGBA"), shade).convert("RGB")
    draw = ImageDraw.Draw(img)

    draw.text((pad, pad + 8), name, font=title_font, fill=(255, 255, 255))
    ty = pad + (72 if layout == "hero" else 58)
    draw.text((pad, ty), tagline[:40], font=sub_font, fill=(203, 213, 225))
    draw.text((pad, h - pad - 6), subtitle, font=meta_font, fill=_hex_rgb(_shift(color, 1.2)))

    if layout == "og":
        badge = "深度包 · 一键生成 Web + App"
        draw.rounded_rectangle((pad, ty + 34, pad + 340, ty + 66), radius=8, fill=_hex_rgb(_shift(color, 0.4)))
        draw.text((pad + 12, ty + 40), badge, font=meta_font, fill=(255, 255, 255))

    return img


def generate_for_pack(pack: dict) -> dict[str, str]:
    key = pack["key"]
    out_dir = PUBLIC / key
    out_dir.mkdir(parents=True, exist_ok=True)
    name = pack["name"]
    tagline = pack.get("tagline", name)
    color = pack.get("color", "#6366f1")
    motif = MOTIFS.get(key, "mesh")
    kw = INDUSTRY_VISUAL_KEYWORDS.get(key, name)

    hero = _render_hero((1440, 520), name=name, tagline=tagline, color=color, motif=motif, layout="hero")
    og = _render_hero(
        (1200, 630),
        name=name,
        tagline=tagline,
        color=color,
        motif=motif,
        layout="og",
        subtitle=f"{kw} · BlockHub",
    )
    thumb = _render_thumb((640, 360), color=color, motif=motif)

    hero_path = out_dir / "hero.jpg"
    og_path = out_dir / "og.png"
    thumb_path = out_dir / "thumb.jpg"
    hero.save(hero_path, quality=92, optimize=True)
    og.save(og_path, optimize=True)
    thumb.save(thumb_path, quality=90, optimize=True)

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
