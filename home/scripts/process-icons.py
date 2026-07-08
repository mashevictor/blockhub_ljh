"""从 designs 源图导出各场景品牌图标尺寸。"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PUBLIC = ROOT / "public"
BRAND_DIR = PUBLIC / "brand"
FRONTEND_PUBLIC = REPO / "frontend" / "public"
SOURCE = REPO / "designs" / "智能体符号2jpeg.jpg"

EXPORTS = [
    ("favicon-16.png", 16, "浏览器标签小图标"),
    ("favicon-32.png", 32, "浏览器标签主图标"),
    ("favicon-48.png", 48, "浏览器收藏夹"),
    ("apple-touch-icon.png", 180, "iOS 主屏幕"),
    ("icon-192.png", 192, "Android / PWA"),
    ("icon-512.png", 512, "PWA 启动图"),
    ("logo-256.png", 256, "Header 导航 Logo"),
    ("logo-512.png", 512, "高清 Logo"),
    ("logo-1024.png", 1024, "设计源图导出"),
]

ROOT_COPIES = {
    "apple-touch-icon.png",
    "icon-192.png",
    "icon-512.png",
    "favicon-32.png",
    "favicon-48.png",
    "logo-256.png",
}


def _square_crop(rgb: Image.Image, top: int, bottom: int, left: int, right: int) -> Image.Image:
    side = max(right - left, bottom - top)
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    left = max(0, cx - side // 2)
    top = max(0, cy - side // 2)
    right = min(rgb.width, left + side)
    bottom = min(rgb.height, top + side)
    side = min(right - left, bottom - top)
    return rgb.crop((left, top, left + side, top + side))


def crop_artboard(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    arr = np.array(rgb)

    dark = arr.max(axis=2) < 72
    rows = np.where(dark.sum(axis=1) > 180)[0]
    cols = np.where(dark.sum(axis=0) > 180)[0]
    if rows.size > 0 and cols.size > 0:
        top, bottom = int(rows[0]), int(rows[-1]) + 1
        left, right = int(cols[0]), int(cols[-1]) + 1
        return _square_crop(rgb, top, bottom, left, right)

    near_white = arr.min(axis=2) > 245
    content = ~near_white
    rows = np.where(content.sum(axis=1) > 0)[0]
    cols = np.where(content.sum(axis=0) > 0)[0]
    if rows.size == 0 or cols.size == 0:
        return rgb

    pad = max(int(max(rgb.width, rgb.height) * 0.03), 12)
    top = max(0, int(rows[0]) - pad)
    bottom = min(rgb.height, int(rows[-1]) + 1 + pad)
    left = max(0, int(cols[0]) - pad)
    right = min(rgb.width, int(cols[-1]) + 1 + pad)
    return _square_crop(rgb, top, bottom, left, right)


def make_og_image(logo: Image.Image, out: Path) -> None:
    """社交分享图 1200×630"""
    canvas = Image.new("RGB", (1200, 630), "#fdf2f8")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1200, 8), fill="#db2777")
    draw.rectangle((0, 622, 1200, 630), fill="#9333ea")
    size = 380
    mark = logo.resize((size, size), Image.Resampling.LANCZOS)
    canvas.paste(mark, (80, (630 - size) // 2))
    canvas.save(out, optimize=True, quality=92)


def save_favicon(logo: Image.Image, out: Path) -> None:
    src = logo.convert("RGBA")
    sizes = [(16, 16), (32, 32), (48, 48)]
    images = [src.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    images[0].save(out, format="ICO", sizes=sizes)


def copy_to_frontend(*paths: Path) -> None:
    FRONTEND_PUBLIC.mkdir(parents=True, exist_ok=True)
    for src in paths:
        if src.exists():
            shutil.copy2(src, FRONTEND_PUBLIC / src.name)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"源文件不存在: {SOURCE}")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    BRAND_DIR.mkdir(parents=True, exist_ok=True)

    shutil.copy2(SOURCE, BRAND_DIR / "source.jpg")
    raw = Image.open(SOURCE)
    logo = crop_artboard(raw)
    logo.save(BRAND_DIR / "logo-crop.png", optimize=True)
    logo.save(PUBLIC / "logo.png", optimize=True)

    manifest_rows = []
    root_outputs: list[Path] = []
    for filename, size, desc in EXPORTS:
        out_brand = BRAND_DIR / filename
        logo.resize((size, size), Image.Resampling.LANCZOS).save(out_brand, optimize=True)
        manifest_rows.append({"file": filename, "size": f"{size}x{size}", "usage": desc})
        if filename in ROOT_COPIES:
            out_root = PUBLIC / filename
            shutil.copy2(out_brand, out_root)
            root_outputs.append(out_root)

    make_og_image(logo, BRAND_DIR / "og-1200x630.png")
    og_root = PUBLIC / "og-image.png"
    shutil.copy2(BRAND_DIR / "og-1200x630.png", og_root)

    save_favicon(logo, PUBLIC / "favicon.ico")
    save_favicon(logo, BRAND_DIR / "favicon.ico")

    (BRAND_DIR / "sizes.json").write_text(
        json.dumps(manifest_rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    manifest = {
        "name": "积木仓 BlockHub",
        "short_name": "积木仓",
        "description": "五分钟搭好，打开就能用",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#fdf2f8",
        "theme_color": "#db2777",
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
    }
    (PUBLIC / "manifest.webmanifest").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    copy_to_frontend(
        PUBLIC / "favicon.ico",
        PUBLIC / "favicon-32.png",
        PUBLIC / "logo-256.png",
        PUBLIC / "logo.png",
        PUBLIC / "apple-touch-icon.png",
        PUBLIC / "icon-192.png",
        PUBLIC / "icon-512.png",
        og_root,
    )

    print(f"source: {SOURCE.name}")
    print(f"logo crop: {logo.size[0]}x{logo.size[1]}")
    for row in manifest_rows:
        print(f"  {row['file']} — {row['usage']}")
    print("done ->", BRAND_DIR)
    print("frontend ->", FRONTEND_PUBLIC)


if __name__ == "__main__":
    main()
