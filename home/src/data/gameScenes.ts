/** 游戏娱乐 Runtime 场景种子（与 backend game_scene_capabilities SSOT 对齐） */

export interface GameSceneSeed {
  id: string
  name: string
  category: string
  summary: string
  pages: string
  kind: string
  capabilityHint: string
  pageMock?: {
    form_title?: string
    fields?: Array<{ key?: string; label: string; placeholder?: string; type?: string; optional?: boolean }>
    list_title?: string
    list?: Array<{ id: string; title: string; status: string }>
    chat_title?: string
    chat?: Array<{ role: string; text: string }>
    files_title?: string
    files?: string[]
    kpis?: Array<{ label: string; value: string; hint?: string }>
    primary_action?: string
  }
}

export const GAME_SCENE_SEEDS: GameSceneSeed[] = [
  {
    id: 'g1',
    name: '玩家FAQ',
    category: '玩家服务',
    summary: '活动规则 / 掉落说明真 FAQ 入库',
    pages: 'form+list',
    kind: 'form_list',
    capabilityHint: 'game_support',
    pageMock: {
      form_title: '玩家 FAQ',
      fields: [
        { key: 'player_name', label: '玩家昵称', placeholder: '可选', optional: true },
        { key: 'title', label: '标题', placeholder: '活动规则 / 掉落说明…' },
        { key: 'content', label: '详细内容', type: 'textarea', placeholder: '规则要点…', optional: true },
      ],
      list_title: 'FAQ 记录',
      list: [],
      primary_action: '提交 FAQ',
    },
  },
  {
    id: 'g2',
    name: '客服工单',
    category: '客服管理',
    summary: '掉线/充值/封号真工单闭环',
    pages: 'form+list',
    kind: 'form_list',
    capabilityHint: 'game_support',
    pageMock: {
      form_title: '客服工单',
      fields: [
        { key: 'player_name', label: '玩家昵称', optional: true },
        { key: 'title', label: '标题', placeholder: '掉线 / 充值异常…' },
        { key: 'content', label: '复现步骤', type: 'textarea', optional: true },
      ],
      list_title: '处理中工单',
      list: [],
      primary_action: '提交工单',
    },
  },
  {
    id: 'g3',
    name: '活动规则检索',
    category: '知识管理',
    summary: '锁定「游戏·玩家FAQ与活动规则库」RAG',
    pages: 'kb+chat',
    kind: 'chat_kb',
    capabilityHint: 'kb_document',
    pageMock: {
      chat_title: '游戏·玩家FAQ与活动规则库',
      chat: [{ role: 'bot', text: '检索活动规则 / 攻略；空库无文档时仅作引导。' }],
      files_title: '活动文档',
      files: [],
      primary_action: '检索',
    },
  },
  {
    id: 'g4',
    name: '版号合规检索',
    category: '合规管理',
    summary: '锁定「游戏·版号合规与内容审核库」RAG',
    pages: 'kb+chat',
    kind: 'chat_kb',
    capabilityHint: 'kb_document',
    pageMock: {
      chat_title: '游戏·版号合规与内容审核库',
      chat: [{ role: 'bot', text: '检索版号要点 / 敏感词口径；空库无文档时仅作引导。' }],
      files_title: '合规文档',
      files: [],
      primary_action: '检索',
    },
  },
  {
    id: 'g5',
    name: '游戏·玩家FAQ与活动规则库',
    category: '行业知识库',
    summary: '行业专属知识库 · 真文档 RAG',
    pages: 'kb+chat',
    kind: 'chat_kb',
    capabilityHint: 'kb_document',
    pageMock: {
      chat_title: '游戏·玩家FAQ与活动规则库',
      chat: [{ role: 'bot', text: '空库空列表；发布后 seed 示范文档可检索。' }],
      files: [],
      primary_action: '打开知识库',
    },
  },
  {
    id: 'g6',
    name: '游戏·版号合规与内容审核库',
    category: '行业知识库',
    summary: '行业专属知识库 · 真文档 RAG',
    pages: 'kb+chat',
    kind: 'chat_kb',
    capabilityHint: 'kb_document',
    pageMock: {
      chat_title: '游戏·版号合规与内容审核库',
      chat: [{ role: 'bot', text: '空库空列表；发布后 seed 示范文档可检索。' }],
      files: [],
      primary_action: '打开知识库',
    },
  },
  {
    id: 'g7',
    name: '活动上线通知',
    category: '消息通知',
    summary: '开服/赛季活动 IM Webhook 真推送',
    pages: 'notify',
    kind: 'notify',
    capabilityHint: 'notify_im',
    pageMock: {
      form_title: '活动上线通知',
      fields: [
        { key: 'channel', label: '渠道', placeholder: '企微 / 钉钉 / 飞书' },
        { key: 'title', label: '标题', placeholder: '赛季开启通知' },
        { key: 'body', label: '正文', type: 'textarea', optional: true },
      ],
      primary_action: '测推',
    },
  },
  {
    id: 'g8',
    name: '外包验收审批',
    category: '审批流程',
    summary: '美术/音效外包验收真审批流',
    pages: 'approval+form',
    kind: 'form_list',
    capabilityHint: 'approval_flow',
    pageMock: {
      form_title: '外包验收审批',
      fields: [
        { key: 'vendor', label: '外包方', placeholder: '供应商名称' },
        { key: 'deliverable', label: '交付物', placeholder: '角色立绘 / BGM…' },
        { key: 'note', label: '验收说明', type: 'textarea', optional: true },
      ],
      list_title: '审批中',
      list: [],
      primary_action: '提交审批',
    },
  },
  {
    id: 'g9',
    name: '版号合规审查',
    category: '合规管理',
    summary: '内容上线前合规会签',
    pages: 'approval+form',
    kind: 'form_list',
    capabilityHint: 'approval_flow',
    pageMock: {
      form_title: '版号合规审查',
      fields: [
        { key: 'build', label: '版本号', placeholder: 'v1.2.0' },
        { key: 'scope', label: '审查范围', placeholder: 'UGC / 活动文案…' },
        { key: 'note', label: '备注', type: 'textarea', optional: true },
      ],
      list: [],
      primary_action: '提交审查',
    },
  },
  {
    id: 'g10',
    name: '留存运营看板',
    category: '数据分析',
    summary: '留存/活跃真图表组件',
    pages: 'chart',
    kind: 'chart',
    capabilityHint: 'chart_dashboard',
    pageMock: {
      kpis: [
        { label: 'DAU', value: '—', hint: '接真数据后刷新' },
        { label: '次留', value: '—', hint: '%' },
        { label: '付费率', value: '—', hint: '%' },
      ],
      primary_action: '刷新',
    },
  },
  {
    id: 'g11',
    name: '渠道投放分析',
    category: '数据分析',
    summary: 'CAC/ROI 自然语言问数',
    pages: 'chart',
    kind: 'chart',
    capabilityHint: 'data_nl_query',
    pageMock: {
      chat_title: '渠道问数',
      chat: [{ role: 'bot', text: '可用自然语言查询 CAC / ROI；接真数据后出结果。' }],
      primary_action: '提问',
    },
  },
  {
    id: 'g12',
    name: '对接游戏后台',
    category: '系统集成',
    summary: 'GM / 数据中台连接器',
    pages: 'integration',
    kind: 'integration',
    capabilityHint: 'erp_connector',
    pageMock: {
      form_title: '对接游戏后台',
      fields: [
        { key: 'endpoint', label: '接口地址', placeholder: 'https://gm.example.com' },
        { key: 'auth', label: '鉴权方式', placeholder: 'Token / HMAC', optional: true },
      ],
      primary_action: '保存连接',
    },
  },
  {
    id: 'g13',
    name: '2048小游戏',
    category: '运营互动',
    summary: '正式可玩 2048（路径 A）',
    pages: 'form',
    kind: 'game',
    capabilityHint: 'game_2048',
    pageMock: {
      form_title: '2048',
      primary_action: '开始游戏',
    },
  },
  {
    id: 'g14',
    name: '公会举报处理',
    category: '社区管理',
    summary: '公会公告/举报真工单',
    pages: 'form+list',
    kind: 'form_list',
    capabilityHint: 'game_support',
    pageMock: {
      form_title: '公会举报处理',
      fields: [
        { key: 'title', label: '标题', placeholder: '公会举报 / 公告违规…' },
        { key: 'content', label: '详情', type: 'textarea', optional: true },
      ],
      list: [],
      primary_action: '提交',
    },
  },
]
