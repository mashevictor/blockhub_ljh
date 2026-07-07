from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class TextChunk:
    content: str
    page_number: int
    chunk_index: int


def extract_text_from_bytes(data: bytes, filename: str, mime_type: str) -> tuple[str, int]:
    lower = filename.lower()
    if lower.endswith(".pdf") or mime_type == "application/pdf":
        return _extract_pdf(data)
    if lower.endswith((".txt", ".md", ".markdown")) or mime_type.startswith("text/"):
        text = data.decode("utf-8", errors="ignore")
        return text, 1
    raise ValueError("暂仅支持 PDF、TXT、Markdown 文件")


def _extract_pdf(data: bytes) -> tuple[str, int]:
    import fitz

    doc = fitz.open(stream=data, filetype="pdf")
    pages: list[str] = []
    try:
        for page in doc:
            pages.append(page.get_text("text"))
    finally:
        doc.close()
    return "\n\n".join(pages), max(len(pages), 1)


def chunk_text(
    text: str,
    *,
    chunk_size: int = 500,
    overlap: int = 80,
) -> list[TextChunk]:
    cleaned = re.sub(r"\s+", " ", text).strip()
    if not cleaned:
        return []

    chunks: list[TextChunk] = []
    start = 0
    idx = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        piece = cleaned[start:end].strip()
        if piece:
            chunks.append(TextChunk(content=piece, page_number=0, chunk_index=idx))
            idx += 1
        if end >= len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 2)
