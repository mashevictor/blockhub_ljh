import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// Seed data for 7 Agents
const AGENTS = [
  { agent_key: "creation", name: "智能创建", description: "元 Agent，编排全部场景的创建与发布", icon: "Sparkles", color: "#6366f1", pipeline: "需求→研判→澄清→Schema→编排→发布", config: { caps: ["creation", "form_widget", "list_widget", "rbac_page"] } },
  { agent_key: "chat_qa", name: "智能问答", description: "基于 RAG 的智能问答 Agent，支持多轮对话", icon: "MessageSquare", color: "#4338ca", pipeline: "接收→检索→Prompt→LLM→SSE→会话", config: { caps: ["chat_qa", "chat_voice", "multi_agent", "chat_summary"] } },
  { agent_key: "kb", name: "知识库", description: "文档上传、切片、向量化、语义检索", icon: "BookOpen", color: "#059669", pipeline: "上传→解析→切片→向量→索引→检索", config: { caps: ["kb_document", "kb_search"] } },
  { agent_key: "approval", name: "审批流程", description: "多级审批、会签、条件分支、电子签章", icon: "CheckCircle", color: "#dc2626", pipeline: "提交→工作流→路由→状态→通知→归档", config: { caps: ["approval_flow", "approval_inbox", "approval_countersign", "approval_conditional", "approval_remind", "approval_esign"] } },
  { agent_key: "report", name: "数据报表", description: "图表看板、自然语言查数、定时推送", icon: "BarChart3", color: "#0ea5e9", pipeline: "选指标→聚合→图表→NL查数→导出", config: { caps: ["chart_dashboard", "chart_basic", "chart_funnel", "chart_kpi_card", "data_nl_query", "report_scheduled", "data_export"] } },
  { agent_key: "notify", name: "消息通知", description: "多渠道通知：站内信、邮件、企微、钉钉", icon: "Bell", color: "#f59e0b", pipeline: "触发器→规则→模板→发送→确认", config: { caps: ["notify_inapp", "notify_email", "notify_im", "announce_board"] } },
  { agent_key: "integration", name: "外部数据", description: "对接 ERP/OA/CRM/HR 等外部系统", icon: "Plug", color: "#0f766e", pipeline: "Discover→Extract→Map→Load→Sync→Serve", config: { caps: ["integration", "erp_connector", "oa_connector", "auth_sso", "it_helpdesk", "asset_manage", "meeting_booking"] } },
];

// Seed data for 36 Capabilities
const CAPABILITIES = [
  // Creation Agent
  { capability_key: "creation", name: "智能创建引擎", category: "creation", widget_type: "wizard" },
  { capability_key: "form_widget", name: "表单组件", category: "creation", widget_type: "form" },
  { capability_key: "list_widget", name: "列表组件", category: "creation", widget_type: "list" },
  { capability_key: "rbac_page", name: "权限页面", category: "creation", widget_type: "page" },
  // Chat Agent
  { capability_key: "chat_qa", name: "问答对话", category: "chat", widget_type: "chat" },
  { capability_key: "chat_voice", name: "语音对话", category: "chat", widget_type: "voice" },
  { capability_key: "multi_agent", name: "多Agent协作", category: "chat", widget_type: "multi" },
  { capability_key: "chat_summary", name: "会话摘要", category: "chat", widget_type: "summary" },
  // KB Agent
  { capability_key: "kb_document", name: "文档管理", category: "kb", widget_type: "doc" },
  { capability_key: "kb_search", name: "语义检索", category: "kb", widget_type: "search" },
  // Approval Agent
  { capability_key: "approval_flow", name: "审批工作流", category: "approval", widget_type: "flow" },
  { capability_key: "approval_inbox", name: "待办中心", category: "approval", widget_type: "inbox" },
  { capability_key: "approval_countersign", name: "会签", category: "approval", widget_type: "sign" },
  { capability_key: "approval_conditional", name: "条件分支", category: "approval", widget_type: "cond" },
  { capability_key: "approval_remind", name: "审批提醒", category: "approval", widget_type: "remind" },
  { capability_key: "approval_esign", name: "电子签章", category: "approval", widget_type: "esign" },
  // Report Agent
  { capability_key: "chart_dashboard", name: "看板", category: "report", widget_type: "dashboard" },
  { capability_key: "chart_basic", name: "基础图表", category: "report", widget_type: "chart" },
  { capability_key: "chart_funnel", name: "漏斗图", category: "report", widget_type: "funnel" },
  { capability_key: "chart_kpi_card", name: "KPI卡片", category: "report", widget_type: "kpi" },
  { capability_key: "data_nl_query", name: "自然语言查数", category: "report", widget_type: "nlq" },
  { capability_key: "report_scheduled", name: "定时推送", category: "report", widget_type: "schedule" },
  { capability_key: "data_export", name: "数据导出", category: "report", widget_type: "export" },
  // Notify Agent
  { capability_key: "notify_inapp", name: "站内信", category: "notify", widget_type: "inapp" },
  { capability_key: "notify_email", name: "邮件通知", category: "notify", widget_type: "email" },
  { capability_key: "notify_im", name: "IM通知", category: "notify", widget_type: "im" },
  { capability_key: "announce_board", name: "公告栏", category: "notify", widget_type: "board" },
  // Integration Agent
  { capability_key: "integration", name: "集成引擎", category: "integration", widget_type: "engine" },
  { capability_key: "erp_connector", name: "ERP连接器", category: "integration", widget_type: "erp" },
  { capability_key: "oa_connector", name: "OA连接器", category: "integration", widget_type: "oa" },
  { capability_key: "auth_sso", name: "单点登录", category: "integration", widget_type: "sso" },
  { capability_key: "it_helpdesk", name: "IT报障", category: "integration", widget_type: "helpdesk" },
  { capability_key: "asset_manage", name: "资产管理", category: "integration", widget_type: "asset" },
  { capability_key: "meeting_booking", name: "会议室预约", category: "integration", widget_type: "meeting" },
];

// Seed data for Scenarios (Office 65 + Industry 49)
const OFFICE_SCENARIOS = [
  // 人事行政 12
  { scenario_key: "policy_qa", name: "制度政策问答", category: "人事行政", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_search"] },
  { scenario_key: "leave_apply", name: "请假申请", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "overtime_apply", name: "加班申请", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "business_trip", name: "出差申请", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "expense_report", name: "报销审批", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget", "chart_basic"] },
  { scenario_key: "onboarding", name: "入职办理", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "offboarding", name: "离职交接", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "list_widget"] },
  { scenario_key: "seal_apply", name: "用印申请", category: "人事行政", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "meeting_book", name: "会议室预约", category: "人事行政", type: "office", primary_agent: "integration", required_caps: ["meeting_booking"] },
  { scenario_key: "attendance", name: "考勤查询", category: "人事行政", type: "office", primary_agent: "report", required_caps: ["chart_basic", "data_nl_query"] },
  { scenario_key: "benefit_qa", name: "福利政策咨询", category: "人事行政", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_search"] },
  { scenario_key: "handbook_qa", name: "员工手册问答", category: "人事行政", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_document"] },
  // 财务法务 9
  { scenario_key: "reimbursement", name: "费用报销", category: "财务法务", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "loan_apply", name: "借款申请", category: "财务法务", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "contract_approval", name: "合同审批", category: "财务法务", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "approval_countersign"] },
  { scenario_key: "invoice_verify", name: "发票核验", category: "财务法务", type: "office", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "budget_query", name: "预算查询", category: "财务法务", type: "office", primary_agent: "report", required_caps: ["data_nl_query", "chart_basic"] },
  { scenario_key: "payment_apply", name: "付款申请", category: "财务法务", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "legal_qa", name: "法务咨询问答", category: "财务法务", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_search"] },
  { scenario_key: "compliance_kb", name: "合规制度库", category: "财务法务", type: "office", primary_agent: "kb", required_caps: ["kb_document", "kb_search"] },
  { scenario_key: "audit_search", name: "审计资料检索", category: "财务法务", type: "office", primary_agent: "kb", required_caps: ["kb_search"] },
  // 知识协同 8
  { scenario_key: "policy_doc", name: "制度文档库", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "sop_guide", name: "SOP作业指导", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_document", "kb_search"] },
  { scenario_key: "training_lib", name: "培训资料库", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "project_doc", name: "项目文档共享", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "meeting_notes", name: "会议纪要检索", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_search"] },
  { scenario_key: "newbie_onboard", name: "新人onboarding", category: "知识协同", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_document"] },
  { scenario_key: "internal_faq", name: "内部FAQ", category: "知识协同", type: "office", primary_agent: "chat_qa", required_caps: ["chat_qa"] },
  { scenario_key: "best_practice", name: "最佳实践库", category: "知识协同", type: "office", primary_agent: "kb", required_caps: ["kb_document", "kb_search"] },
  // 流程审批 8
  { scenario_key: "general_approval", name: "通用审批", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "countersign", name: "多级会签", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_countersign"] },
  { scenario_key: "todo_center", name: "待办中心", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_inbox"] },
  { scenario_key: "done_list", name: "已办查询", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_inbox"] },
  { scenario_key: "proxy_approval", name: "代理审批", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "overtime_remind", name: "超时催办", category: "流程审批", type: "office", primary_agent: "notify", required_caps: ["approval_remind", "notify_inapp"] },
  { scenario_key: "approval_stats", name: "审批统计", category: "流程审批", type: "office", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "cond_branch", name: "条件分支", category: "流程审批", type: "office", primary_agent: "approval", required_caps: ["approval_conditional"] },
  // 数据报表 8
  { scenario_key: "dept_dashboard", name: "部门看板", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["chart_dashboard"] },
  { scenario_key: "attendance_stats", name: "考勤统计", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "approval_efficiency", name: "审批效率", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "expense_summary", name: "费用汇总", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["chart_basic", "data_export"] },
  { scenario_key: "custom_report", name: "自定义报表", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["chart_dashboard"] },
  { scenario_key: "scheduled_push", name: "定时推送", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["report_scheduled", "notify_inapp"] },
  { scenario_key: "excel_export", name: "数据导出Excel", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["data_export"] },
  { scenario_key: "nl_query", name: "自然语言查数", category: "数据报表", type: "office", primary_agent: "report", required_caps: ["data_nl_query"] },
  // 消息通知 7
  { scenario_key: "approval_notify", name: "审批提醒", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "announcement", name: "公告推送", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["announce_board"] },
  { scenario_key: "todo_mention", name: "待办@提醒", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "email_sms", name: "邮件/短信", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_email"] },
  { scenario_key: "wecom_dingtalk", name: "企微/钉钉", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_im"] },
  { scenario_key: "subscribe_msg", name: "订阅消息", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "expiry_remind", name: "到期提醒", category: "消息通知", type: "office", primary_agent: "notify", required_caps: ["notify_inapp"] },
  // IT与资产 7
  { scenario_key: "it_ticket", name: "IT报障", category: "IT与资产", type: "office", primary_agent: "integration", required_caps: ["it_helpdesk", "approval_flow"] },
  { scenario_key: "account_apply", name: "账号权限申请", category: "IT与资产", type: "office", primary_agent: "approval", required_caps: ["approval_flow", "auth_sso"] },
  { scenario_key: "software_install", name: "软件安装申请", category: "IT与资产", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "asset_pickup", name: "资产领用", category: "IT与资产", type: "office", primary_agent: "integration", required_caps: ["asset_manage", "approval_flow"] },
  { scenario_key: "asset_inventory", name: "资产盘点", category: "IT与资产", type: "office", primary_agent: "integration", required_caps: ["asset_manage"] },
  { scenario_key: "network_apply", name: "网络/VPN申请", category: "IT与资产", type: "office", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "it_kb", name: "IT知识库", category: "IT与资产", type: "office", primary_agent: "kb", required_caps: ["kb_document", "kb_search"] },
  // 外部对接 6
  { scenario_key: "erp_sync", name: "对接SAP/用友", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["erp_connector"] },
  { scenario_key: "oa_sync", name: "对接OA", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["oa_connector"] },
  { scenario_key: "crm_sync", name: "对接CRM", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "hr_sync", name: "对接HR系统", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "sso_login", name: "单点登录SSO", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["auth_sso"] },
  { scenario_key: "bidirectional_sync", name: "数据双向同步", category: "外部对接", type: "office", primary_agent: "integration", required_caps: ["integration"] },
];

const INDUSTRY_SCENARIOS = [
  // 制造业 12
  { scenario_key: "mfg_repair", name: "设备报修", category: "设备管理", type: "industry", pack: "mfg", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "mfg_sop_qa", name: "SOP/工艺问答", category: "知识管理", type: "industry", pack: "mfg", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_search"] },
  { scenario_key: "mfg_daily_report", name: "生产日报/OEE", category: "生产管理", type: "industry", pack: "mfg", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "mfg_qc_approval", name: "质检审批", category: "质量管理", type: "industry", pack: "mfg", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "mfg_material", name: "物料领用", category: "物料管理", type: "industry", pack: "mfg", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "mfg_safety", name: "安环隐患上报", category: "安全管理", type: "industry", pack: "mfg", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "mfg_shift", name: "排班/考勤", category: "人事管理", type: "industry", pack: "mfg", primary_agent: "approval", required_caps: ["approval_flow", "list_widget"] },
  { scenario_key: "mfg_maintenance", name: "保养计划提醒", category: "设备管理", type: "industry", pack: "mfg", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "mfg_drawing_bom", name: "图纸/BOM检索", category: "知识管理", type: "industry", pack: "mfg", primary_agent: "kb", required_caps: ["kb_search"] },
  { scenario_key: "mfg_mes_erp", name: "对接MES/ERP", category: "系统集成", type: "industry", pack: "mfg", primary_agent: "integration", required_caps: ["erp_connector"] },
  { scenario_key: "mfg_energy", name: "能耗/碳排统计", category: "绿色制造", type: "industry", pack: "mfg", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "mfg_training", name: "技能培训记录", category: "人事管理", type: "industry", pack: "mfg", primary_agent: "kb", required_caps: ["kb_document"] },
  // 销售行业 12
  { scenario_key: "sales_product_qa", name: "产品/话术问答", category: "知识管理", type: "industry", pack: "sales", primary_agent: "chat_qa", required_caps: ["chat_qa", "kb_search"] },
  { scenario_key: "sales_discount", name: "报价/折扣审批", category: "审批流程", type: "industry", pack: "sales", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "sales_funnel", name: "销售漏斗看板", category: "数据分析", type: "industry", pack: "sales", primary_agent: "report", required_caps: ["chart_funnel"] },
  { scenario_key: "sales_followup", name: "客户跟进记录", category: "客户管理", type: "industry", pack: "sales", primary_agent: "approval", required_caps: ["form_widget", "list_widget"] },
  { scenario_key: "sales_contract", name: "合同审批", category: "审批流程", type: "industry", pack: "sales", primary_agent: "approval", required_caps: ["approval_flow", "approval_countersign"] },
  { scenario_key: "sales_oppo_remind", name: "商机到期提醒", category: "消息通知", type: "industry", pack: "sales", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "sales_ranking", name: "业绩排行/提成", category: "数据分析", type: "industry", pack: "sales", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "sales_case_lib", name: "案例/方案库", category: "知识管理", type: "industry", pack: "sales", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "sales_sample", name: "样品/礼品申请", category: "审批流程", type: "industry", pack: "sales", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "sales_crm_sync", name: "对接Salesforce/纷享", category: "系统集成", type: "industry", pack: "sales", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "sales_field_visit", name: "外勤签到", category: "客户管理", type: "industry", pack: "sales", primary_agent: "approval", required_caps: ["form_widget"] },
  { scenario_key: "sales_region_analysis", name: "区域销售分析", category: "数据分析", type: "industry", pack: "sales", primary_agent: "report", required_caps: ["chart_basic"] },
  // 医疗行业 12
  { scenario_key: "med_clinical_guide", name: "诊疗指南/药品库", category: "临床知识", type: "industry", pack: "med", primary_agent: "kb", required_caps: ["kb_document", "kb_search"] },
  { scenario_key: "med_compliance_qa", name: "内部制度/合规问答", category: "合规管理", type: "industry", pack: "med", primary_agent: "chat_qa", required_caps: ["chat_qa"] },
  { scenario_key: "med_shift_apply", name: "排班/调班申请", category: "人事管理", type: "industry", pack: "med", primary_agent: "approval", required_caps: ["approval_flow", "list_widget"] },
  { scenario_key: "med_supply_apply", name: "耗材/设备申购", category: "物资管理", type: "industry", pack: "med", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "med_patient_edu", name: "患者宣教资料", category: "患者服务", type: "industry", pack: "med", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "med_data_mask", name: "数据脱敏/权限", category: "数据安全", type: "industry", pack: "med", primary_agent: "creation", required_caps: ["rbac_page"] },
  { scenario_key: "med_adverse_event", name: "不良事件上报", category: "医疗安全", type: "industry", pack: "med", primary_agent: "approval", required_caps: ["approval_flow", "form_widget"] },
  { scenario_key: "med_dept_dashboard", name: "科室运营看板", category: "数据分析", type: "industry", pack: "med", primary_agent: "report", required_caps: ["chart_dashboard"] },
  { scenario_key: "med_cme", name: "继续教育/考核", category: "培训管理", type: "industry", pack: "med", primary_agent: "kb", required_caps: ["kb_document", "form_widget"] },
  { scenario_key: "med_his_sync", name: "对接HIS/LIS", category: "系统集成", type: "industry", pack: "med", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "med_triage", name: "智能导诊", category: "患者服务", type: "industry", pack: "med", primary_agent: "chat_qa", required_caps: ["chat_qa"] },
  { scenario_key: "med_consultation", name: "会诊/转诊申请", category: "临床管理", type: "industry", pack: "med", primary_agent: "approval", required_caps: ["approval_flow"] },
  // 游戏行业 13
  { scenario_key: "game_faq", name: "玩家FAQ/攻略", category: "玩家服务", type: "industry", pack: "game", primary_agent: "chat_qa", required_caps: ["chat_qa"] },
  { scenario_key: "game_ticket", name: "客服工单", category: "客服管理", type: "industry", pack: "game", primary_agent: "approval", required_caps: ["approval_flow", "list_widget"] },
  { scenario_key: "game_version_lib", name: "版本/活动规则库", category: "知识管理", type: "industry", pack: "game", primary_agent: "kb", required_caps: ["kb_document"] },
  { scenario_key: "game_retention", name: "留存/ARPU看板", category: "数据分析", type: "industry", pack: "game", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "game_compliance", name: "版号/合规审查", category: "合规管理", type: "industry", pack: "game", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "game_launch_notify", name: "活动上线通知", category: "消息通知", type: "industry", pack: "game", primary_agent: "notify", required_caps: ["notify_inapp"] },
  { scenario_key: "game_npc_chat", name: "NPC/角色对话", category: "C端功能", type: "industry", pack: "game", primary_agent: "chat_qa", required_caps: ["chat_qa"] },
  { scenario_key: "game_outsource", name: "外包验收审批", category: "审批流程", type: "industry", pack: "game", primary_agent: "approval", required_caps: ["approval_flow"] },
  { scenario_key: "game_channel_roi", name: "渠道投放分析", category: "数据分析", type: "industry", pack: "game", primary_agent: "report", required_caps: ["chart_basic"] },
  { scenario_key: "game_backend_sync", name: "对接游戏后台", category: "系统集成", type: "industry", pack: "game", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "game_content_filter", name: "敏感词/内容风控", category: "安全合规", type: "industry", pack: "game", primary_agent: "creation", required_caps: ["creation"] },
  { scenario_key: "game_subscription", name: "内购/订阅", category: "C端功能", type: "industry", pack: "game", primary_agent: "integration", required_caps: ["integration"] },
  { scenario_key: "game_guild_mgmt", name: "公会/社区管理", category: "社区管理", type: "industry", pack: "game", primary_agent: "approval", required_caps: ["approval_flow", "list_widget"] },
];

export async function POST() {
  const client = getSupabaseClient();

  try {
    // Seed Agents
    const { error: agentError } = await client.from("agents").upsert(
      AGENTS.map((a) => ({ ...a, status: "active" })),
      { onConflict: "agent_key" }
    );
    if (agentError) throw new Error(`Agents seed failed: ${agentError.message}`);

    // Get agent IDs for capability mapping
    const { data: agentRows, error: fetchError } = await client.from("agents").select("id, agent_key");
    if (fetchError) throw new Error(`Fetch agents failed: ${fetchError.message}`);
    const agentMap = Object.fromEntries((agentRows as Array<{ id: string; agent_key: string }>).map((a) => [a.agent_key, a.id]));

    // Seed Capabilities
    const capsWithAgentId = CAPABILITIES.map((c) => {
      const catToAgent: Record<string, string> = {
        creation: "creation", chat: "chat_qa", kb: "kb",
        approval: "approval", report: "report", notify: "notify", integration: "integration",
      };
      return { ...c, agent_id: agentMap[catToAgent[c.category]] || agentMap["creation"] };
    });
    const { error: capError } = await client.from("capabilities").upsert(
      capsWithAgentId,
      { onConflict: "capability_key" }
    );
    if (capError) throw new Error(`Capabilities seed failed: ${capError.message}`);

    // Seed Office Scenarios
    const officeData = OFFICE_SCENARIOS.map((s, i) => ({
      ...s,
      description: `${s.name} - ${s.category}场景`,
      is_standard: true,
      sort_order: i + 1,
    }));
    const { error: officeError } = await client.from("scenarios").upsert(
      officeData,
      { onConflict: "scenario_key" }
    );
    if (officeError) throw new Error(`Office scenarios seed failed: ${officeError.message}`);

    // Seed Industry Scenarios
    const industryData = INDUSTRY_SCENARIOS.map((s, i) => ({
      ...s,
      description: `${s.name} - ${s.category}行业场景`,
      is_standard: true,
      sort_order: 100 + i,
    }));
    const { error: indError } = await client.from("scenarios").upsert(
      industryData,
      { onConflict: "scenario_key" }
    );
    if (indError) throw new Error(`Industry scenarios seed failed: ${indError.message}`);

    return NextResponse.json({
      success: true,
      message: "Seed completed",
      stats: {
        agents: AGENTS.length,
        capabilities: CAPABILITIES.length,
        office_scenarios: OFFICE_SCENARIOS.length,
        industry_scenarios: INDUSTRY_SCENARIOS.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  const client = getSupabaseClient();
  try {
    const { count: agentCount } = await client.from("agents").select("*", { count: "exact", head: true });
    const { count: capCount } = await client.from("capabilities").select("*", { count: "exact", head: true });
    const { count: scenarioCount } = await client.from("scenarios").select("*", { count: "exact", head: true });
    return NextResponse.json({
      agents: agentCount || 0,
      capabilities: capCount || 0,
      scenarios: scenarioCount || 0,
    });
  } catch {
    return NextResponse.json({ agents: 0, capabilities: 0, scenarios: 0 });
  }
}
