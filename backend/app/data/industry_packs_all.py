"""20 个行业深度包 — Catalog seed SSOT（阶段 B）。"""

from __future__ import annotations

from typing import Any


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


_OFFICE_META = {
    "key": "office",
    "name": "通用办公",
    "icon": "🏢",
    "color": "#6366f1",
    "tagline": "人事、财务、审批、知识库一体化",
    "scenes": [
        _scene("请假审批", "人事行政", "员工请假在线申请与主管审批", pages="approval", agent="leave_request"),
        _scene("报销记账", "财务法务", "费用报销与发票归档", pages="approval+form", agent="expense_claim"),
        _scene("制度问答", "知识协同", "制度政策福利智能问答", pages="chat+kb", agent="policy_qa"),
        _scene("招聘入职", "人事行政", "招聘与入职指引", pages="approval+kb", agent="hire_onboard"),
        _scene("待办中心", "流程审批", "跨流程待办统一处理", pages="list", agent="approval_inbox"),
        _scene("知识库", "知识协同", "制度文档语义检索", pages="kb", agent="kb_document"),
    ],
}

_MFG = {
    "key": "mfg",
    "name": "传统制造",
    "icon": "🏭",
    "color": "#3b82f6",
    "tagline": "报修、SOP、质检、MES 打通",
    "scenes": [
        _scene("设备报修", "设备管理", "产线故障报修派工", pages="form+list", agent="device_repair"),
        _scene("SOP/工艺问答", "知识管理", "作业指导书检索", pages="chat+kb", agent="chat_qa"),
        _scene("生产日报/OEE", "生产管理", "车间产量稼动率", pages="chart", standard="✓", agent="mfg_oee"),
        _scene("质检审批", "质量管理", "来料成品质检", agent="quality_inspect"),
        _scene("物料领用", "物料管理", "生产领退料", agent="material_issue"),
        _scene("安环隐患上报", "安全管理", "安全隐患拍照上报", pages="form+approval", agent="site_patrol"),
        _scene("排班/考勤", "人事管理", "班次查询申诉", pages="list+approval", agent="shift_attendance"),
        _scene("保养计划提醒", "设备管理", "设备保养到期", pages="notify", agent="maintenance_plan"),
        _scene("图纸/BOM检索", "知识管理", "工程文档问答", pages="kb", agent="kb"),
        _scene("对接MES/ERP", "系统集成", "制造系统打通", standard="✓", pages="integration", agent="erp_connector"),
        _scene("能耗/碳排统计", "绿色制造", "绿色制造指标", pages="chart", standard="✓", agent="energy_carbon"),
        _scene("技能培训记录", "人事管理", "上岗证培训档案", pages="list+kb", agent="training_record"),
    ],
}

_SALES = {
    "key": "sales",
    "name": "销售行业",
    "icon": "📈",
    "color": "#ef4444",
    "tagline": "话术、漏斗、合同、CRM 一体",
    "scenes": [
        _scene("产品/话术问答", "知识管理", "产品参数竞品话术", pages="chat+kb", agent="chat_qa"),
        _scene("报价/折扣审批", "审批流程", "超权限折扣", agent="approval"),
        _scene("销售漏斗看板", "数据分析", "线索商机转化", pages="chart_funnel", standard="部分", agent="report"),
        _scene("客户跟进记录", "客户管理", "拜访纪要", pages="form+list", agent="approval"),
        _scene("合同审批", "审批流程", "法务财务会签", agent="approval"),
        _scene("商机到期提醒", "消息通知", "长期未跟进", pages="notify", agent="notify"),
        _scene("业绩排行/提成", "数据分析", "团队PK", pages="chart", standard="部分", agent="report"),
        _scene("案例/方案库", "知识管理", "成功案例检索", pages="kb", agent="kb"),
        _scene("样品/礼品申请", "审批流程", "市场物料领用", agent="approval"),
        _scene("对接Salesforce/纷享", "系统集成", "CRM同步", standard="定制", pages="integration", agent="integration"),
        _scene("外勤签到", "客户管理", "拜访定位", pages="form+map", standard="部分", agent="approval"),
        _scene("区域销售分析", "数据分析", "按区产品线", pages="chart", agent="report"),
    ],
}

_MED = {
    "key": "med",
    "name": "医疗健康",
    "icon": "🏥",
    "color": "#10b981",
    "tagline": "指南、排班、导诊、HIS 协同",
    "scenes": [
        _scene("诊疗指南/药品库", "临床知识", "临床用药参考", pages="kb+chat", standard="部分", agent="kb"),
        _scene("内部制度/合规问答", "合规管理", "院感质量制度", pages="chat", agent="chat_qa"),
        _scene("排班/调班申请", "人事管理", "医护排班", pages="list+approval", agent="approval"),
        _scene("耗材/设备申购", "物资管理", "科室采购", agent="approval"),
        _scene("患者宣教资料", "患者服务", "出院指导科普", pages="kb", agent="kb"),
        _scene("数据脱敏/权限", "数据安全", "敏感信息保护", pages="rbac+mask", agent="creation"),
        _scene("不良事件上报", "医疗安全", "医疗安全事件", pages="form+approval", agent="approval"),
        _scene("科室运营看板", "数据分析", "门诊量床位", pages="chart", standard="部分", agent="report"),
        _scene("继续教育/考核", "培训管理", "培训题库", pages="kb+form", agent="kb"),
        _scene("对接HIS/LIS", "系统集成", "医院信息系统", standard="定制", pages="integration", agent="integration"),
        _scene("智能导诊(对外)", "患者服务", "患者预问诊", pages="chat", standard="部分", agent="chat_qa"),
        _scene("会诊/转诊申请", "临床管理", "跨科室会诊", agent="approval"),
    ],
}

_GAME = {
    "key": "game",
    "name": "游戏娱乐",
    "icon": "🎮",
    "color": "#a855f7",
    "tagline": "玩家 FAQ、客服、活动通知",
    "scenes": [
        _scene("玩家FAQ/攻略", "玩家服务", "活动规则问答", pages="chat", agent="chat_qa"),
        _scene("客服工单", "客服管理", "玩家问题流转", pages="approval+list", agent="approval"),
        _scene("版本/活动规则库", "知识管理", "策划文档检索", pages="kb", agent="kb"),
        _scene("留存/ARPU看板", "数据分析", "运营数据监控", pages="chart", standard="部分", agent="report"),
        _scene("版号/合规审查", "合规管理", "内容合规自检", agent="approval"),
        _scene("活动上线通知", "消息通知", "开服活动推送", pages="notify", agent="notify"),
        _scene("NPC/角色对话(C端)", "C端功能", "游戏内AI角色", pages="chat", agent="chat_qa"),
        _scene("外包验收审批", "审批流程", "美术音效验收", agent="approval"),
        _scene("渠道投放分析", "数据分析", "CAC/ROI", pages="chart", standard="部分", agent="report"),
        _scene("对接游戏后台", "系统集成", "GM/数据中台", standard="定制", pages="integration", agent="integration"),
        _scene("敏感词/内容风控", "安全合规", "UGC过滤", pages="security", agent="creation"),
        _scene("内购/订阅(C端)", "C端功能", "会员道具付费", standard="部分", pages="C端", agent="—"),
        _scene("公会/社区管理", "社区管理", "公告举报处理", pages="list+approval", agent="approval"),
    ],
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

_FINANCE = {
    "key": "finance",
    "name": "金融服务",
    "icon": "💰",
    "color": "#0284c7",
    "tagline": "合规、风控、理财、尽调闭环",
    "scenes": [
        _scene("合规审查", "合规管理", "业务合规自检清单", pages="approval+kb", agent="approval"),
        _scene("风控预警", "风险管理", "异常交易实时预警", pages="notify+chart", agent="notify"),
        _scene("理财问答", "客户服务", "产品说明智能问答", pages="chat+kb", agent="chat_qa"),
        _scene("尽调报告", "投行业务", "尽调材料协同撰写", pages="kb+approval", agent="kb"),
        _scene("合同审批", "法务流程", "金融合同多级会签", agent="approval"),
        _scene("反洗钱监测", "合规管理", "可疑交易识别上报", pages="chart+approval", standard="部分", agent="report"),
        _scene("客户 KYC", "客户管理", "开户身份核验流程", pages="form+approval", agent="approval"),
        _scene("产品说明", "产品管理", "产品条款智能解读", pages="chat+kb", agent="chat_qa"),
        _scene("投后管理", "资产管理", "投后巡检与报告", pages="list+chart", agent="report"),
        _scene("监管报送", "合规管理", "监管报表自动生成", standard="部分", pages="chart", agent="report"),
        _scene("授信审批", "信贷业务", "授信额度审批流", agent="approval"),
    ],
}

_LOGISTICS = {
    "key": "logistics",
    "name": "物流仓储",
    "icon": "📦",
    "color": "#ca8a04",
    "tagline": "运单、仓储、调度、签收可视",
    "scenes": [
        _scene("运单跟踪", "运输管理", "在途运单实时可视", pages="list+notify", agent="notify"),
        _scene("仓储盘点", "仓储管理", "周期盘点任务派发", pages="form+approval", agent="approval"),
        _scene("车辆调度", "运输管理", "车辆路线智能调度", pages="chart+approval", standard="部分", agent="report"),
        _scene("签收确认", "末端配送", "电子签收与异常登记", pages="form", agent="approval"),
        _scene("异常上报", "运营管理", "延误破损异常工单", agent="approval"),
        _scene("路线优化", "运输管理", "配送路线成本优化", pages="chart", standard="部分", agent="report"),
        _scene("运费结算", "财务管理", "承运商运费对账", pages="approval+chart", agent="approval"),
        _scene("冷链监控", "特种物流", "温湿度异常告警", pages="notify+chart", standard="部分", agent="notify"),
        _scene("装卸排队", "场站管理", "月台排队叫号", pages="list", agent="approval"),
        _scene("在途可视", "运输管理", "GPS在途大屏", pages="chart", agent="report"),
    ],
}

_REALESTATE = {
    "key": "realestate",
    "name": "房地产",
    "icon": "🏠",
    "color": "#78716c",
    "tagline": "看房、签约、物业、报修一体",
    "scenes": [
        _scene("看房预约", "销售管理", "客户看房档期预约", pages="form+notify", agent="approval"),
        _scene("签约审批", "销售管理", "认购签约流程审批", agent="approval"),
        _scene("物业报修", "物业服务", "业主报修工单处理", agent="approval"),
        _scene("租金收缴", "租赁管理", "租金账单与催收", pages="notify+chart", agent="notify"),
        _scene("客户跟进", "销售管理", "意向客户跟进记录", pages="list+chat", agent="chat_qa"),
        _scene("房源上架", "房源管理", "房源信息审核上架", agent="approval"),
        _scene("装修验收", "工程管理", "装修节点验收签字", pages="form+approval", agent="approval"),
        _scene("业主投诉", "客户服务", "投诉受理与闭环", agent="approval"),
        _scene("租约续签", "租赁管理", "租约到期续签提醒", pages="notify+approval", agent="notify"),
    ],
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
    _FINANCE,
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
    if key == "office":
        return 66
    pack = next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
    return len(pack["scenes"]) if pack else 0


def pack_meta(key: str) -> dict[str, Any] | None:
    return next((p for p in ALL_INDUSTRY_PACKS if p["key"] == key), None)
