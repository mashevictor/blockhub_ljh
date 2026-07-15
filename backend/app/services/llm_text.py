"""LLM 可见文案清洗：去掉一眼就像 AI 的 Markdown 记号。"""

from __future__ import annotations

import re


def sanitize_llm_plain_text(text: str | None) -> str:
    """去掉 **加粗**、多余 # 标题等，保留自然中文叙述。"""
    if not text:
        return ""
    t = str(text)
    # 成对 **bold** / __bold__
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t, flags=re.DOTALL)
    t = re.sub(r"__(.+?)__", r"\1", t, flags=re.DOTALL)
    # 残留的孤立 ** / __
    t = t.replace("**", "").replace("__", "")
    # 行首 Markdown 标题
    t = re.sub(r"(?m)^#{1,6}\s+", "", t)
    # 行首装饰性列表符号旁的多余空白保持原意；去掉 `code` 反引号包裹
    t = re.sub(r"`([^`]+)`", r"\1", t)
    return t.strip()


NO_MARKDOWN_STYLE_RULE = (
    "回答用自然中文，像同事口头说明；"
    "严禁使用 Markdown：不要出现 **加粗**、__加粗__、# 标题、```代码块、或成片 emoji。"
    "可用短句和 1. 2. 3. 编号，但不要用星号强调。"
)
