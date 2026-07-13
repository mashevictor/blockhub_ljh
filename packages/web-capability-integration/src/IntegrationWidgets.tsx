import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

type IntegrationKind = 'erp' | 'meeting' | 'helpdesk' | 'asset' | 'im' | 'rbac' | 'generic'

const PRESETS: Record<
  IntegrationKind,
  { title: string; desc: string; actions: string[]; samples: string[] }
> = {
  erp: {
    title: 'ERP 对接',
    desc: '连接用友 / 金蝶 / SAP，同步主数据与单据。',
    actions: ['测试连接', '同步主数据', '查看映射'],
    samples: ['采购订单 PO-2026-0412', '库存快照 已同步', '供应商主数据 128 条'],
  },
  meeting: {
    title: '会议室预约',
    desc: '查看空闲会议室并完成预约。',
    actions: ['查看今日空闲', '发起预约', '我的预订'],
    samples: ['3F-木星 · 10:00-11:00 空闲', '5F-火星 · 14:00 已预订', '访客会议室 · 全天可用'],
  },
  helpdesk: {
    title: 'IT 报障',
    desc: '提交 IT 工单并跟踪处理进度。',
    actions: ['新建工单', '我的工单', '知识库'],
    samples: ['#HD-8821  VPN 无法连接 · 处理中', '#HD-8816  邮箱容量 · 已解决', '#HD-8802  打印机离线 · 待分配'],
  },
  asset: {
    title: '资产管理',
    desc: '固定资产领用、归还与盘点。',
    actions: ['资产领用', '归还登记', '盘点任务'],
    samples: ['MacBook Pro · 研发部 · 在用', '显示器 27" · 行政部 · 闲置', '待盘点资产 23 项'],
  },
  im: {
    title: '企微 / 钉钉',
    desc: '配置企业 IM 通道并发送业务通知。',
    actions: ['绑定企微', '绑定钉钉', '发送测试消息'],
    samples: ['审批提醒 → 企微应用消息', '日报推送 → 钉钉群机器人', '告警通知 → 飞书 webhook'],
  },
  rbac: {
    title: '角色权限',
    desc: '配置应用可见范围与角色能力。',
    actions: ['角色列表', '成员授权', '审计日志'],
    samples: ['管理员 · 全量能力', '部门主管 · 审批+报表', '普通员工 · 问答+待办'],
  },
  generic: {
    title: '外部集成',
    desc: '对接第三方系统能力模块。',
    actions: ['配置连接', '查看日志'],
    samples: ['Webhook 已启用', '最近同步 2 分钟前'],
  },
}

function kindFromNode(node: SchemaNode): IntegrationKind {
  const key = String(node.props?.capability_key ?? node.id ?? '').toLowerCase()
  const widget = String(node.props?.widget ?? '').toLowerCase()
  if (key.includes('erp') || widget.includes('erp')) return 'erp'
  if (key.includes('meeting') || widget.includes('meeting')) return 'meeting'
  if (key.includes('helpdesk') || key.includes('报障') || widget.includes('helpdesk')) return 'helpdesk'
  if (key.includes('asset') || widget.includes('asset')) return 'asset'
  if (key.includes('notify_im') || key.includes('_im') || widget.includes('im')) return 'im'
  if (key.includes('rbac') || widget.includes('rbac')) return 'rbac'
  return 'generic'
}

function IntegrationPanel({ node }: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const kind = kindFromNode(node)
  const preset = PRESETS[kind]
  const [msg, setMsg] = useState('')

  return (
    <div className="widget integration-widget">
      <h3>{preset.title}</h3>
      <p className="muted">{preset.desc}</p>
      <div className="row-actions">
        {preset.actions.map((a) => (
          <button
            key={a}
            type="button"
            className="btn-ghost"
            onClick={() => setMsg(`「${a}」已提交（演示）`)}
          >
            {a}
          </button>
        ))}
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <ul className="integration-samples">
        {preset.samples.map((s) => (
          <li key={s} className="list-card">
            <span style={{ color: primaryColor }}>●</span> {s}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ERPWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
export function MeetingWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
export function HelpdeskWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
export function AssetWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
export function IMWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
export function RBACWidget(props: { node: SchemaNode }) {
  return <IntegrationPanel {...props} />
}
