import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep, type SchemaNode } from '@blockhub/web-core'

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
  const { token, primaryColor, appId, entrySource } = useRuntime()
  const [items, setItems] = useState<Connector[]>([])
  const [values, setValues] = useState<Record<string, string>>({ channel: 'wecom' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)

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
    const url = (values.webhook || '').trim()
    const channel = (values.channel || 'wecom') as (typeof IM_CHANNELS)[number]['type']
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
      setValues({ channel: resolved })
      setResetKey((k) => k + 1)
      setMsg(`${label}已绑定。下方可测推送；报修/派工/完工会自动发到群。`)
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
        ? `${window.location.origin}/r/${appId}/device-repair?from=wecom`
        : `${window.location.origin}/`
      const res = await apiFetch<{ status?: string; delivered?: number; reason?: string; detail_url?: string }>(
        `/api/v1/integrations/${id}/test-message`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            title: '积木仓 IM 探测',
            content: '测试消息：群里能看到说明链路已通；点「打开报修工单」进入协作入口。',
            detail_url: detailUrl,
            app_public_id: appId || '',
            link_label: '打开报修工单',
          }),
        },
      )
      if (res.status === 'skipped') {
        setMsg(`未发送：${res.reason || '无 Webhook'}`)
      } else {
        setMsg(`推送结果：${res.status} · delivered=${res.delivered ?? 0}`)
      }
      await load()
    } catch (e) {
      setMsg(`测试失败：${String(e)}`)
    }
  }

  const accent = primaryColor || '#4338ca'
  const ph = IM_CHANNELS.find((c) => c.type === (values.channel || 'wecom'))?.placeholder || ''
  const bound = items.length > 0

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'channel',
        label: '通道',
        render: ({ value, setValue, accent: a }) => (
          <div className="im-channel-grid" style={{ flex: 1 }}>
            {IM_CHANNELS.map((c) => (
              <button
                key={c.type}
                type="button"
                className={`im-channel-card${value === c.type ? ' is-selected' : ''}`}
                style={value === c.type ? { borderColor: a } : undefined}
                onClick={() => setValue(c.type)}
              >
                <strong>{c.label}</strong>
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'webhook',
        label: 'Webhook',
        placeholder: ph,
        hint: '也可由运维配置 IM_WECOM_WEBHOOK_URL 自动绑定',
      },
    ],
    [ph],
  )

  return (
    <div>
      <p className="muted" style={{ marginBottom: 4 }}>业务闭环（配置一次即可）</p>
      <ol className="bh-process-flow" aria-label="报修推送流程">
        <li className="is-done">提单</li>
        <span className="arrow" aria-hidden>→</span>
        <li className="is-done">群通知</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={bound ? 'is-done' : 'is-active'}>通道已绑？</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={bound ? 'is-active' : ''}>派工 / 完工再推</li>
      </ol>

      <GtgtStepComposer
        title="消息推送配置"
        meta={entrySource === 'im' ? '协作侧' : '工作台'}
        accent={accent}
        flowHint="选通道 → 粘贴 Webhook → 保存启用"
        steps={steps}
        values={values}
        onChange={(k, v) => {
          setValues((p) => {
            const next = { ...p, [k]: v }
            if (k === 'webhook') {
              const detected = detectChannelFromUrl(v)
              if (detected) next.channel = detected
            }
            return next
          })
        }}
        onComplete={bind}
        busy={busy}
        resetKey={resetKey}
        submitLabel="保存并启用推送"
      >
        {msg ? <p className="status-msg">{msg}</p> : null}
      </GtgtStepComposer>

      <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>已绑定通道</h4>
      {items.length === 0 && <p className="muted">还没有可用通道。{'>>'} 选通道 → 粘贴 → 保存。</p>}
      {items.map((c) => {
        const cfg = c.config as { webhook_url?: string; source?: string; managed?: boolean }
        const envManaged = cfg?.source === 'env' || cfg?.managed === true
        return (
          <div key={c.id} className="list-card">
            <div className="list-card-head">
              <strong>{c.name}</strong>
              <span className="tag">{c.connector_type} · {envManaged ? '环境自动' : '页面粘贴'}</span>
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
