export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'http://127.0.0.1:5174'
export const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || 'http://101.32.209.251'

export { INDUSTRIES_SHOWCASE as INDUSTRIES } from './showcase'

export const PROMPT_CHIPS = [
  '制造业设备报修 + SOP 问答',
  '销售团队 CRM + 审批 + 漏斗看板',
  '医院内部制度问答 + 排班申请',
  '游戏玩家 FAQ + 客服工单',
  '全员请假报销 + 知识库 + 企微通知',
]

export const MODULES = [
  { cat: '智能交互', items: [
    { key: 'chat_qa', name: '智能问答', icon: '💬' },
    { key: 'chat_voice', name: '语音问答', icon: '🎤' },
    { key: 'multi_agent', name: '多助手', icon: '🤖' },
  ]},
  { cat: '流程审批', items: [
    { key: 'approval_flow', name: '审批流', icon: '✅' },
    { key: 'approval_inbox', name: '待办中心', icon: '📥' },
    { key: 'approval_countersign', name: '会签', icon: '✍' },
  ]},
  { cat: '知识数据', items: [
    { key: 'kb_document', name: '知识库', icon: '📚' },
    { key: 'data_nl_query', name: '智能问数', icon: '🔍' },
  ]},
  { cat: '可视化', items: [
    { key: 'chart_dashboard', name: '数据看板', icon: '📊' },
    { key: 'chart_funnel', name: '销售漏斗', icon: '📉' },
  ]},
  { cat: 'Flutter工具', items: [
    { key: 'schedule_alarm', name: '定时闹钟', icon: '⏰' },
    { key: 'flutter_push', name: '移动推送', icon: '📲' },
    { key: 'flutter_scan_qr', name: '扫码识别', icon: '📷' },
    { key: 'flutter_geolocation', name: '定位签到', icon: '📍' },
    { key: 'flutter_camera', name: '拍照上传', icon: '📸' },
    { key: 'flutter_map', name: '地图导航', icon: '🗺️' },
    { key: 'flutter_offline', name: '离线缓存', icon: '💾' },
    { key: 'flutter_biometric', name: '生物识别', icon: '🔒' },
    { key: 'flutter_signature', name: '手写签名', icon: '✍️' },
    { key: 'flutter_speech', name: '语音交互', icon: '🎤' },
    { key: 'flutter_file_picker', name: '文件选择', icon: '📁' },
    { key: 'flutter_pdf', name: 'PDF预览', icon: '📄' },
    { key: 'flutter_webview', name: '内嵌网页', icon: '🌐' },
    { key: 'flutter_chart', name: '移动图表', icon: '📊' },
  ]},
  { cat: '通知集成', items: [
    { key: 'notify_inapp', name: '站内信', icon: '🔔' },
    { key: 'notify_im', name: '企微钉钉', icon: '💼' },
  ]},
  { cat: '权限/外部', items: [
    { key: 'rbac_page', name: '角色权限', icon: '🔐' },
    { key: 'erp_connector', name: 'ERP 对接', icon: '🔌' },
  ]},
]

export const SCENES: Record<string, string[]> = {
  office: ['制度政策问答','请假申请','加班申请','报销审批','入职办理','用印申请','通用审批','待办中心','部门看板','制度文档库','IT报障','企微通知'],
  mfg: ['设备报修','SOP/工艺问答','生产日报/OEE','质检审批','物料领用','安环隐患上报','排班/考勤','保养计划提醒','图纸/BOM检索','对接MES/ERP'],
  sales: ['产品/话术问答','报价/折扣审批','销售漏斗看板','客户跟进记录','合同审批','商机到期提醒','案例/方案库','外勤签到'],
  med: ['内部制度/合规问答','排班/调班申请','耗材/设备申购','患者宣教资料','不良事件上报','智能导诊(对外)','会诊/转诊申请'],
  game: ['玩家FAQ/攻略','客服工单','版本/活动规则库','留存/ARPU看板','NPC/角色对话(C端)','活动上线通知','公会/社区管理'],
}

export type ViewMode = 'prompt' | 'industry' | 'module'
export type Audience = 'b' | 'c' | 'both'
export type DeliverTarget = 'web' | 'app' | 'both'

export interface PublishResult {
  webUrl: string
  appQr: string
  downloadUrl?: string
  appName: string
  iconUrl?: string
  primaryColor?: string
  moduleCount: number
  /** 本次应用实际包含的模块/场景（用于发布弹窗展示） */
  modules: PublishedModuleItem[]
  scenarios?: string[]
  appId?: string
  schemaUrl?: string
  source?: string
  deliver?: 'web' | 'app' | 'both' | string
  contactEmail?: string
  emailSent?: boolean
  emailConfigured?: boolean
}

export interface PublishedModuleItem {
  key: string
  label: string
  iconKey: string
  kind: 'module' | 'capability' | 'scenario' | 'industry' | 'office'
  source?: 'user' | 'auto' | 'suggest' | 'suggest'
}
