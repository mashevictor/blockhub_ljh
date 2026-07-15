import { useCallback, useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

type IntegrationKind = 'erp' | 'meeting' | 'helpdesk' | 'asset' | 'im' | 'rbac' | 'generic'

interface Connector {
  id: string
  name: string
  connector_type: string
  config: Record<string, unknown>
  status: string
  last_sync_at?: string | null
}

const PRESETS: Record<
  IntegrationKind,
  { title: string; desc: string; actions: string[]; samples: string[] }
> = {
  erp: {
    title: 'ERP 对接',
    desc: '连接用友 / 金蝶 / SAP（P4-I3 签约驱动 Adapter）。',
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
    samples: ['#HD-8821  VPN 无法连接 · 处理中'],
  },
  asset: {
    title: '资产管理',
    desc: '固定资产领用、归还与盘点。',
    actions: ['资产领用', '归还登记', '盘点任务'],
    samples: ['MacBook Pro · 研发部 · 在用'],
  },
  im: {
    title: '企微 / 钉钉 / 飞书',
    desc: '配置群机器人 Webhook；审批/报修状态会真推送到群（P4-I2）。',
    actions: [],
    samples: [],
  },
  rbac: {
    title: '角色权限',
    desc: '配置应用可见范围与角色能力。',
    actions: ['角色列表', '成员授权', '审计日志'],
    samples: ['管理员 · 全量能力', '部门主管 · 审批+报表'],
  },
  generic: {
    title: '外部集成',
    desc: '对接第三方系统能力模块。',
    actions: ['配置连接', '查看日志'],
    samples: ['Webhook 已启用'],
  },
}

const IM_CHANNELS = [
  { type: 'wecom', label: '企业微信', placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…' },
  { type: 'dingtalk', label: '钉钉', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=…' },
  { type: 'feishu', label: '飞书', placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/…' },
] as const

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

function isImChannelConnector(c: Connector): boolean {
  const t = String(c.connector_type || '').toLowerCase()
  const cfg = (c.config || {}) as { vendor?: string; channel?: string; webhook_url?: string }
  const vendor = String(cfg.vendor || cfg.channel || t).toLowerCase()
  const url = String(cfg.webhook_url || '').trim()
  const imType = ['wecom', 'dingtalk', 'feishu'].includes(t) || ['wecom', 'dingtalk', 'feishu'].includes(vendor)
  // 只展示带真实 webhook 的企微/钉钉/飞书，避免把 ERP/HR 裸 webhook 混进来
  return imType && url.startsWith('http')
}

function detectChannelFromUrl(url: string): (typeof IM_CHANNELS)[number]['type'] | null {
  const u = url.toLowerCase()
  if (u.includes('qyapi.weixin.qq.com')) return 'wecom'
  if (u.includes('oapi.dingtalk.com') || u.includes('dingtalk.com')) return 'dingtalk'
  if (u.includes('feishu.cn') || u.includes('larksuite.com')) return 'feishu'
  return null
}

function ImChannelPanel() {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<Connector[]>([])
  const [webhook, setWebhook] = useState('')
  const [channel, setChannel] = useState<(typeof IM_CHANNELS)[number]['type']>('wecom')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [step, setStep] = useState(0)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<{ items: Connector[] }>('/api/v1/integrations', token)
      setItems((data.items || []).filter(isImChannelConnector))
    } catch {
      setItems([])
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  const bind = async () => {
    const url = webhook.trim()
    if (!token || !url) {
      setMsg('请粘贴机器人 Webhook 地址')
      return
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setMsg('Webhook 需为 http(s) 完整地址')
      return
    }
    const resolved = detectChannelFromUrl(url) || channel
    setBusy(true)
    setMsg('')
    try {
      const label = IM_CHANNELS.find((c) => c.type === resolved)?.label || resolved
      await apiFetch('/api/v1/integrations', token, {
        method: 'POST',
        body: JSON.stringify({
          name: `${label}机器人`,
          connector_type: resolved,
          config: {
            source: 'ui',
            webhook_url: url,
            vendor: resolved,
            channel: resolved,
            managed: false,
          },
        }),
      })
      setWebhook('')
      setChannel(resolved)
      setStep(0)
      setMsg(`${label}通道已保存（页面粘贴）；群里会收到报修/审批推送，也可点「发送测试消息」`)
      await load()
    } catch (e) {
      setMsg(`保存失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async (id: string) => {
    if (!token) return
    try {
      const detailUrl = appId
        ? `${window.location.origin}/r/${appId}/device-repair`
        : `${window.location.origin}/`
      const res = await apiFetch<{ status?: string; delivered?: number; reason?: string; detail_url?: string }>(
        `/api/v1/integrations/${id}/test-message`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            title: '积木仓 IM 探测',
            content: '测试消息：群里能看到说明链路已通；点「打开报修工单」回到应用。',
            detail_url: detailUrl,
            app_public_id: appId || '',
            link_label: '打开报修工单',
          }),
        },
      )
      if (res.status === 'skipped') {
        setMsg(`未发送：${res.reason || '无 Webhook'}`)
      } else {
        setMsg(`推送结果：${res.status} · delivered=${res.delivered ?? 0}${res.detail_url ? ` · ${res.detail_url}` : ''}`)
      }
      await load()
    } catch (e) {
      setMsg(`测试失败：${String(e)}`)
    }
  }

  const accent = primaryColor || '#4338ca'
  const ph = IM_CHANNELS.find((c) => c.type === channel)?.placeholder || ''
  const envItems = items.filter((c) => {
    const cfg = c.config as { source?: string; managed?: boolean }
    return cfg?.source === 'env' || cfg?.managed === true
  })
  const uiItems = items.filter((c) => !envItems.includes(c))

  return (
    <div className="bh-flow-form">
      <div className="bh-flow-head">
        <h3>企微 / 钉钉 / 飞书</h3>
        <span className="bh-flow-meta">{step + 1}/2</span>
      </div>
      <p className="muted" style={{ marginBottom: 8 }}>
        <strong>双通道都可用：</strong>
        ① 本页粘贴群机器人 Webhook 并保存；② 服务器配置 <code>IM_WECOM_WEBHOOK_URL</code> 自动绑定。
        报修/审批变更会对<strong>所有已绑定通道</strong>真推送。
      </p>

      <div className="bh-flow-steps">
        {['选择通道', '粘贴 Webhook'].map((label, i) => (
          <div key={label} className={`bh-flow-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}>
            <span className="bh-flow-dot" style={i <= step ? { background: accent } : undefined} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="bh-flow-body">
        {step === 0 && (
          <div className="row-actions" style={{ marginTop: 0 }}>
            {IM_CHANNELS.map((c) => (
              <button
                key={c.type}
                type="button"
                className={channel === c.type ? 'btn' : 'btn btn-ghost'}
                style={channel === c.type ? { background: accent } : undefined}
                onClick={() => setChannel(c.type)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <label>
            Webhook 地址（企微示例：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…）
            <input
              className="input"
              value={webhook}
              onChange={(e) => {
                const v = e.target.value
                setWebhook(v)
                const detected = detectChannelFromUrl(v)
                if (detected) setChannel(detected)
              }}
              placeholder={ph}
              autoFocus
            />
          </label>
        )}

        <div className="bh-flow-actions">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>上一步</button>
          )}
          {step === 0 ? (
            <button type="button" className="btn" style={{ background: accent }} onClick={() => setStep(1)}>
              下一步 · 粘贴 Webhook
            </button>
          ) : (
            <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void bind()}>
              {busy ? '保存中…' : '保存通道'}
            </button>
          )}
        </div>
        {msg && <p className="status-msg">{msg}</p>}
      </div>

      <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>已绑定通道</h4>
      {items.length === 0 && (
        <p className="muted">尚未绑定。可在上方粘贴保存，或让运维配置 IM_WECOM_WEBHOOK_URL 后重启 API。</p>
      )}
      {envItems.length > 0 && (
        <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>环境自动（{envItems.length}）</p>
      )}
      {envItems.map((c) => {
        const cfg = c.config as { webhook_url?: string }
        return (
          <div key={c.id} className="list-card">
            <div className="list-card-head">
              <strong>{c.name}</strong>
              <span className="tag">{c.connector_type} · 环境自动</span>
            </div>
            <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>{cfg?.webhook_url}</p>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void sendTest(c.id)}>
              发送测试消息
            </button>
          </div>
        )
      })}
      {uiItems.length > 0 && (
        <p className="muted" style={{ fontSize: 12, margin: '12px 0 6px' }}>页面粘贴（{uiItems.length}）</p>
      )}
      {uiItems.map((c) => {
        const cfg = c.config as { webhook_url?: string }
        return (
          <div key={c.id} className="list-card">
            <div className="list-card-head">
              <strong>{c.name}</strong>
              <span className="tag">{c.connector_type} · 页面粘贴</span>
            </div>
            <p className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>{cfg?.webhook_url}</p>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void sendTest(c.id)}>
              发送测试消息
            </button>
          </div>
        )
      })}
    </div>
  )
}

function IntegrationPanel({ node }: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const kind = kindFromNode(node)
  if (kind === 'im') return <ImChannelPanel />

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
            onClick={() => setMsg(`「${a}」已记录（${kind === 'erp' ? '待 P4-I3 Adapter' : '演示'}）`)}
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
