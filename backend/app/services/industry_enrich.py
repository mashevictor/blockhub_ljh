"""行业深度包 DeepSeek 丰富 + 静态兜底文案。"""

from __future__ import annotations

from typing import Any

from app.data.industry_packs_all import pack_meta, scene_count_for_pack
from app.services.deepseek_client import deepseek_json_chat

# 静态兜底（无 API Key 或 LLM 失败时使用）
_STATIC_ENRICH: dict[str, dict[str, Any]] = {
    "office": {
        "overview": "通用办公深度包覆盖人事行政、财务法务、知识协同、流程审批等 8 大办公域，66 项标准场景可即选即用。适合全员数字化办公、制度问答、请假报销与待办审批一体化落地。",
        "highlights": ["8 大办公分类全覆盖", "制度问答 + 审批流开箱即用", "支持企微/钉钉消息触达", "自然语言查数辅助决策"],
        "recommended_modules": ["chat_qa", "approval_flow", "kb_document", "approval_inbox", "chart_dashboard"],
    },
    "mfg": {
        "overview": "传统制造深度包聚焦产线设备、质量安环、物料与 MES/ERP 对接，让现场报修、SOP 问答、质检审批在手机上完成。",
        "highlights": ["设备报修派工闭环", "SOP/工艺智能问答", "安环隐患移动上报", "OEE 与能耗看板"],
        "recommended_modules": ["approval_flow", "chat_qa", "kb_document", "chart_dashboard", "notify_inapp"],
    },
    "retail": {
        "overview": "零售电商深度包打通库存、会员、促销与订单履约，门店巡检与退换货工单一体化，适合连锁零售与 O2O 业态。",
        "highlights": ["库存预警与补货", "会员积分营销", "全渠道订单跟踪", "门店陈列巡检"],
        "recommended_modules": ["chart_dashboard", "notify_inapp", "approval_flow", "chat_qa"],
    },
    "edu": {
        "overview": "教育培训深度包覆盖教务排课、题库练习、家校通知与学业分析，减轻教务重复劳动，提升家校沟通效率。",
        "highlights": ["智能排课与调课", "在线答疑助手", "成绩趋势预警", "家校通知触达"],
        "recommended_modules": ["approval_flow", "kb_document", "chat_qa", "notify_inapp", "chart_dashboard"],
    },
}


def _fallback_enrich(pack_key: str, pack_name: str, tagline: str) -> dict[str, Any]:
    if pack_key in _STATIC_ENRICH:
        return {**_STATIC_ENRICH[pack_key], "source": "static"}
    return {
        "overview": f"{pack_name}深度包：{tagline}。共 {scene_count_for_pack(pack_key)} 项业务场景，支持 >> 选模块一键生成企业智能应用。",
        "highlights": [
            f"覆盖 {scene_count_for_pack(pack_key)} 项行业场景",
            "智能问答 + 审批流 + 知识库组合",
            "支持 Web / App 双端发布",
            "场景可自由增减组合",
        ],
        "recommended_modules": ["chat_qa", "approval_flow", "kb_document", "notify_inapp"],
        "source": "generated",
    }


def enrich_industry_pack(
    pack_key: str,
    *,
    scenes: list[dict[str, Any]] | None = None,
    force_llm: bool = False,
) -> dict[str, Any]:
    """返回 overview / highlights / recommended_modules / scene_tips。"""
    meta = pack_meta(pack_key)
    pack_name = meta["name"] if meta else pack_key
    tagline = (meta or {}).get("tagline", "")

    if not force_llm:
        fb = _fallback_enrich(pack_key, pack_name, tagline)
        if pack_key in _STATIC_ENRICH:
            return fb

    scene_lines = []
    for s in (scenes or [])[:12]:
        scene_lines.append(f"- {s.get('name')}: {s.get('problem', '')}")

    system = (
        "你是积木仓 BlockHub 行业解决方案顾问。根据行业包信息输出 JSON："
        '{"overview":"2-3句行业方案总述","highlights":["亮点1","亮点2","亮点3","亮点4"],'
        '"recommended_modules":["capability_key列表，如 chat_qa, approval_flow"],'
        '"scene_tips":[{"name":"场景名","tip":"1句落地建议"}]}'
        "recommended_modules 只能从已有 key 中选择：chat_qa, approval_flow, kb_document, "
        "chart_dashboard, notify_inapp, chart_funnel, shanghai_voice, data_nl_query。"
    )
    user = (
        f"行业包：{pack_name}（key={pack_key}）\n"
        f"定位：{tagline}\n"
        f"场景列表：\n" + "\n".join(scene_lines)
    )
    parsed = deepseek_json_chat(system, user, temperature=0.35)
    if not parsed:
        return _fallback_enrich(pack_key, pack_name, tagline)

    return {
        "overview": parsed.get("overview") or _fallback_enrich(pack_key, pack_name, tagline)["overview"],
        "highlights": parsed.get("highlights") or [],
        "recommended_modules": parsed.get("recommended_modules") or [],
        "scene_tips": parsed.get("scene_tips") or [],
        "source": "deepseek",
    }
