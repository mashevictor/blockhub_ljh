from __future__ import annotations

from dataclasses import dataclass

from app.services.kb_store import SearchHit

RAG_SYSTEM_APPENDIX = (
    "若提供了「知识库参考片段」，请优先依据片段作答；"
    "在回答末尾用【引用: 编号】标注使用过的片段（如【引用: 1,2】）。"
    "若片段不足以回答，请明确说明并建议查阅原始文档。"
)


@dataclass
class RagContext:
    context_text: str
    citations: list[dict]


def build_rag_context(hits: list[SearchHit]) -> RagContext | None:
    if not hits:
        return None
    blocks: list[str] = []
    citations: list[dict] = []
    for i, hit in enumerate(hits, start=1):
        snippet = hit.content if len(hit.content) <= 240 else f"{hit.content[:240]}…"
        blocks.append(f"[{i}] 来源《{hit.doc_name}》\n{hit.content}")
        citations.append({
            "index": i,
            "doc_name": hit.doc_name,
            "document_id": hit.document_id,
            "chunk_index": hit.chunk_index,
            "snippet": snippet,
            "score": hit.score,
        })
    return RagContext(context_text="\n\n".join(blocks), citations=citations)


def build_rag_messages(
    user_message: str,
    history: list[dict[str, str]] | None,
    rag: RagContext | None,
    *,
    system_prompt: str | None = None,
) -> list[dict[str, str]]:
    from app.services.llm_gateway import CHAT_SYSTEM_PROMPT
    from app.services.llm_text import NO_MARKDOWN_STYLE_RULE

    system = system_prompt or CHAT_SYSTEM_PROMPT
    if rag:
        system = (
            f"{system}\n\n{RAG_SYSTEM_APPENDIX}\n\n"
            f"--- 知识库参考片段 ---\n{rag.context_text}\n--- 片段结束 ---\n"
            f"{NO_MARKDOWN_STYLE_RULE}"
        )
    msgs: list[dict[str, str]] = [{"role": "system", "content": system}]
    for item in history or []:
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_message})
    return msgs
