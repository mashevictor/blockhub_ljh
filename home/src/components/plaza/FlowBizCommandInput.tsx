import { useMemo, useState } from 'react'
import type { ModuleCapability } from '../../data/moduleCatalog'
import { buildApiCurl, type FlowApiEndpoint } from '../../lib/flowModuleApis'

export type BizCommandKind =
  | 'insert'
  | 'invoke'
  | 'invoke-out'
  | 'analyze'
  | 'note'
  | 'open'
  | 'copy-curl'
  | 'start'
  | 'stop'
  | 'pause'
  | 'ask'

export interface BizQuickChip {
  cat: 'design' | 'dev' | 'test' | 'ops'
  label: string
  text: string
}

interface Props {
  /** 运行中禁止改模块/测接口；问答与停止仍可执行 */
  mutateLocked?: boolean
  disabled?: boolean
  availableModules: ModuleCapability[]
  flowLabels: string[]
  /** 全部可跳转节点名（含用户意图/触达输出） */
  nodeLabels?: string[]
  activeNodeLabel?: string
  activeApiSide?: 'input' | 'output' | null
  appName?: string
  inputApi?: FlowApiEndpoint | null
  outputApi?: FlowApiEndpoint | null
  onInsert: (mod: ModuleCapability) => void
  onInvoke: (side?: 'input' | 'output') => void
  onAnalyze: (text: string) => void
  onNote?: (text: string) => void
  onOpenNode?: (label: string, side?: 'input' | 'output') => void
  onStartTrial?: () => void
  onStopTrial?: () => void
  onPauseTrial?: () => void
  placeholder?: string
}

const QUICK: BizQuickChip[] = [
  { cat: 'design', label: '这个应用解决什么问题？', text: '这个应用解决什么问题' },
  { cat: 'design', label: '画一下完整用户旅程', text: '画一下完整用户旅程' },
  { cat: 'design', label: '梳理功能清单', text: '梳理功能清单' },
  { cat: 'dev', label: '当前流程有哪些模块？', text: '当前流程有哪些模块' },
  { cat: 'dev', label: '打开知识库问答', text: '打开知识库问答' },
  { cat: 'dev', label: '插入审批流', text: '插入 审批流' },
  { cat: 'dev', label: '复制当前 IN curl', text: '复制 curl' },
  { cat: 'test', label: '测试当前 IN 接口', text: '测试当前 IN' },
  { cat: 'test', label: '回归测一下 OUT', text: '测试 OUT' },
  { cat: 'test', label: '开始试运营验收', text: '开始试运营' },
  { cat: 'ops', label: '停止试运营', text: '停止试运营' },
  { cat: 'ops', label: '生成联调检查清单', text: '生成联调检查清单' },
]

function stripCmd(raw: string) {
  return raw.trim().replace(/^>+\s*/, '').trim()
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

function answerAsk(opts: {
  text: string
  flowLabels: string[]
  nodeLabels: string[]
  activeNodeLabel: string
  activeApiSide: 'input' | 'output' | null
  appName: string
}): string | null {
  const { text, flowLabels, nodeLabels, activeNodeLabel, activeApiSide, appName } = opts
  const chain = nodeLabels.length ? nodeLabels : ['用户意图', ...flowLabels, '触达输出']
  const sideHint = activeApiSide === 'output' ? 'OUT' : 'IN'

  if (/解决什么问题|价值主张|痛点/.test(text)) {
    return (
      `${appName || '本应用'}面向「问—查—约—缴」自助链路：\n` +
      `1) 用户意图进入 → 2) 知识库/科室结构化 → 3) 用药/复诊/报告 → 4) 缴费 → 5) 网页+App 触达。\n` +
      `目标：首响更快、少跑腿、关键节点可测可观测。`
    )
  }
  if (/用户旅程|完整旅程|用户路径/.test(text)) {
    return (
      `发现入口 → 描述症状(用户意图) → 查知识库 → 建议科室\n` +
      `→ 用药提醒 / 复诊预约 / 报告解读 → 缴费 → 触达输出。\n` +
      `卡点（意图不清 / 知识未命中 / 预约失败）均可在对应节点测 IN/OUT。`
    )
  }
  if (/功能清单|有哪些模块|当前流程/.test(text)) {
    return (
      `共 ${chain.length} 个节点：\n` +
      chain.map((x, i) => `${i + 1}. ${x}`).join('\n') +
      `\n\n功能轨/数据轨默认各展示 5 条，点「加载更多」看全量。`
    )
  }
  if (/联调检查|检查清单|验收清单/.test(text)) {
    return (
      `【设计】旅程与字段是否对齐需求？\n` +
      `【开发】各节点 IN 必填是否齐全？curl 是否可复现？\n` +
      `【测试】逐节点测 IN → 看 OUT；再「开始试运营」走全链路。\n` +
      `【发布】@公开 / 五端选择 / 我的应用列表可见。\n` +
      `【回归】停止 → 改一处模块 → 再测当前节点 → 再试运营。`
    )
  }
  if (/分析|风险|缺什么|可观测/.test(text)) {
    return (
      `节点：${chain.join(' → ')}\n` +
      `建议：为检索类节点补 citation 断言；预约类测占位失败降级；缴费测幂等与回执。\n` +
      `当前选中「${activeNodeLabel}」· ${sideHint}，可立刻：测试接口 / 复制 curl / 开始试运营。`
    )
  }
  return null
}

export default function FlowBizCommandInput({
  mutateLocked = false,
  disabled = false,
  availableModules,
  flowLabels,
  nodeLabels = [],
  activeNodeLabel = '用户意图',
  activeApiSide = 'input',
  appName = '',
  inputApi = null,
  outputApi = null,
  onInsert,
  onInvoke,
  onAnalyze,
  onNote,
  onOpenNode,
  onStartTrial,
  onStopTrial,
  onPauseTrial,
  placeholder = '>> 问项目 / 打开模块 / 测试 IN · 或点下方话术',
}: Props) {
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [hint, setHint] = useState('')

  const allNodeLabels = useMemo(() => {
    if (nodeLabels.length) return nodeLabels
    return ['用户意图', ...flowLabels, '触达输出']
  }, [nodeLabels, flowLabels])

  const filtered = useMemo(() => {
    const q = stripCmd(value).replace(/^(插入|加|添加)\s*/, '').trim()
    if (!q) return availableModules.slice(0, 6)
    return availableModules.filter((m) => m.label.includes(q)).slice(0, 6)
  }, [availableModules, value])

  const finish = (msg: string, clear = true) => {
    setHint(msg)
    if (clear) {
      setValue('')
      setMenuOpen(false)
    }
  }

  const run = (raw: string) => {
    if (disabled) return
    const text = stripCmd(raw || '当前流程有哪些模块')
    if (!text) return

    // —— 运行控制（锁定时也可停/暂停；开始需可编排）——
    if (/停止试运营|停止运行|先停一下|^停止$/.test(text)) {
      onStopTrial?.()
      finish('已停止试运营，可继续编排与测试')
      return
    }
    if (/暂停/.test(text)) {
      onPauseTrial?.()
      finish('已暂停试运营')
      return
    }
    if (/开始试运营|试运营验收|跑一遍|启动验收/.test(text)) {
      if (mutateLocked) {
        finish('请先停止当前试运营，再重新开始', false)
        return
      }
      onStartTrial?.()
      finish('已开始试运营 · 编辑与测试已锁定')
      return
    }

    // —— 跳转节点 ——
    for (const label of allNodeLabels) {
      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`(打开|选中|查看|定位到?)\\s*${esc}`).test(text) || text === label) {
        onOpenNode?.(label, 'input')
        finish(`已打开「${label}」，下方联动 IN/OUT`)
        return
      }
    }
    // 模糊匹配流程模块
    const openMatch = text.match(/^(?:打开|选中|查看|定位到?)\s*(.+)$/)
    if (openMatch) {
      const q = openMatch[1].trim()
      const hit =
        allNodeLabels.find((l) => l === q)
        ?? allNodeLabels.find((l) => l.includes(q))
        ?? flowLabels.find((l) => l.includes(q))
      if (hit) {
        onOpenNode?.(hit, 'input')
        finish(`已打开「${hit}」`)
        return
      }
    }

    // —— 接口 ——
    if (/测试\s*out|回归测.*out|测一下\s*out|测试\s*输出/i.test(text)) {
      if (mutateLocked) {
        finish('运行锁定中，请先停止后再测接口', false)
        return
      }
      onOpenNode?.(activeNodeLabel, 'output')
      onInvoke('output')
      finish('已测试当前节点 OUT')
      return
    }
    if (/^(调用|测试|测)(\s|$)/.test(text) || /测试|测接口|测一下\s*in|调用模块|联调/.test(text)) {
      if (mutateLocked) {
        finish('运行锁定中，请先停止后再测接口', false)
        return
      }
      onInvoke('input')
      finish('已测试当前节点 IN')
      return
    }
    if (/复制\s*curl|拷贝\s*curl|给我 curl/i.test(text)) {
      if (mutateLocked) {
        finish('运行锁定中，请先停止后再复制', false)
        return
      }
      const api = activeApiSide === 'output' ? outputApi : inputApi
      if (!api) {
        finish('请先选中一个节点', false)
        return
      }
      void copyText(buildApiCurl(api)).then(() => finish('已复制当前侧重侧 curl'))
      return
    }

    // —— 插入 ——
    if (/^(插入|加|添加)/.test(text) || /插入|添加模块|加一个/.test(text)) {
      if (mutateLocked) {
        finish('运行锁定中，请先停止后再插入模块', false)
        return
      }
      const rest = text
        .replace(/.*(插入|添加模块|加一个|加|添加)\s*/, '')
        .trim()
      const mod =
        availableModules.find((m) => m.label === rest)
        ?? availableModules.find((m) => rest && m.label.includes(rest))
        ?? availableModules.find((m) => m.label.includes('审批'))
      if (mod) {
        onInsert(mod)
        finish(`已插入「${mod.label}」`)
        return
      }
      setHint(rest ? `未找到模块「${rest}」` : '请输入要插入的模块名')
      setMenuOpen(true)
      return
    }

    // —— 项目问答 / 设计 / 开发 / 测试 ——
    const ask = answerAsk({
      text,
      flowLabels,
      nodeLabels: allNodeLabels,
      activeNodeLabel,
      activeApiSide,
      appName,
    })
    if (ask) {
      onAnalyze(ask)
      finish('已回答（见下方分析区）')
      return
    }

    if (/^分析/.test(text)) {
      const summary =
        text.replace(/^分析(功能)?\s*/, '').trim()
        || answerAsk({
          text: '分析',
          flowLabels,
          nodeLabels: allNodeLabels,
          activeNodeLabel,
          activeApiSide,
          appName,
        })!
      onAnalyze(summary)
      finish('已生成功能分析')
      return
    }

    if (/^(备注|说明|记下)\s*/.test(text)) {
      const note = text.replace(/^(备注|说明|记下)\s*/, '').trim()
      if (note && !mutateLocked) {
        onNote?.(note)
        finish('已写入节点说明')
        return
      }
    }

    // 默认：项目语境回答（有效、可马上跟进）
    const fallback =
      `已收到：「${text}」\n` +
      `当前节点「${activeNodeLabel}」· 侧重 ${activeApiSide === 'output' ? 'OUT' : 'IN'}。\n` +
      `可继续：功能清单 / 用户旅程 / 联调检查清单；或执行：打开某某模块 · 测试 IN · 复制 curl · 开始试运营。`
    onAnalyze(fallback)
    finish('已理解并回答')
  }

  return (
    <div className={`plaza-biz-cmd${mutateLocked ? ' is-locked' : ''}${disabled ? ' is-disabled' : ''}`}>
      {!disabled && (
        <div className="plaza-biz-cmd-chips" aria-label="内置话术">
          {QUICK.map((q) => (
            <button
              key={q.text}
              type="button"
              className={`plaza-biz-cmd-chip cat-${q.cat}`}
              onClick={() => run(q.text)}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      <div className="plaza-biz-cmd-row">
        <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={disabled ? '仅创建者可输入指令' : placeholder}
          aria-label="业务输入命令"
          onChange={(e) => {
            setValue(e.target.value)
            setMenuOpen(e.target.value.includes('>') || e.target.value.startsWith('>>'))
          }}
          onFocus={() => {
            if (!disabled && (value.startsWith('>>') || value === '')) setMenuOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              run(value || '当前流程有哪些模块')
            }
            if (e.key === 'Escape') setMenuOpen(false)
          }}
        />
        <button
          type="button"
          className="plaza-biz-cmd-go"
          disabled={disabled}
          onClick={() => run(value || '当前流程有哪些模块')}
        >
          执行
        </button>
      </div>

      {mutateLocked && (
        <p className="plaza-biz-cmd-lock">
          运行锁定中 · 可点「停止试运营」或问答话术；改模块/测接口需先停止
        </p>
      )}
      {!disabled && hint && <p className="plaza-biz-cmd-hint">{hint}</p>}

      {!disabled && menuOpen && !mutateLocked && (
        <div className="plaza-biz-cmd-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setValue('>>插入 '); setMenuOpen(true) }}>
            插入模块 · 在当前节点后加入
          </button>
          <button type="button" role="menuitem" onClick={() => run('>>调用')}>
            调用模块 · 测试当前 IN
          </button>
          <button type="button" role="menuitem" onClick={() => run('梳理功能清单')}>
            项目问答 · 梳理功能清单
          </button>
          {filtered.length > 0 && (
            <div className="plaza-biz-cmd-mods">
              {filtered.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => {
                    onInsert(m)
                    finish(`已插入「${m.label}」`)
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
