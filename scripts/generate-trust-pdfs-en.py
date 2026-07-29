#!/usr/bin/env python3
"""Generate en-US trust PDFs (+ printable HTML) matching zh layout/brand.

Keeps the same A4 reportlab chrome as scripts/generate-download-pdfs.py
(navy/teal bars, YaHei, ≥4 pages). Body comes from content.json (en-US)
plus English appendix expansion — does not overwrite zh root PDFs.

Usage:
  backend/.venv/Scripts/python.exe scripts/generate-trust-pdfs-en.py
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "home" / "public" / "downloads" / "en-US"
CONTENT_EN = REPO / "shared" / "i18n" / "messages" / "en-US" / "content.json"

from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402
from reportlab.pdfgen import canvas  # noqa: E402

_NAVY = (0x0D / 255, 0x47 / 255, 0xA1 / 255)
_TEAL = (0x00 / 255, 0xB8 / 255, 0x94 / 255)
_TEXT = (0x33 / 255, 0x33 / 255, 0x33 / 255)
_MUTED = (0x66 / 255, 0x66 / 255, 0x66 / 255)
_SOFT = (0xEA / 255, 0xF2 / 255, 0xFF / 255)

_PAGE_W, _PAGE_H = A4
_MX = 18 * mm
_MT = 20 * mm
_MB = 16 * mm
_CW = _PAGE_W - 2 * _MX
_TODAY = date.today().isoformat()
_FONT = "BHSans"
_FONT_B = "BHSansBold"
_MIN_PAGES = 4

# content.json trust.* id → PDF filename (same basenames as zh)
TRUST_FILES: list[dict[str, str]] = [
    {
        "id": "security-whitepaper",
        "file": "security-whitepaper.pdf",
        "html": "security-whitepaper.html",
        "doc_code": "BH-SEC-WP-2026.07",
        "classification": "Controlled external · for procurement / security / compliance review",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/security-whitepaper",
    },
    {
        "id": "integration",
        "file": "integration-checklist.pdf",
        "html": "integration-checklist.html",
        "doc_code": "BH-INT-CL-2026.07",
        "classification": "Controlled external · for IT / integrator review",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/integration",
    },
    {
        "id": "dpa",
        "file": "dpa-summary.pdf",
        "html": "dpa-summary.html",
        "doc_code": "BH-DPA-SM-2026.07",
        "classification": "Summary · stamped agreement prevails for signing",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/dpa",
    },
    {
        "id": "deployment",
        "file": "deployment-modes.pdf",
        "html": "deployment-modes.html",
        "doc_code": "BH-DEP-MD-2026.07",
        "classification": "Controlled external · for architecture / procurement",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/deployment",
    },
    {
        "id": "security-faq",
        "file": "security-faq.pdf",
        "html": "security-faq.html",
        "doc_code": "BH-SEC-FAQ-2026.07",
        "classification": "Pre-filled sample · customizable to customer questionnaires",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/security-faq",
    },
    {
        "id": "audit-log",
        "file": "audit-log-sample.pdf",
        "html": "audit-log-sample.html",
        "doc_code": "BH-AUD-LG-2026.07",
        "classification": "Controlled external · for security / internal audit",
        "tagline": "Built in five minutes. Ready to use.",
        "online": "/trust/audit-log",
    },
]

APPENDIX_BANK = [
    "This appendix supports IT review and does not change commitments in the body.",
    "If terms conflict with a signed contract, the stamped agreement and order annex prevail.",
    "Share this pack with deployment modes, DPA summary, and audit-log samples for joint sign-off.",
    "During pilots, prioritize permission isolation, audit export, and human-confirm write-back paths.",
    "Before go-live: staging integration, account matrix, rollback plan, and acceptance minutes.",
    "Under NDA, customers may request the sub-processor list and annual security assessment summary.",
    "Metric language without separate notes refers to anonymized pilots or reference ranges — not SLAs.",
    "Support hours and response tiers follow the subscription tier / private-deployment SLA annex.",
    "Change management uses least privilege and dual review; production write-back is confirmable.",
    "Document versions track product releases; the download page serves the latest PDF.",
    "Clarify open questions via a booked demo or written follow-up with customer success.",
    "Internal forwarding is allowed; public republication requires written BlockHub permission.",
]

TAIL_SECTIONS = [
    {
        "heading": "Review recommendations & next steps",
        "paragraphs": [
            "Have security, architecture, procurement, and business owners review together and mark gaps against your questionnaire.",
            "Gap items can become a customized response pack after a demo — avoid verbal promises in contracts.",
            "Agree pilot acceptance in writing: permission matrix, audit export sample, confirm-before-write-back, and rollback conditions.",
            "Commercial path: materials review → demo / PoC → quote & DPA → go-live and ops handover.",
        ],
    },
    {
        "heading": "Terminology",
        "paragraphs": [
            "“Default” means standard product configuration; hybrid/private may adjust per proposal.",
            "“Supports” means capability or connector templates exist — not zero-effort go-live.",
            "“Reference range” is for commercial discussion; the stamped quote and order govern.",
            "“Verifiable” means logs, reports, or acceptance minutes can corroborate pilot outcomes.",
        ],
    },
    {
        "heading": "Contact & stamped copies",
        "paragraphs": [
            "Online: blockhub.club Trust Center, customer stories, and book-a-demo.",
            "Available on request: stamped DPA, full security questionnaire (Word), sub-processor list, pen-test summary (NDA).",
            "This PDF tracks the online Trust Center; if versions conflict, prefer the newer document code / date.",
            "When forwarding externally, keep the full PDF (including confidence note and document code).",
        ],
    },
]


def _register_fonts() -> None:
    yahei = Path(r"C:\Windows\Fonts\msyh.ttc")
    yahei_b = Path(r"C:\Windows\Fonts\msyhbd.ttc")
    if yahei.exists() and yahei_b.exists():
        pdfmetrics.registerFont(TTFont(_FONT, str(yahei), subfontIndex=0))
        pdfmetrics.registerFont(TTFont(_FONT_B, str(yahei_b), subfontIndex=0))
        return
    raise RuntimeError("Microsoft YaHei not found (msyh.ttc / msyhbd.ttc)")


def _strip_md(s: str) -> str:
    t = s or ""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = t.replace("**", "").replace("`", "").replace("*", "")
    return t.strip()


def _wrap(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    if not text:
        return [""]
    # Word-aware wrap for Latin; fall back to char wrap for CJK leftovers
    words = text.split(" ")
    if len(words) > 1 and not re.search(r"[\u4e00-\u9fff]", text):
        lines: list[str] = []
        buf = ""
        for w in words:
            trial = w if not buf else f"{buf} {w}"
            if c.stringWidth(trial, font, size) <= max_w:
                buf = trial
            else:
                if buf:
                    lines.append(buf)
                buf = w
        if buf:
            lines.append(buf)
        return lines or [""]
    buf = ""
    lines = []
    for ch in text:
        trial = buf + ch
        if c.stringWidth(trial, font, size) <= max_w:
            buf = trial
        else:
            if buf:
                lines.append(buf)
            buf = ch
    if buf:
        lines.append(buf)
    return lines or [""]


def _expand_sections(sections: list[dict[str, Any]], min_paras: int = 48) -> list[dict[str, Any]]:
    total = sum(len(s.get("paragraphs") or []) for s in sections)
    if total >= min_paras:
        return sections
    need = min_paras - total
    extra: list[str] = []
    i = 0
    while len(extra) < need:
        extra.append(APPENDIX_BANK[i % len(APPENDIX_BANK)])
        i += 1
    out = list(sections)
    chunk: list[str] = []
    idx = 1
    for p in extra:
        chunk.append(p)
        if len(chunk) >= 4:
            out.append({"heading": f"Appendix {idx} · review notes", "paragraphs": chunk})
            chunk = []
            idx += 1
    if chunk:
        out.append({"heading": f"Appendix {idx} · review notes", "paragraphs": chunk})
    return out


def load_sections_from_content(messages: dict[str, str], doc_id: str) -> tuple[str, str, list[dict[str, Any]]]:
    prefix = f"trust.{doc_id}"
    title = messages.get(f"{prefix}.title", doc_id)
    subtitle = messages.get(f"{prefix}.subtitle", "")
    sections: list[dict[str, Any]] = []
    si = 0
    while True:
        h = messages.get(f"{prefix}.sec.{si}.h")
        if not h:
            break
        paras: list[str] = []
        pi = 0
        while True:
            p = messages.get(f"{prefix}.sec.{si}.p.{pi}")
            if p is None:
                break
            paras.append(p)
            pi += 1
        sections.append({"heading": h, "paragraphs": paras})
        si += 1
    return title, subtitle, sections


def build_body(messages: dict[str, str], meta: dict[str, str]) -> dict[str, Any]:
    title, subtitle, sections = load_sections_from_content(messages, meta["id"])
    note = (
        f"Describes BlockHub default product capabilities and contract-ready commitments; "
        f"private / industry customizations follow signed annexes. Document code {meta['doc_code']}."
    )
    sections = sections + TAIL_SECTIONS
    sections = _expand_sections(sections, min_paras=48)
    return {
        "title": title,
        "subtitle": subtitle,
        "confidence_note": note,
        "sections": sections,
    }


def render_pdf(meta: dict[str, str], body: dict[str, Any]) -> bytes:
    _register_fonts()
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_no = {"n": 1}

    def header_footer() -> None:
        c.setFillColorRGB(*_NAVY)
        c.rect(0, _PAGE_H - 11 * mm, _PAGE_W, 11 * mm, fill=1, stroke=0)
        c.setFillColorRGB(*_TEAL)
        c.rect(0, _PAGE_H - 11 * mm, 3.2 * mm, 11 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT_B, 9)
        c.drawString(_MX, _PAGE_H - 7 * mm, "BlockHub")
        c.setFont(_FONT, 8)
        c.drawString(_MX + 28 * mm, _PAGE_H - 7 * mm, "·  " + meta["tagline"])
        c.drawRightString(_PAGE_W - _MX, _PAGE_H - 7 * mm, meta["doc_code"])
        c.setStrokeColorRGB(0.86, 0.90, 0.95)
        c.setLineWidth(0.6)
        c.line(_MX, 11 * mm, _PAGE_W - _MX, 11 * mm)
        c.setFillColorRGB(*_MUTED)
        c.setFont(_FONT, 7.5)
        c.drawString(_MX, 6.5 * mm, f"© {_TODAY[:4]} BlockHub · Internal evaluation only · {_TODAY}")
        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 8)
        c.drawRightString(_PAGE_W - _MX, 6.5 * mm, f"{page_no['n']}")

    def new_page() -> float:
        c.showPage()
        page_no["n"] += 1
        header_footer()
        return _PAGE_H - _MT

    header_footer()
    y = _PAGE_H - _MT

    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT_B, 18)
    for line in _wrap(c, body["title"], _FONT_B, 18, _CW):
        c.drawString(_MX, y, line)
        y -= 8 * mm

    c.setFillColorRGB(*_MUTED)
    c.setFont(_FONT, 10)
    for line in _wrap(c, body["subtitle"], _FONT, 10, _CW):
        c.drawString(_MX, y, line)
        y -= 5 * mm

    y -= 1 * mm
    c.setFillColorRGB(*_TEAL)
    c.rect(_MX, y + 1 * mm, 16 * mm, 1.1 * mm, fill=1, stroke=0)
    y -= 4 * mm

    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT, 8.5)
    meta_line = f"{meta['classification']}  ·  Version {_TODAY}"
    for line in _wrap(c, meta_line, _FONT, 8.5, _CW):
        c.drawString(_MX, y, line)
        y -= 4.2 * mm

    y -= 2 * mm
    note = "Confidence note: " + str(body.get("confidence_note") or "")
    note_lines = _wrap(c, note, _FONT, 9, _CW - 8 * mm)
    box_h = 6 * mm + len(note_lines) * 4.2 * mm
    if y - box_h < _MB + 10 * mm:
        y = new_page()
    c.setFillColorRGB(*_SOFT)
    c.setStrokeColorRGB(*_NAVY)
    c.setLineWidth(1)
    c.roundRect(_MX, y - box_h + 2 * mm, _CW, box_h, 4, fill=1, stroke=1)
    c.setFillColorRGB(*_TEXT)
    c.setFont(_FONT, 9)
    ty = y - 3.5 * mm
    for line in note_lines:
        c.drawString(_MX + 4 * mm, ty, line)
        ty -= 4.2 * mm
    y = y - box_h - 5 * mm

    for sec in body.get("sections") or []:
        heading = str(sec.get("heading") or "")
        paragraphs = sec.get("paragraphs") or []
        if y < _MB + 32 * mm:
            y = new_page()

        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 12)
        for line in _wrap(c, heading, _FONT_B, 12, _CW):
            if y < _MB + 14 * mm:
                y = new_page()
                c.setFillColorRGB(*_NAVY)
                c.setFont(_FONT_B, 12)
            c.drawString(_MX, y, line)
            y -= 6 * mm

        c.setStrokeColorRGB(*_TEAL)
        c.setLineWidth(2)
        c.line(_MX, y + 2.5 * mm, _MX + 14 * mm, y + 2.5 * mm)
        y -= 2 * mm

        c.setFillColorRGB(*_TEXT)
        c.setFont(_FONT, 10)
        for para in paragraphs:
            text = _strip_md(str(para))
            if not text:
                continue
            for line in _wrap(c, text, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    y = new_page()
                    c.setFillColorRGB(*_TEXT)
                    c.setFont(_FONT, 10)
                c.drawString(_MX, y, line)
                y -= 5.2 * mm
            y -= 2.4 * mm
        y -= 3 * mm

    if y < _MB + 24 * mm:
        y = new_page()
    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT_B, 9)
    c.drawString(_MX, y, "Request stamped copies / full questionnaire / gap analysis")
    y -= 5 * mm
    c.setFillColorRGB(*_MUTED)
    c.setFont(_FONT, 9)
    for line in _wrap(
        c,
        "Visit the Trust Center on blockhub.club, or book a demo with customer success. Include this PDF document code for version checks.",
        _FONT,
        9,
        _CW,
    ):
        c.drawString(_MX, y, line)
        y -= 4.5 * mm

    while page_no["n"] < _MIN_PAGES:
        y = new_page()
        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 12)
        c.drawString(_MX, y, f"Appendix · review worksheet (page {page_no['n']})")
        y -= 7 * mm
        c.setStrokeColorRGB(*_TEAL)
        c.setLineWidth(2)
        c.line(_MX, y + 2 * mm, _MX + 14 * mm, y + 2 * mm)
        y -= 4 * mm
        c.setFillColorRGB(*_TEXT)
        c.setFont(_FONT, 10)
        work = [
            "1. Map your security questionnaire item numbers to sections in this pack:",
            "Item ____ → Section ________    Item ____ → Section ________",
            "Item ____ → Section ________    Item ____ → Section ________",
            "2. Deployment preference: □ PaaS  □ Hybrid  □ Private  □ TBD",
            "3. Existing systems: IdP________  ERP________  CRM________  IM________",
            "4. PoC success criteria (measurable): ______________________________",
            "5. Open risks / blockers: ________________________________________",
            "6. Next meeting date / owners: ___________________________________",
        ]
        for line in work:
            for wrapped in _wrap(c, line, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    break
                c.drawString(_MX, y, wrapped)
                y -= 6 * mm
            y -= 2 * mm

    c.save()
    return buf.getvalue()


def render_html(meta: dict[str, str], body: dict[str, Any]) -> str:
    panels = []
    for sec in body["sections"]:
        paras = "".join(f"<p>{_strip_md(p)}</p>" for p in sec.get("paragraphs") or [])
        panels.append(f'<div class="panel"><h2>{sec["heading"]}</h2>{paras}</div>')
    body_html = "".join(panels)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>{body['title']} · BlockHub</title>
<style>
@page {{ margin: 18mm; }}
body {{ font-family: "PingFang SC","Microsoft YaHei",sans-serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.75; background: #f8fafc; }}
.brand {{ background: linear-gradient(90deg,#0d47a1,#1976d2); color:#fff; padding:14px 20px; border-radius:10px; margin-bottom:24px; font-size:13px; }}
.brand strong {{ font-size:16px; display:block; margin-bottom:4px; }}
h1 {{ color: #0d47a1; font-size: 24px; margin: 0 0 6px; }}
.sub {{ color: #64748b; font-size: 13px; margin-bottom: 28px; }}
.panel {{ background:#fff; border:1px solid #e2e8f0; border-top:4px solid #0d47a1; border-radius:10px; padding:18px 20px; margin-bottom:18px; }}
.panel h2 {{ color: #0d47a1; font-size: 16px; margin: 0 0 10px; border-left: 4px solid #00b894; padding-left: 10px; }}
p {{ font-size: 14px; margin: 0 0 10px; }}
.footer {{ margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }}
@media print {{ .noprint {{ display: none; }} body {{ background:#fff; }} }}
</style></head><body>
<p class="noprint" style="background:#eff6ff;padding:10px;border-radius:8px;font-size:13px;">&gt;&gt; BlockHub materials · Print to PDF (Ctrl+P) · Sync with online <a href="{meta['online']}">Trust Center</a></p>
<div class="brand"><strong>BlockHub</strong>{meta['tagline']} · Trust &amp; compliance</div>
<h1>{body['title']}</h1>
<p class="sub">{body['subtitle']} · {meta['doc_code']} · {_TODAY[:4]}</p>
{body_html}
<div class="footer">© BlockHub · For invited customer internal evaluation only · Aligned with zh pack format</div>
</body></html>
"""


def main() -> None:
    messages = json.loads(CONTENT_EN.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for meta in TRUST_FILES:
        body = build_body(messages, meta)
        pdf_bytes = render_pdf(meta, body)
        pdf_path = OUT_DIR / meta["file"]
        pdf_path.write_bytes(pdf_bytes)
        # Flat sibling next to zh PDFs — preferred by localizeDownloadPath
        flat = OUT_DIR.parent / meta["file"].replace(".pdf", ".en-US.pdf")
        flat.write_bytes(pdf_bytes)
        html_path = OUT_DIR / meta["html"]
        html_path.write_text(render_html(meta, body), encoding="utf-8")
        print(f"OK  {pdf_path.relative_to(REPO)}  + {flat.name}  ({len(pdf_bytes)} bytes)")


if __name__ == "__main__":
    main()
