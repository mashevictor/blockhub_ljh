from __future__ import annotations

import html
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfgen import canvas

from app.services.file_storage import contract_dir, save_bytes, uploads_root

_FONT = "STSong-Light"
_PAGE_W, _PAGE_H = A4


def _ensure_font() -> None:
    try:
        pdfmetrics.getFont(_FONT)
    except KeyError:
        pdfmetrics.registerFont(UnicodeCIDFont(_FONT))


def _html_to_lines(body_html: str) -> list[tuple[str, bool]]:
    text = body_html or ""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n", text, flags=re.I)
    text = re.sub(r"</h[1-6]>", "\n", text, flags=re.I)
    text = re.sub(r"<h[1-6][^>]*>", "", text, flags=re.I)
    text = re.sub(r"<p[^>]*>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    lines: list[tuple[str, bool]] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            lines.append(("", False))
            continue
        is_heading = len(line) <= 24 and (
            line.endswith("合同") or line.endswith("协议") or (line.startswith("第") and "条" in line[:6])
        )
        lines.append((line, is_heading))
    return lines


def _wrap_line(c: canvas.Canvas, text: str, font: str, size: int, max_width: float) -> list[str]:
    if not text:
        return [""]
    buf = ""
    lines: list[str] = []
    for ch in text:
        trial = buf + ch
        if c.stringWidth(trial, font, size) <= max_width:
            buf = trial
        else:
            if buf:
                lines.append(buf)
            buf = ch
    if buf:
        lines.append(buf)
    return lines or [""]


def generate_default_seal(
    company_name: str,
    contract_id: str,
    *,
    seal_text: str = "合同专用章",
    style: str = "round",
) -> str:
    """生成模拟电子公章 PNG（Pillow 实现，参考开放签印章生成交互）。"""
    size = 280
    img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    red = (196, 30, 30, 255)
    red_light = (196, 30, 30, 180)
    try:
        font_lg = ImageFont.truetype("msyh.ttc", 22)
        font_sm = ImageFont.truetype("msyh.ttc", 18)
    except OSError:
        try:
            font_lg = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", 20)
            font_sm = font_lg
        except OSError:
            font_lg = ImageFont.load_default()
            font_sm = font_lg
    margin = 10
    if style == "square":
        draw.rectangle([margin, margin, size - margin, size - margin], outline=red, width=5)
        draw.rectangle([margin + 12, margin + 12, size - margin - 12, size - margin - 12], outline=red_light, width=2)
    else:
        draw.ellipse([margin, margin, size - margin, size - margin], outline=red, width=5)
        draw.ellipse([margin + 14, margin + 14, size - margin - 14, size - margin - 14], outline=red_light, width=2)
    center_text = (seal_text or "合同专用章")[:6]
    cb = draw.textbbox((0, 0), center_text, font=font_lg)
    tw = cb[2] - cb[0]
    draw.text(((size - tw) / 2, size * 0.38), center_text, fill=red, font=font_lg)
    star = "★"
    sb = draw.textbbox((0, 0), star, font=font_lg)
    sw = sb[2] - sb[0]
    draw.text(((size - sw) / 2, size * 0.52), star, fill=red, font=font_lg)
    name = (company_name or "单位名称").replace("\n", "")[:12]
    nb = draw.textbbox((0, 0), name, font=font_sm)
    nw = nb[2] - nb[0]
    draw.text(((size - nw) / 2, size * 0.68), name, fill=red, font=font_sm)
    fname = f"seal_{style}.png"
    dest = contract_dir(contract_id) / fname
    img.save(dest, "PNG")
    return f"contracts/{contract_id}/{fname}"


def build_contract_pdf(
    *,
    contract_id: str,
    title: str,
    body_html: str,
    parties: dict,
    assets: list[dict],
    signed: bool = False,
) -> tuple[bytes, str]:
    _ensure_font()
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    margin_x = 22 * mm
    margin_top = 24 * mm
    y = _PAGE_H - margin_top
    max_w = _PAGE_W - 2 * margin_x

    c.setFont(_FONT, 18)
    c.drawString(margin_x, y, title or "合同")
    y -= 10 * mm

    c.setFont(_FONT, 11)
    c.drawString(margin_x, y, f"甲方：{parties.get('party_a', '甲方')}")
    y -= 6 * mm
    c.drawString(margin_x, y, f"乙方：{parties.get('party_b', '乙方')}")
    y -= 8 * mm

    for line, is_heading in _html_to_lines(body_html):
        if y < 45 * mm:
            c.showPage()
            y = _PAGE_H - margin_top
            c.setFont(_FONT, 11)
        if not line:
            y -= 4 * mm
            continue
        size = 12 if is_heading else 11
        c.setFont(_FONT, size)
        for wrapped in _wrap_line(c, line, _FONT, size, max_w):
            if y < 45 * mm:
                c.showPage()
                y = _PAGE_H - margin_top
                c.setFont(_FONT, size)
            c.drawString(margin_x, y, wrapped)
            y -= 5.5 * mm

    if y < 55 * mm:
        c.showPage()
        y = _PAGE_H - margin_top
    y -= 6 * mm
    c.setFont(_FONT, 11)
    c.drawString(margin_x, y, "（以下签字盖章）")

    page_idx = c.getPageNumber() - 1
    _draw_assets_on_canvas(c, page_idx, assets)

    if signed:
        c.setFont(_FONT, 9)
        c.setFillColorRGB(0.45, 0.45, 0.45)
        c.drawString(margin_x, 12 * mm, "本文件由 BlockHub 合同盖章 Agent 生成 · 企业内部电子留痕")

    c.save()
    pdf_bytes = buf.getvalue()
    fname = "signed.pdf" if signed else "preview.pdf"
    rel = f"contracts/{contract_id}/{fname}"
    save_bytes(pdf_bytes, contract_dir(contract_id) / fname)
    return pdf_bytes, rel


def _draw_assets_on_canvas(c: canvas.Canvas, page_idx: int, assets: list[dict]) -> None:
    for asset in assets:
        placement = asset.get("placement_json") or asset.get("placement") or {}
        if int(placement.get("page", 0)) != page_idx:
            continue
        file_key = asset.get("file_key", "")
        if not file_key:
            continue
        path = uploads_root() / file_key
        if not path.is_file():
            continue

        x_pct = float(placement.get("x_pct", 10))
        y_pct = float(placement.get("y_pct", 12))
        w_pct = float(placement.get("width_pct", 25))
        h_pct = float(placement.get("height_pct", 10))

        w = _PAGE_W * w_pct / 100
        h = _PAGE_H * h_pct / 100
        x = _PAGE_W * x_pct / 100
        y = _PAGE_H * (1 - y_pct / 100) - h

        c.drawImage(str(path), x, y, width=w, height=h, preserveAspectRatio=True, mask="auto")
        label = asset.get("label") or ("签名" if asset.get("asset_type") == "signature" else "电子章")
        c.setFont(_FONT, 8)
        c.setFillColorRGB(0.35, 0.35, 0.35)
        c.drawString(x, y - 3 * mm, label)
