"""24 个行业深度包 — Catalog seed SSOT（金融拆为银行/券商/保险/基金/消金）。"""

from __future__ import annotations

from typing import Any

from app.data.finance_vertical_capabilities import (
    bank_pack_scenes,
    fintech_pack_scenes,
    fund_pack_scenes,
    insurance_pack_scenes,
    securities_pack_scenes,
)
from app.data.game_scene_capabilities import game_pack_scenes
from app.data.logistics_scene_capabilities import logistics_pack_scenes
from app.data.realestate_scene_capabilities import realestate_pack_scenes
from app.data.med_scene_capabilities import med_pack_scenes
from app.data.office_scene_capabilities import office_pack_scenes
from app.data.sales_scene_capabilities import sales_pack_scenes


def _scene(
    name: str,
    category: str,
    problem: str,
    *,
    pages: str = "approval+form",
    standard: str = "✓",
    agent: str = "approval",
) -> dict[str, str]:
    return {
        "name": name,
        "category": category,
        "problem": problem,
        "pages": pages,
        "standard": standard,
        "agent": agent,
    }


# 通用办公 Runtime 正式场景（路径 A · 与 Catalog OFFICE_GROUPS 66 条对齐）
_OFFICE_META = {
    "key": "office",
    "name": "通用办公",
    "icon": "🏢",
    "color": "#6366f1",
    "tagline": "人事、财务、审批、知识库一体化",
    "scenes": office_pack_scenes(),
}

_MFG = {
    "key": "mfg",
    "name": "传统制造",
    "icon": "🏭",
    "color": "#3b82f6",
    "tagline": "报修、SOP知识库、质检、MES 打通",
    "scenes": [
        _scene("设备报修", "设备管理", "产线故障报修派工", pages="form+list", agent="device_repair"),
        _scene(
            "SOP/工艺问答",
            "知识管理",
            "作业指导书 RAG 检索（挂制造·工艺SOP知识库）",
            pages="chat+kb",
            agent="kb_document",
        ),
        _scene("生产日报/OEE", "生产管理", "车间产量稼动率", pages="chart", standard="✓", agent="mfg_oee"),
        _scene("质检审批", "质量管理", "来料成品质检", agent="quality_inspect"),
        _scene("物料领用", "物料管理", "生产领退料", agent="material_issue"),
        _scene("安环隐患上报", "安全管理", "安全隐患拍照上报", pages="form+approval", agent="site_patrol"),
        _scene("排班/考勤", "人事管理", "班次查询申诉", pages="list+approval", agent="shift_attendance"),
        _scene("保养计划提醒", "设备管理", "设备保养到期", pages="notify", agent="maintenance_plan"),
        _scene(
            "图纸/BOM检索",
            "知识管理",
            "工程图纸与BOM文档问答（挂制造·工艺SOP知识库）",
            pages="kb",
            agent="kb_document",
        ),
        _scene(
            "制造·工艺SOP与作业指导库",
            "行业知识库",
            "作业指导书、工艺卡、换型检查表；真知识库 RAG，空库空列表",
            pages="kb+chat",
            agent="kb_document",
        ),
        _scene(
            "制造·质检与安环知识库",
            "行业知识库",
            "质检标准、不合格处理、安环隐患案例；真知识库 RAG，空库空列表",
            pages="kb+chat",
            agent="kb_document",
        ),
        _scene("对接MES/ERP", "系统集成", "制造系统打通", standard="✓", pages="integration", agent="erp_connector"),
        _scene("能耗/碳排统计", "绿色制造", "绿色制造指标", pages="chart", standard="✓", agent="energy_carbon"),
        _scene("技能培训记录", "人事管理", "上岗证培训档案", pages="list+kb", agent="training_record"),
    ],
}

_SALES = {
    "key": "sales",
    "name": "销售行业",
    "icon": "📈",
    "color": "#6366f1",
    "tagline": "话术、漏斗、合同、CRM · 纯销售场景",
    "scenes": sales_pack_scenes(),
}

_MED = {
    "key": "med",
    "name": "医疗健康",
    "icon": "🏥",
    "color": "#10b981",
    "tagline": "AI预问诊、指南RAG、排班、HIS · 真库闭环",
    "scenes": med_pack_scenes(),
}

_GAME = {
    "key": "game",
    "name": "游戏娱乐",
    "icon": "🎮",
    "color": "#a855f7",
    "tagline": "FAQ工单真库、双知识库、活动通知、2048可玩",
    "scenes": game_pack_scenes(),
}

_RETAIL = {
    "key": "retail",
    "name": "零售电商",
    "icon": "🛒",
    "color": "#f97316",
    "tagline": "库存、会员、促销、订单全链路",
    "scenes": [
        _scene("库存预警", "库存管理", "低库存自动提醒补货", pages="notify+chart", agent="notify"),
        _scene("会员营销", "会员运营", "积分促销触达", pages="notify+chat", agent="notify"),
        _scene("促销审批", "门店运营", "折扣活动多级审批", agent="approval"),
        _scene("订单跟踪", "订单履约", "全渠道订单状态查询", pages="list+chat", agent="chat_qa"),
        _scene("门店巡检", "门店管理", "陈列卫生拍照巡检", pages="form+approval", agent="approval"),
        _scene("退换货处理", "售后服务", "退换货工单流转", agent="approval"),
        _scene("供应商对账", "供应链", "采购对账与差异处理", pages="chart+approval", agent="report"),
        _scene("会员积分", "会员运营", "积分规则与兑换", pages="list+kb", agent="kb"),
        _scene("价格变更", "商品管理", "调价申请与生效", agent="approval"),
        _scene("陈列检查", "门店管理", "货架陈列标准核查", pages="form+chart", agent="approval"),
    ],
}

_EDU = {
    "key": "edu",
    "name": "教育培训",
    "icon": "🎓",
    "color": "#2563eb",
    "tagline": "课程、题库、排课、家校互通",
    "scenes": [
        _scene("课程排课", "教务管理", "班级课表智能编排", pages="list+approval", agent="approval"),
        _scene("题库练习", "教学资源", "知识点题库练习", pages="kb+form", agent="kb"),
        _scene("家校通知", "家校协同", "通知公告精准推送", pages="notify", agent="notify"),
        _scene("成绩分析", "学业评估", "成绩趋势与预警", pages="chart", agent="report"),
        _scene("请假审批", "学生事务", "学生请假在线审批", agent="approval"),
        _scene("教材管理", "教学资源", "教材版本与发放", pages="kb+list", agent="kb"),
        _scene("在线答疑", "教学互动", "课后答疑智能助手", pages="chat", agent="chat_qa"),
        _scene("考勤统计", "教务管理", "到课率统计分析", pages="chart", agent="report"),
        _scene("学费收缴", "财务管理", "缴费提醒与对账", pages="approval+notify", agent="approval"),
    ],
}

_BANK = {
    "key": "bank",
    "name": "商业银行",
    "icon": "🏦",
    "color": "#0369a1",
    "tagline": "对公零售 · KYC · 授信 · 反洗钱",
    "scenes": bank_pack_scenes(),
}

_SECURITIES = {
    "key": "securities",
    "name": "证券券商",
    "icon": "📈",
    "color": "#0e7490",
    "tagline": "适当性 · 投研尽调 · 合规 · 产品销售",
    "scenes": securities_pack_scenes(),
}

_INSURANCE = {
    "key": "insurance",
    "name": "保险",
    "icon": "🛡️",
    "color": "#0284c7",
    "tagline": "核保 · 理赔 · 代理人 · 产品说明",
    "scenes": insurance_pack_scenes(),
}

_FUND = {
    "key": "fund",
    "name": "基金资管",
    "icon": "📉",
    "color": "#1d4ed8",
    "tagline": "产品披露 · 投后 · 监管报送",
    "scenes": fund_pack_scenes(),
}

_FINTECH = {
    "key": "fintech",
    "name": "消金金科",
    "icon": "💳",
    "color": "#4338ca",
    "tagline": "风控预警 · 贷后 · 监管报送",
    "scenes": fintech_pack_scenes(),
}

_LOGISTICS = {
    "key": "logistics",
    "name": "物流仓储",
    "icon": "📦",
    "color": "#ca8a04",
    "tagline": "运单仓配 · 调度签收 · 冷链装卸 · 真表闭环",
    "scenes": logistics_pack_scenes(),
}

_REALESTATE = {
    "key": "realestate",
    "name": "房地产",
    "icon": "🏠",
    "color": "#78716c",
    "tagline": "看房签约 · 租赁物业 · 装修验收 · 真表闭环",
    "scenes": realestate_pack_scenes(),
}

_HOTEL = {
    "key": "hotel",
    "name": "酒店餐饮",
    "icon": "🏨",
    "color": "#ec4899",
    "tagline": "预订、排班、客诉、巡检",
    "scenes": [
        _scene("客房预订", "前台运营", "客房预订与排房", pages="form+list", agent="approval"),
        _scene("排班调班", "人事管理", "客房餐饮排班调班", pages="list+approval", agent="approval"),
        _scene("客诉处理", "客户服务", "客诉登记与回访", agent="approval"),
        _scene("巡检打卡", "品质管理", "客房公区巡检", pages="form+approval", agent="approval"),
        _scene("食材申购", "餐饮供应链", "厨房食材采购申请", agent="approval"),
        _scene("会员积分", "会员运营", "会员积分与权益", pages="list+kb", agent="kb"),
        _scene("卫生检查", "品质管理", "卫生标准检查记录", pages="form", agent="approval"),
        _scene("营收日报", "经营管理", "每日营收看板", pages="chart", agent="report"),
    ],
}

_ENERGY = {
    "key": "energy",
    "name": "能源电力",
    "icon": "⚡",
    "color": "#eab308",
    "tagline": "巡检、工单、能耗、安全合规",
    "scenes": [
        _scene("设备巡检", "设备管理", "变电站线路巡检", pages="form+approval", agent="approval"),
        _scene("工单派发", "运维管理", "缺陷工单派工闭环", agent="approval"),
        _scene("能耗监测", "能源管理", "能耗异常分析预警", pages="chart+notify", agent="report"),
        _scene("安全告警", "安全管理", "安全事件实时告警", pages="notify", agent="notify"),
        _scene("缺陷上报", "运维管理", "设备缺陷拍照上报", pages="form+approval", agent="approval"),
        _scene("两票管理", "安全管理", "工作票操作票管理", agent="approval"),
        _scene("备件领用", "物资管理", "备品备件领用审批", agent="approval"),
        _scene("运行日志", "生产运行", "运行日志智能检索", pages="kb+chat", agent="kb"),
        _scene("应急演练", "安全管理", "演练计划与记录", pages="list+approval", agent="approval"),
        _scene("碳排统计", "绿色能源", "碳排放统计报送", pages="chart", standard="部分", agent="report"),
    ],
}

_GOV = {
    "key": "gov",
    "name": "政务公用",
    "icon": "🏛",
    "color": "#475569",
    "tagline": "办事指南、诉求、审批便民",
    "scenes": [
        _scene("办事指南", "便民服务", "事项材料智能问答", pages="chat+kb", agent="chat_qa"),
        _scene("诉求受理", "信访热线", "群众诉求登记分派", agent="approval"),
        _scene("在线审批", "行政审批", "事项在线受理审批", agent="approval"),
        _scene("政策问答", "政策服务", "政策解读智能问答", pages="chat", agent="chat_qa"),
        _scene("信息公开", "政务公开", "信息公开申请处理", pages="list+kb", agent="kb"),
        _scene("督查督办", "效能监察", "督办事项跟踪", pages="list+approval", agent="approval"),
        _scene("便民服务", "基层治理", "社区便民服务预约", pages="form", agent="approval"),
        _scene("热线转办", "信访热线", "12345工单转办", agent="approval"),
        _scene("证照申领", "行政审批", "证照在线申领", pages="form+approval", agent="approval"),
        _scene("数据统计", "决策支持", "政务数据看板", pages="chart", agent="report"),
        _scene("网格治理", "基层治理", "网格事件上报", pages="form+notify", agent="approval"),
    ],
}

_LEGAL = {
    "key": "legal",
    "name": "法律服务",
    "icon": "⚖️",
    "color": "#334155",
    "tagline": "案件、合同、法规检索",
    "scenes": [
        _scene("案件管理", "诉讼业务", "案件进度与材料管理", pages="list+kb", agent="kb"),
        _scene("合同审查", "非诉业务", "合同条款风险审查", pages="kb+approval", agent="kb"),
        _scene("法规检索", "知识服务", "法规判例智能检索", pages="chat+kb", agent="chat_qa"),
        _scene("律师排期", "律所管理", "庭审会议排期", pages="list", agent="approval"),
        _scene("立案登记", "诉讼业务", "立案材料登记", pages="form", agent="approval"),
        _scene("证据归档", "诉讼业务", "证据链归档检索", pages="kb", agent="kb"),
        _scene("庭审提醒", "诉讼业务", "开庭节点提醒", pages="notify", agent="notify"),
        _scene("法律顾问", "企业服务", "企业法律顾问服务", pages="chat+kb", agent="chat_qa"),
    ],
}

_HR = {
    "key": "hr",
    "name": "人力资源",
    "icon": "👥",
    "color": "#8b5cf6",
    "tagline": "招聘、绩效、培训、薪酬",
    "scenes": [
        _scene("招聘面试", "招聘管理", "简历筛选面试安排", pages="list+approval", agent="approval"),
        _scene("绩效评估", "绩效管理", "绩效目标与评估", pages="form+chart", agent="approval"),
        _scene("培训计划", "培训发展", "培训计划与签到", pages="list+kb", agent="kb"),
        _scene("薪酬核算", "薪酬福利", "薪酬核算审批发放", agent="approval"),
        _scene("入职办理", "人事事务", "入职材料一站式", pages="approval+kb", agent="approval"),
        _scene("离职交接", "人事事务", "离职交接清单", agent="approval"),
        _scene("考勤统计", "考勤管理", "考勤异常统计", pages="chart", agent="report"),
        _scene("人才盘点", "组织发展", "人才九宫格盘点", pages="chart", standard="部分", agent="report"),
        _scene("编制申请", "组织管理", "增编减编申请", agent="approval"),
        _scene("员工自助", "员工服务", "制度福利自助问答", pages="chat", agent="chat_qa"),
        _scene("组织变更", "组织管理", "部门调整审批", agent="approval"),
        _scene("福利发放", "薪酬福利", "福利申领与发放", pages="approval+notify", agent="approval"),
    ],
}

_MARKETING = {
    "key": "marketing",
    "name": "市场营销",
    "icon": "📣",
    "color": "#fb923c",
    "tagline": "活动、线索、内容、投放",
    "scenes": [
        _scene("活动策划", "活动运营", "营销活动策划审批", agent="approval"),
        _scene("线索分配", "线索管理", "线索智能分配销售", pages="list+notify", agent="approval"),
        _scene("内容审核", "内容管理", "营销内容合规审核", agent="approval"),
        _scene("投放分析", "增长分析", "投放ROI分析看板", pages="chart", agent="report"),
        _scene("竞品监测", "市场洞察", "竞品动态知识库", pages="kb+chat", agent="kb"),
        _scene("素材库", "内容管理", "营销素材统一管理", pages="kb", agent="kb"),
        _scene("渠道归因", "增长分析", "多渠道归因分析", pages="chart", standard="部分", agent="report"),
        _scene("预算审批", "费用管理", "市场费用预算审批", agent="approval"),
        _scene("效果复盘", "活动运营", "活动效果复盘报告", pages="chart+kb", agent="report"),
    ],
}

_CONSTRUCTION = {
    "key": "construction",
    "name": "建筑工程",
    "icon": "🏗",
    "color": "#b45309",
    "tagline": "进度、安全、材料、验收",
    "scenes": [
        _scene("进度填报", "项目管理", "施工进度日报填报", pages="form+chart", agent="approval"),
        _scene("安全检查", "安全管理", "安全隐患检查整改", pages="form+approval", agent="approval"),
        _scene("材料申购", "物资管理", "建材申购审批", agent="approval"),
        _scene("验收签字", "质量管理", "分项验收电子签字", pages="form+approval", agent="approval"),
        _scene("图纸变更", "设计管理", "设计变更审批留痕", agent="approval"),
        _scene("劳务考勤", "劳务管理", "工地劳务考勤", pages="list", agent="approval"),
        _scene("质量整改", "质量管理", "质量问题整改闭环", agent="approval"),
        _scene("分包结算", "成本管理", "分包工程量结算", pages="approval+chart", agent="approval"),
        _scene("隐患上报", "安全管理", "现场隐患拍照上报", pages="form+approval", agent="approval"),
        _scene("竣工归档", "项目管理", "竣工资料归档检索", pages="kb", agent="kb"),
    ],
}

_AGRICULTURE = {
    "key": "agriculture",
    "name": "农业",
    "icon": "🌾",
    "color": "#65a30d",
    "tagline": "溯源、巡检、补贴、产销",
    "scenes": [
        _scene("产销溯源", "质量溯源", "农产品全程溯源", pages="kb+chart", agent="kb"),
        _scene("田间巡检", "生产管理", "田间作业巡检记录", pages="form", agent="approval"),
        _scene("补贴申报", "政策服务", "农业补贴在线申报", agent="approval"),
        _scene("农资采购", "供应链管理", "农资采购审批", agent="approval"),
        _scene("气象预警", "风险预警", "灾害气象预警推送", pages="notify", agent="notify"),
        _scene("病虫害上报", "植保管理", "病虫害识别上报", pages="form+chat", agent="chat_qa"),
        _scene("合作社管理", "组织管理", "合作社成员与分红", pages="list+approval", agent="approval"),
    ],
}

_MEDIA = {
    "key": "media",
    "name": "传媒内容",
    "icon": "📺",
    "color": "#d946ef",
    "tagline": "选题、审核、版权、分发",
    "scenes": [
        _scene("选题策划", "内容策划", "选题立项审批", agent="approval"),
        _scene("内容审核", "内容安全", "内容合规多级审核", agent="approval"),
        _scene("版权管理", "版权运营", "版权登记与授权", pages="kb+approval", agent="kb"),
        _scene("分发排期", "内容运营", "多平台分发排期", pages="list+notify", agent="notify"),
        _scene("舆情监测", "品牌公关", "舆情预警与分析", pages="chart+notify", standard="部分", agent="report"),
        _scene("素材库", "资产管理", "音视频素材管理", pages="kb", agent="kb"),
        _scene("稿费结算", "财务管理", "创作者稿费结算", agent="approval"),
        _scene("阅读量分析", "数据分析", "内容传播效果分析", pages="chart", agent="report"),
        _scene("广告排期", "商业运营", "广告位排期管理", pages="list", agent="approval"),
    ],
}

_AUTO = {
    "key": "auto",
    "name": "汽车交通",
    "icon": "🚗",
    "color": "#06b6d4",
    "tagline": "售后、试驾、配件、工单",
    "scenes": [
        _scene("试驾预约", "销售服务", "试驾档期在线预约", pages="form+notify", agent="approval"),
        _scene("售后工单", "售后服务", "维修保养工单", agent="approval"),
        _scene("配件申购", "配件管理", "配件采购申请", agent="approval"),
        _scene("保养提醒", "客户服务", "保养到期自动提醒", pages="notify", agent="notify"),
        _scene("客户回访", "客户关系", "交车回访记录", pages="list+chat", agent="chat_qa"),
        _scene("事故报案", "保险理赔", "事故报案流程引导", pages="form+chat", agent="chat_qa"),
        _scene("二手车评估", "二手车", "二手车评估审批", pages="form+approval", agent="approval"),
        _scene("门店客流", "门店运营", "展厅客流统计分析", pages="chart", agent="report"),
        _scene("试驾反馈", "销售服务", "试驾体验反馈收集", pages="form", agent="approval"),
        _scene("延保销售", "增值服务", "延保产品推介", pages="chat+approval", agent="chat_qa"),
    ],
}

ALL_INDUSTRY_PACKS: list[dict[str, Any]] = [
    _OFFICE_META,
    _MFG,
    _SALES,
    _MED,
    _GAME,
    _RETAIL,
    _EDU,
    _BANK,
    _SECURITIES,
    _INSURANCE,
    _FUND,
    _FINTECH,
    _LOGISTICS,
    _REALESTATE,
    _HOTEL,
    _ENERGY,
    _GOV,
    _LEGAL,
    _HR,
    _MARKETING,
    _CONSTRUCTION,
    _AGRICULTURE,
    _MEDIA,
    _AUTO,
]

ALL_INDUSTRY_KEYS: set[str] = {p["key"] for p in ALL_INDUSTRY_PACKS}


def scene_count_for_pack(key: str) -> int:
    pack = next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
    return len(pack["scenes"]) if pack else 0


def pack_meta(key: str) -> dict[str, Any] | None:
    return next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
