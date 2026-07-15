"""编排工作台业务问答 — 优先 DeepSeek。"""

from __future__ import annotations

from app.core.config import settings
from app.services.deepseek_client import deepseek_text_chat
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text

_SYSTEM = f"""你是积木仓 BlockHub 应用编排助手。
根据用户问题、当前应用与已选模块/流程节点，用简洁中文回答（面向产品和联调验收）。
要求：
1. 必须结合给出的应用名、模块列表、当前节点作答，不要套用无关行业模板。
2. 若问「解决什么问题 / 用户旅程 / 功能清单 / 怎么测 / 风险」，分别给出对应结构清晰的回答。
3. 可提示下一步可执行动作（打开某节点、测 IN/OUT、试运营），但不要编造未给出的 API。
4. 控制在 400 字以内，用短段或编号列表。
5. {NO_MARKDOWN_STYLE_RULE}"""


def _local_fallback(
    *,
    question: str,
    app_name: str,
    modules: list[str],
    nodes: list[str],
    active_node: str,
    active_side: str,
) -> str:
    chain = nodes or modules or ["（尚未选择模块）"]
    side = "OUT" if active_side == "output" else "IN"
    return (
        f"【本地兜底·DeepSeek 未配置或调用失败】\n"
        f"应用：{app_name or '未命名应用'}\n"
        f"问题：{question}\n"
        f"流程节点：{' → '.join(chain)}\n"
        f"当前：{active_node or '未选'} · {side}\n"
        f"请检查服务器 DEEPSEEK_API_KEY 后重试，或先对该节点执行「测试 IN」。"
    )


def answer_flow_question(
    *,
    question: str,
    app_name: str = "",
    modules: list[str] | None = None,
    nodes: list[str] | None = None,
    active_node: str = "",
    active_side: str = "input",
    extra_context: str = "",
) -> dict:
    q = (question or "").strip()
    mods = [m for m in (modules or []) if m]
    nods = [n for n in (nodes or []) if n]
    llm_ok = bool(settings.deepseek_api_key)
    if len(q) < 1:
        return {
            "answer": "请输入要分析的问题。",
            "source": "fallback",
            "llm_configured": llm_ok,
        }

    user = (
        f"应用名：{app_name or '未命名应用'}\n"
        f"已选模块：{', '.join(mods) if mods else '无'}\n"
        f"流程节点：{' → '.join(nods) if nods else '无'}\n"
        f"当前节点：{active_node or '无'}\n"
        f"当前侧重：{'OUT' if active_side == 'output' else 'IN'}\n"
    )
    if extra_context.strip():
        user += f"补充上下文：{extra_context.strip()[:800]}\n"
    user += f"\n用户问题：{q}"

    if llm_ok:
        text = deepseek_text_chat(_SYSTEM, user, temperature=0.4)
        if text:
            return {
                "answer": sanitize_llm_plain_text(text),
                "source": "deepseek",
                "llm_configured": True,
            }

    return {
        "answer": _local_fallback(
            question=q,
            app_name=app_name,
            modules=mods,
            nodes=nods,
            active_node=active_node,
            active_side=active_side,
        ),
        "source": "fallback",
        "llm_configured": llm_ok,
    }
