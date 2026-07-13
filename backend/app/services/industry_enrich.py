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
    "med": {
        "overview": "医疗健康深度包覆盖临床知识、排班调班、不良事件上报与 HIS 协同，让医护在移动端完成制度问答与工单闭环。",
        "highlights": ["诊疗指南智能检索", "医护排班调班", "不良事件移动上报", "科室运营数据看板"],
        "recommended_modules": ["kb_document", "chat_qa", "approval_flow", "chart_dashboard", "notify_inapp"],
    },
    "game": {
        "overview": "游戏娱乐深度包聚焦玩家 FAQ、客服工单、活动通知与版号合规，帮助运营团队快速搭建玩家服务与内控应用。",
        "highlights": ["玩家攻略智能问答", "客服工单流转", "活动上线多渠道通知", "版号合规审查"],
        "recommended_modules": ["chat_qa", "approval_flow", "notify_inapp", "kb_document", "chart_dashboard"],
    },
    "finance": {
        "overview": "金融服务深度包覆盖合规审查、风控预警、理财问答与授信审批，满足金融场景对合规与审计的严格要求。",
        "highlights": ["合规审查清单", "异常交易实时预警", "产品说明智能解读", "授信多级审批"],
        "recommended_modules": ["approval_flow", "kb_document", "chat_qa", "chart_dashboard", "notify_inapp"],
    },
    "logistics": {
        "overview": "物流仓储深度包打通运单跟踪、仓储盘点、车辆调度与签收确认，实现全链路可视与异常闭环。",
        "highlights": ["在途运单实时跟踪", "周期盘点任务派发", "配送路线优化", "冷链温湿度告警"],
        "recommended_modules": ["notify_inapp", "approval_flow", "chart_dashboard", "chat_qa"],
    },
    "realestate": {
        "overview": "房地产深度包覆盖看房预约、签约审批、物业报修与租金收缴，连接销售、物业与业主服务全场景。",
        "highlights": ["看房档期智能预约", "认购签约流程审批", "业主报修工单", "租金账单自动催收"],
        "recommended_modules": ["approval_flow", "notify_inapp", "chat_qa", "chart_dashboard"],
    },
    "hotel": {
        "overview": "酒店餐饮深度包聚焦客房预订、排班调班、客诉处理与品质巡检，提升前台运营与客房服务效率。",
        "highlights": ["客房预订排房", "餐饮客房排班", "客诉登记回访", "公区品质巡检"],
        "recommended_modules": ["approval_flow", "notify_inapp", "kb_document", "chart_dashboard"],
    },
    "energy": {
        "overview": "能源电力深度包覆盖设备巡检、缺陷工单、能耗监测与安全告警，支撑电力运维数字化与绿色能源管理。",
        "highlights": ["变电站线路巡检", "缺陷工单派工闭环", "能耗异常分析预警", "两票安全管理"],
        "recommended_modules": ["approval_flow", "chart_dashboard", "notify_inapp", "kb_document"],
    },
    "gov": {
        "overview": "政务公用深度包提供办事指南问答、诉求受理、在线审批与政策解读，助力数字政务便民服务落地。",
        "highlights": ["事项材料智能问答", "群众诉求登记分派", "行政审批在线受理", "政务数据决策看板"],
        "recommended_modules": ["chat_qa", "kb_document", "approval_flow", "chart_dashboard"],
    },
    "legal": {
        "overview": "法律服务深度包覆盖案件管理、合同审查、律师协作与法务知识库，提升律所与法务团队协同效率。",
        "highlights": ["案件进度跟踪", "合同条款智能审查", "律师任务协作", "法规案例知识检索"],
        "recommended_modules": ["approval_flow", "kb_document", "chat_qa", "notify_inapp"],
    },
    "hr": {
        "overview": "人力资源深度包聚焦招聘面试、入职离职、绩效考核与培训档案，打通 HR 全生命周期管理。",
        "highlights": ["招聘面试流程管理", "入离职在线办理", "绩效目标与评估", "培训档案智能检索"],
        "recommended_modules": ["approval_flow", "kb_document", "notify_inapp", "chart_dashboard"],
    },
    "marketing": {
        "overview": "市场营销深度包覆盖活动策划、线索管理、投放分析与内容审核，帮助市场团队快速搭建增长应用。",
        "highlights": ["营销活动审批上线", "线索培育与分配", "投放 ROI 分析", "内容合规审核"],
        "recommended_modules": ["approval_flow", "chart_funnel", "notify_inapp", "chart_dashboard"],
    },
    "construction": {
        "overview": "建筑工程深度包覆盖施工安全、质量验收、材料申购与进度汇报，让工地管理移动化、可视化。",
        "highlights": ["安全隐患移动上报", "质量验收签字", "材料申购审批", "施工进度日报"],
        "recommended_modules": ["approval_flow", "notify_inapp", "chart_dashboard", "kb_document"],
    },
    "agriculture": {
        "overview": "农业深度包聚焦产销溯源、农事记录、补贴申报与气象预警，助力农业数字化与品牌溯源。",
        "highlights": ["农产品溯源查询", "农事作业记录", "补贴在线申报", "气象灾害预警推送"],
        "recommended_modules": ["kb_document", "approval_flow", "notify_inapp", "chart_dashboard"],
    },
    "media": {
        "overview": "传媒内容深度包覆盖选题策划、内容审核、版权管理与发布排期，加速内容团队协同与合规生产。",
        "highlights": ["选题策划协同", "内容多级审核", "版权素材管理", "多平台发布排期"],
        "recommended_modules": ["approval_flow", "kb_document", "notify_inapp", "chat_qa"],
    },
    "auto": {
        "overview": "汽车交通深度包覆盖售后工单、试驾预约、配件管理与客户跟进，连接 4S 店销售与服务全链路。",
        "highlights": ["售后维修工单", "试驾档期预约", "配件库存预警", "客户跟进智能助手"],
        "recommended_modules": ["approval_flow", "chat_qa", "notify_inapp", "chart_dashboard"],
    },
    "sales": {
        "overview": "销售行业深度包打通话术问答、报价审批、漏斗看板与 CRM 对接，让销售团队在移动端高效作战。",
        "highlights": ["产品话术智能问答", "超权限折扣审批", "销售漏斗转化分析", "外勤拜访签到"],
        "recommended_modules": ["chat_qa", "approval_flow", "chart_funnel", "kb_document", "notify_inapp"],
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
