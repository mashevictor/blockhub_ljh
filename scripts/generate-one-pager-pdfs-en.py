#!/usr/bin/env python3
"""Generate en-US one-pager PDFs (+ printable HTML) for case downloads.

Writes flat siblings next to zh PDFs:
  home/public/downloads/one-pager-*.en-US.pdf
so localizeDownloadPath('/downloads/one-pager-retail.pdf', 'en-US') resolves.

Usage:
  backend/.venv/Scripts/python.exe scripts/generate-one-pager-pdfs-en.py
"""

from __future__ import annotations

import re
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "home" / "public" / "downloads"

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
_MIN_PAGES = 3

ONE_PAGERS: list[dict[str, Any]] = [
    {
        "basename": "one-pager-mfg",
        "doc_code": "BH-OP-MFG-2026.07-EN",
        "classification": "Case summary · anonymized · for internal forwarding",
        "tagline": "Built in five minutes. Ready to use.",
        "title": "Industry one-pager · Smart manufacturing",
        "subtitle": "Sales lead fast response · human confirmation loop · verifiable pilot metrics",
        "confidence_note": (
            "Metrics below are from a verified pilot (desensitized). No win-rate or revenue guarantees."
        ),
        "sections": [
            {
                "heading": "1. Customer background & pain",
                "paragraphs": [
                    "Precision parts manufacturer (~800 employees). ~40 new CRM leads per day. High-value leads often first contacted after 2–3 hours — competitors already engaged.",
                    "Sales wanted faster first response without losing ownership or sounding robotic on calls.",
                ],
            },
            {
                "heading": "2. What changed",
                "paragraphs": [
                    "First pilot: fully automatic outbound calling. After 4 weeks, sales pushed back (uncontrollable scripts, poor experience, unclear attribution) and IT raised compliance concerns — pilot paused.",
                    "Adjusted design: agent drafts follow-up copy from the lead profile; sales review and confirm before send. New leads get a suggestion within ~30 minutes of CRM entry.",
                ],
            },
            {
                "heading": "3. Architecture (human-in-the-loop)",
                "paragraphs": [
                    "CRM lead intake → intent / profile enrichment → draft message → human confirm → send via approved channels.",
                    "System linkage plus human confirmation before send — matches BlockHub CapShip dual-end delivery for web and mobile.",
                ],
            },
            {
                "heading": "4. Pilot results (verified)",
                "paragraphs": [
                    "200 desensitized real leads. Median first response from ~3.2 hours to 28 minutes. Frontline adoption 72%.",
                    "Sales lead and IT signed off in writing; project moved to commercial approval.",
                ],
            },
            {
                "heading": "5. Next steps for evaluators",
                "paragraphs": [
                    "Share this PDF with sales ops and IT. Pair with Trust Center security FAQ and integration checklist.",
                    "Book a demo on blockhub.club to receive a personalized materials pack.",
                ],
            },
        ],
        "html_panels": [
            ("Scenario", "Lead intake, draft follow-up, human confirm, then send."),
            ("Value", "First response ~28 min · 72% frontline adoption · dual-end publish."),
            ("Deploy", "PaaS or hybrid; keep human confirmation for first production scene."),
        ],
    },
    {
        "basename": "one-pager-retail",
        "doc_code": "BH-OP-RTL-2026.07-EN",
        "classification": "Case summary · anonymized · for internal forwarding",
        "tagline": "Built in five minutes. Ready to use.",
        "title": "Industry one-pager · Chain retail smart office",
        "subtitle": "Store policy Q&A · knowledge base rollout · HQ-to-store phased enablement",
        "confidence_note": (
            "Figures describe a typical phased rollout. Actual timelines depend on knowledge prep and seat count."
        ),
        "sections": [
            {
                "heading": "1. Customer background & pain",
                "paragraphs": [
                    "Regional chain retailer: HQ plus 120+ stores. Staff repeatedly asked HR about leave, shift rules, and benefits — HQ inbox overloaded.",
                    "Need one place for leave approval, policy Q&A, store reports, and notices — usable on web and phone.",
                ],
            },
            {
                "heading": "2. Solution scope",
                "paragraphs": [
                    "Leave / approval flows, policy knowledge Q&A, store reporting and broadcast notices.",
                    "One publish to five ends (Web · iOS · Android · Windows · macOS). Knowledge base linked so natural-language questions return accurate answers.",
                ],
            },
            {
                "heading": "3. Knowledge governance",
                "paragraphs": [
                    "HQ HR owns policy source docs; store managers see scoped answers. Optional approval before publishing policy updates.",
                    "RBAC keeps HQ vs store visibility clear; audit logs available for compliance review.",
                ],
            },
            {
                "heading": "4. Rollout rhythm",
                "paragraphs": [
                    "Week 1–2: HQ HR pilot and knowledge import. Then phased store enablement across 120+ sites.",
                    "First scene often live in ~5 minutes after template selection; full policy packaging typically ~2 weeks.",
                ],
            },
            {
                "heading": "5. Commercial & next steps",
                "paragraphs": [
                    "Standard PaaS by seat. Pair with pricing page and Trust Center for procurement review.",
                    "Book a demo to get the full retail materials pack and sample knowledge import checklist.",
                ],
            },
        ],
        "html_panels": [
            ("Scenario", "Leave approval, policy Q&A, store scheduling, benefits FAQ."),
            ("Value", "First scene in ~5 minutes; 120+ stores synced across five ends."),
            ("Deploy", "Standard PaaS by seat; ~2 weeks to organize policy docs into the knowledge base."),
        ],
    },
    {
        "basename": "one-pager-logistics",
        "doc_code": "BH-OP-LOG-2026.07-EN",
        "classification": "Case summary · anonymized · for internal forwarding",
        "tagline": "Built in five minutes. Ready to use.",
        "title": "Industry one-pager · Logistics & freight tracking",
        "subtitle": "Shipment lookup · exception push · 7×24 self-service cost down",
        "confidence_note": (
            "Pilot used 500 historical desensitized shipments over 14 days. Results are indicative, not a service SLA."
        ),
        "sections": [
            {
                "heading": "1. Customer background & pain",
                "paragraphs": [
                    "Mid-size freight forwarder: customers and ops staff constantly asked for shipment status, ETA, and exception reasons.",
                    "Manual replies were slow at night and weekends; tickets piled up in the service queue.",
                ],
            },
            {
                "heading": "2. Solution scope",
                "paragraphs": [
                    "Agent connected to TMS for live status. Exception shipments notify the responsible ops owner automatically.",
                    "After ~30 days, human service tickets dropped ~35%; satisfaction improved on self-serve lookups.",
                ],
            },
            {
                "heading": "3. Integration & escalation",
                "paragraphs": [
                    "Read-only TMS fields for tracking; write-back only where ops explicitly configures it.",
                    "Unclear answers escalate to human with conversation context — no silent dead-ends.",
                ],
            },
            {
                "heading": "4. Pilot design",
                "paragraphs": [
                    "14-day pilot, 500 desensitized historical shipments to validate query accuracy.",
                    "Exception push rules owned by the ops lead; channels include in-app and IM notify.",
                ],
            },
            {
                "heading": "5. Next steps",
                "paragraphs": [
                    "Review logistics industry pack scenarios and integration checklist with IT.",
                    "Book a demo for a tailored pack including tracking FAQ samples.",
                ],
            },
        ],
        "html_panels": [
            ("Scenario", "Shipment tracking, customer Q&A, quote approval end-to-end."),
            ("Value", "~35% fewer tickets · 7×24 self-serve · exception push to ops."),
            ("Deploy", "14-day pilot on desensitized history; TMS read-first integration."),
        ],
    },
]


def _register_fonts() -> None:
    yahei = Path(r"C:\Windows\Fonts\msyh.ttc")
    yahei_b = Path(r"C:\Windows\Fonts\msyhbd.ttc")
    arial = Path(r"C:\Windows\Fonts\arial.ttf")
    arial_b = Path(r"C:\Windows\Fonts\arialbd.ttf")
    if yahei.exists() and yahei_b.exists():
        pdfmetrics.registerFont(TTFont(_FONT, str(yahei), subfontIndex=0))
        pdfmetrics.registerFont(TTFont(_FONT_B, str(yahei_b), subfontIndex=0))
        return
    if arial.exists() and arial_b.exists():
        pdfmetrics.registerFont(TTFont(_FONT, str(arial)))
        pdfmetrics.registerFont(TTFont(_FONT_B, str(arial_b)))
        return
    raise RuntimeError("No suitable TTF/TTC font found (YaHei or Arial)")


def _wrap(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    if not text:
        return [""]
    words = text.split(" ")
    lines: list[str] = []
    buf = ""
    for w in words:
        trial = w if not buf else f"{buf} {w}"
        if c.stringWidth(trial, font, size) <= max_w:
            buf = trial
        else:
            if buf:
                lines.append(buf)
            # hard-break overlong tokens
            if c.stringWidth(w, font, size) > max_w:
                chunk = ""
                for ch in w:
                    t2 = chunk + ch
                    if c.stringWidth(t2, font, size) <= max_w:
                        chunk = t2
                    else:
                        if chunk:
                            lines.append(chunk)
                        chunk = ch
                buf = chunk
            else:
                buf = w
    if buf:
        lines.append(buf)
    return lines or [""]


def render_pdf(spec: dict[str, Any]) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_no = {"n": 1}

    def header_footer() -> None:
        c.setFillColorRGB(*_NAVY)
        c.rect(0, _PAGE_H - 12 * mm, _PAGE_W, 12 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT_B, 10)
        c.drawString(_MX, _PAGE_H - 7.5 * mm, "BlockHub")
        c.setFont(_FONT, 8)
        c.drawString(_MX + 28 * mm, _PAGE_H - 7 * mm, "·  " + spec["tagline"])
        c.drawRightString(_PAGE_W - _MX, _PAGE_H - 7 * mm, spec["doc_code"])
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
    c.setFont(_FONT_B, 16)
    for line in _wrap(c, spec["title"], _FONT_B, 16, _CW):
        c.drawString(_MX, y, line)
        y -= 7 * mm

    c.setFillColorRGB(*_MUTED)
    c.setFont(_FONT, 10)
    for line in _wrap(c, spec["subtitle"], _FONT, 10, _CW):
        c.drawString(_MX, y, line)
        y -= 5 * mm

    y -= 1 * mm
    c.setFillColorRGB(*_TEAL)
    c.rect(_MX, y + 1 * mm, 16 * mm, 1.1 * mm, fill=1, stroke=0)
    y -= 5 * mm

    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT, 8.5)
    meta_line = f"{spec['classification']}  ·  Version {_TODAY}"
    for line in _wrap(c, meta_line, _FONT, 8.5, _CW):
        c.drawString(_MX, y, line)
        y -= 4.2 * mm

    y -= 2 * mm
    note = "Confidence note: " + spec["confidence_note"]
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

    for sec in spec["sections"]:
        heading = sec["heading"]
        paragraphs = sec["paragraphs"]
        if y < _MB + 28 * mm:
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
            for line in _wrap(c, para, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    y = new_page()
                    c.setFillColorRGB(*_TEXT)
                    c.setFont(_FONT, 10)
                c.drawString(_MX, y, line)
                y -= 5.2 * mm
            y -= 2.4 * mm
        y -= 2 * mm

    while page_no["n"] < _MIN_PAGES:
        y = new_page()
        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 12)
        c.drawString(_MX, y, f"Appendix · Review worksheet (page {page_no['n']})")
        y -= 7 * mm
        c.setStrokeColorRGB(*_TEAL)
        c.setLineWidth(2)
        c.line(_MX, y + 2 * mm, _MX + 14 * mm, y + 2 * mm)
        y -= 4 * mm
        c.setFillColorRGB(*_TEXT)
        c.setFont(_FONT, 10)
        work = [
            "1. Map your internal review questions to sections above:",
            "Q ____ → Section ________    Q ____ → Section ________",
            "2. Preferred deployment: □ PaaS  □ Hybrid  □ On-prem  □ TBD",
            "3. Systems in scope: IdP________  ERP________  CRM / TMS________  IM________",
            "4. Pilot success metrics (quantified): ______________________________",
            "5. Must-keep controls (e.g. human confirm, data residency): __________",
            "6. Target go-live window & owner: ____________________________________",
            "Reviewer: ____________  Date: ____________  Dept: ____________",
            "BlockHub contact: ____________  Doc: " + spec["doc_code"],
        ]
        for m in work:
            for line in _wrap(c, m, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    break
                c.drawString(_MX, y, line)
                y -= 5.4 * mm
            y -= 2.0 * mm
            if y < _MB + 12 * mm:
                break

    c.save()
    return buf.getvalue()


def render_html(spec: dict[str, Any]) -> str:
    panels = "".join(
        f'<div class="panel"><h2>{h}</h2><p>{p}</p></div>' for h, p in spec["html_panels"]
    )
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>{spec['title']} · BlockHub</title>
<style>
@page {{ margin: 18mm; }}
body {{ font-family: Arial,"Helvetica Neue",sans-serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.75; background: #f8fafc; }}
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
<p class="noprint" style="background:#eff6ff;padding:10px;border-radius:8px;font-size:13px;">&gt;&gt; BlockHub materials · Print to PDF (Ctrl+P) · EN locale pack</p>
<div class="brand"><strong>BlockHub</strong>{spec['tagline']} · Case one-pager</div>
<h1>{spec['title']}</h1>
<p class="sub">{spec['subtitle']} · {_TODAY[:4]}</p>
{panels}
<div class="footer">© BlockHub · For invited customer internal evaluation only · {spec['doc_code']}</div>
</body></html>
"""


def main() -> None:
    _register_fonts()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in ONE_PAGERS:
        pdf = render_pdf(spec)
        pdf_path = OUT_DIR / f"{spec['basename']}.en-US.pdf"
        pdf_path.write_bytes(pdf)
        html_path = OUT_DIR / f"{spec['basename']}.en-US.html"
        html_path.write_text(render_html(spec), encoding="utf-8")
        pages = len(re.findall(rb"/Type\s*/Page[^s]", pdf))
        print(f"OK  {pdf_path.name}  {len(pdf)} bytes  pages≈{pages}  + {html_path.name}")


if __name__ == "__main__":
    main()
