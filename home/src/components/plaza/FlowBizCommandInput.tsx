import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import type { ModuleCapability } from '../../data/moduleCatalog'
import { api, askFlowQuestion, fetchVoiceConfig } from '../../api/client'
import { buildApiCurl, type FlowApiEndpoint } from '../../lib/flowModuleApis'
import { runShanghaiVoiceSmoke } from '../../lib/shanghaiVoiceSmoke'

export interface FlowBizCommandHandle {
  execute: (raw: string) => void
}

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
  appKey?: string
  webUrl?: string
  commandProfile?: 'default' | 'shanghai'
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
  { cat: 'ops', label: '打开 Runtime 改页', text: '打开 Runtime' },
  { cat: 'test', label: '流程预览走一遍', text: '流程预览' },
  { cat: 'test', label: '测一下当前接口', text: '测试' },
  { cat: 'ops', label: '停止预览', text: '停止预览' },
  { cat: 'ops', label: '生成联调检查清单', text: '生成联调检查清单' },
]

/** 上海话应用 · >> 内置只读/预览话术 */
const SHANGHAI_QUICK: BizQuickChip[] = [
  { cat: 'dev', label: '打开上海话网页', text: '打开上海话网页' },
  { cat: 'test', label: '测 voice 配置', text: '测 voice 配置' },
  { cat: 'test', label: '测 ASR 鉴权', text: '测 ASR 鉴权' },
  { cat: 'test', label: '试一句「侬好」', text: '试一句侬好' },
  { cat: 'ops', label: '流程预览', text: '流程预览' },
  { cat: 'ops', label: '停止预览', text: '停止预览' },
  { cat: 'design', label: '怎么测上海话？', text: '怎么测上海话' },
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

const FlowBizCommandInput = forwardRef<FlowBizCommandHandle, Props>(function FlowBizCommandInput({
  mutateLocked = false,
  disabled = false,
  availableModules: _availableModules,
  flowLabels,
  nodeLabels = [],
  activeNodeLabel = '用户意图',
  activeApiSide = 'input',
  appName = '',
  appKey = '',
  webUrl = '',
  commandProfile = 'default',
  inputApi = null,
  outputApi = null,
  onInsert: _onInsert,
  onInvoke,
  onAnalyze,
  onNote: _onNote,
  onOpenNode,
  onStartTrial,
  onStopTrial,
  onPauseTrial,
  placeholder = '>> 询问应用、打开能力，或点下方常用指令',
}, ref) {
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [hint, setHint] = useState('')

  const chips = commandProfile === 'shanghai' ? SHANGHAI_QUICK : QUICK
  const voiceWeb = webUrl || '/agents/shanghai-voice'

  const allNodeLabels = useMemo(() => {
    if (nodeLabels.length) return nodeLabels
    return ['用户意图', ...flowLabels, '触达输出']
  }, [nodeLabels, flowLabels])

  const finish = (msg: string, clear = true) => {
    setHint(msg)
    if (clear) {
      setValue('')
      setMenuOpen(false)
    }
  }

  const runShanghai = (text: string): boolean => {
    if (commandProfile !== 'shanghai') return false

    if (/打开上海话网页|打开网页应用/.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze('已打开上海话网页应用')
      finish('已打开上海话网页')
      return true
    }
    if (/测\s*voice|voice\s*配置|测配置/.test(text)) {
      finish('正在测 voice/config…')
      void fetchVoiceConfig()
        .then((j) => {
          onAnalyze(
            `【真链路】voice/config\nconfigured: ${j.configured}\nagent: ${j.agent_id}\nws: ${j.ws_url || j.ws_path}`,
          )
          setHint(j.configured ? 'voice 已配置' : 'voice 未配置')
        })
        .catch((e: unknown) => {
          onAnalyze(`voice/config 失败：${e instanceof Error ? e.message : String(e)}`)
          setHint('voice 检测失败')
        })
      return true
    }
    if (/侬好|试一句/.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze('【例句】侬好，阿拉想试试上海话语音助手\n已打开网页，请点例句或开麦对练。')
      finish('已打开网页 · 试一句侬好')
      return true
    }
    if (/查审批|例句[·・]?查/.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze('【例句】帮吾查一查今朝有啥审批要处理\n已打开网页，请点例句或开麦。')
      finish('已打开网页 · 查审批例句')
      return true
    }
    if (/跑上海话冒烟|上海话冒烟|跑冒烟|真链路冒烟/.test(text)) {
      finish('真链路冒烟检测中…')
      void runShanghaiVoiceSmoke().then((r) => {
        onAnalyze(r.summary)
        setHint(r.ok ? '冒烟通过' : '冒烟有失败项')
      })
      return true
    }
    if (/测\s*ASR|ASR\s*鉴权|auth-probe|鉴权/.test(text)) {
      finish('正在测 ASR 鉴权…')
      void api.get<{ ok?: boolean }>('/voice/auth-probe')
        .then((res) => {
          onAnalyze(`【真链路】auth-probe\n${JSON.stringify(res.data, null, 2).slice(0, 500)}`)
          setHint(res.data.ok ? 'ASR 鉴权 OK' : 'ASR 鉴权失败')
        })
        .catch((e: unknown) => {
          onAnalyze(`auth-probe 失败：${e instanceof Error ? e.message : String(e)}`)
          setHint('鉴权失败')
        })
      return true
    }
    return false
  }

  const run = (raw: string) => {
    if (disabled) return
    const text = stripCmd(raw || (commandProfile === 'shanghai' ? '怎么测上海话' : '当前流程有哪些模块'))
    if (!text) return

    if (runShanghai(text)) return

    // —— 流程预览控制（不写库）——
    if (/停止预览|停止试运营|停止运行|先停一下|^停止$/.test(text)) {
      onStopTrial?.()
      finish('已停止流程预览')
      return
    }
    if (/暂停/.test(text)) {
      onPauseTrial?.()
      finish('已暂停流程预览')
      return
    }
    if (/流程预览|开始试运营|试运营验收|跑一遍|启动验收/.test(text)) {
      onStartTrial?.()
      finish('已开始流程预览（本地动画，不改 Runtime）')
      return
    }
    if (/打开\s*Runtime|去\s*Runtime|对话改页/.test(text)) {
      if (webUrl) {
        window.open(webUrl, '_blank', 'noopener,noreferrer')
        finish('已打开 Runtime · 请在对话改页做增删改')
      } else {
        finish('暂无 Runtime 链接', false)
      }
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

    // —— 接口测试 / curl：广场允许 ——
    if (/测试\s*out|回归测.*out|测一下\s*out|测试\s*输出/i.test(text)) {
      onInvoke('output')
      finish('已触发 OUT 接口测试')
      return
    }
    if (/^(调用|测试|测)(\s|$)/.test(text) || /测试|测接口|测一下\s*in|调用模块|联调/.test(text)) {
      onInvoke(/out|输出/i.test(text) ? 'output' : 'input')
      finish('已触发接口测试')
      return
    }
    if (/复制\s*curl|拷贝\s*curl|给我 curl/i.test(text)) {
      const api = activeApiSide === 'output' ? outputApi : inputApi
      if (!api) {
        finish('请先选中一个节点', false)
        return
      }
      void copyText(buildApiCurl(api)).then(() => finish('已复制当前侧重侧 curl'))
      return
    }

    // —— 插入：禁止改结构 ——
    if (/^(插入|加|添加)/.test(text) || /插入|添加模块|加一个/.test(text)) {
      finish('增删模块请打开 Runtime 对话改页（本页不可改结构）', false)
      return
    }

    if (/^(备注|记下)\s*/.test(text)) {
      finish('改节点说明请打开 Runtime 对话改页', false)
      return
    }

    // —— 未命中动作指令：一律走大模型（带上模块/节点上下文）——
    finish('大模型分析中…')
    void askFlowQuestion({
      question: text,
      appName,
      modules: flowLabels,
      nodes: allNodeLabels,
      activeNode: activeNodeLabel,
      activeSide: activeApiSide,
    })
      .then((res) => {
        onAnalyze(
          res.source === 'deepseek'
            ? res.answer
            : `${res.answer}\n\n（来源：兜底 · 请确认服务器已配置大模型密钥）`,
        )
        setHint(res.source === 'deepseek' ? '已回答（大模型）' : '已回答（兜底）')
      })
      .catch((e: unknown) => {
        onAnalyze(`问答失败：${e instanceof Error ? e.message : String(e)}`)
        setHint('问答失败')
      })
  }

  useImperativeHandle(ref, () => ({ execute: run }), [
    disabled,
    mutateLocked,
    allNodeLabels,
    flowLabels,
    activeNodeLabel,
    activeApiSide,
    appName,
    appKey,
    webUrl,
    commandProfile,
    inputApi,
    outputApi,
    onInvoke,
    onAnalyze,
    onOpenNode,
    onStartTrial,
    onStopTrial,
    onPauseTrial,
  ])

  return (
    <div className={`plaza-biz-cmd${mutateLocked ? ' is-locked' : ''}${disabled ? ' is-disabled' : ''}${commandProfile === 'shanghai' ? ' is-shanghai' : ''}`}>
      {!disabled && (
        <div className="plaza-biz-cmd-chips" aria-label={commandProfile === 'shanghai' ? '上海话内置测试' : '内置话术'}>
          {chips.map((q) => (
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

      {!disabled && hint && <p className="plaza-biz-cmd-hint">{hint}</p>}

      {!disabled && menuOpen && (
        <div className="plaza-biz-cmd-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => run('打开 Runtime')}>
            打开 Runtime · 对话改页
          </button>
          <button type="button" role="menuitem" onClick={() => run('流程预览')}>
            流程预览 · 本地步进动画
          </button>
          <button type="button" role="menuitem" onClick={() => run('梳理功能清单')}>
            项目问答 · 梳理功能清单
          </button>
          <button type="button" role="menuitem" onClick={() => run('当前流程有哪些模块')}>
            查看当前模块链
          </button>
        </div>
      )}
    </div>
  )
})

export default FlowBizCommandInput
