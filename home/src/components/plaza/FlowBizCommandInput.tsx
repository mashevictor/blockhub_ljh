import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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

const QUICK_DEFS: Array<{ cat: BizQuickChip['cat']; labelKey: string }> = [
  { cat: 'design', labelKey: 'home.plaza.cmd.chip.problem' },
  { cat: 'design', labelKey: 'home.plaza.cmd.chip.journey' },
  { cat: 'design', labelKey: 'home.plaza.cmd.chip.features' },
  { cat: 'dev', labelKey: 'home.plaza.cmd.chip.modules' },
  { cat: 'dev', labelKey: 'home.plaza.cmd.chip.kb' },
  { cat: 'ops', labelKey: 'home.plaza.cmd.chip.runtime' },
  { cat: 'test', labelKey: 'home.plaza.cmd.chip.preview' },
  { cat: 'test', labelKey: 'home.plaza.cmd.chip.test' },
  { cat: 'ops', labelKey: 'home.plaza.cmd.chip.stop' },
  { cat: 'ops', labelKey: 'home.plaza.cmd.chip.checklist' },
]

/** 上海话应用 · >> 内置只读/预览话术（展示文案走 i18n；指令匹配仍兼容中英文） */
const SHANGHAI_QUICK_DEFS: Array<{ cat: BizQuickChip['cat']; labelKey: string }> = [
  { cat: 'dev', labelKey: 'home.plaza.cmd.sh.open_web' },
  { cat: 'test', labelKey: 'home.plaza.cmd.sh.test_voice' },
  { cat: 'test', labelKey: 'home.plaza.cmd.sh.test_asr' },
  { cat: 'test', labelKey: 'home.plaza.cmd.sh.try_hello' },
  { cat: 'ops', labelKey: 'home.plaza.cmd.sh.preview' },
  { cat: 'ops', labelKey: 'home.plaza.cmd.sh.stop' },
  { cat: 'design', labelKey: 'home.plaza.cmd.sh.howto' },
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
  activeNodeLabel,
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
  placeholder: placeholderProp,
}, ref) {
  const t = useT()
  const [value, setValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [hint, setHint] = useState('')

  const defaultPlaceholder = t('home.plaza.cmd.placeholder')
  const placeholder = placeholderProp ?? defaultPlaceholder
  const resolvedActiveNode = activeNodeLabel ?? t('home.plaza.cmd.intent')

  const quickChips = useMemo(
    (): BizQuickChip[] => QUICK_DEFS.map((d) => {
      const label = t(d.labelKey)
      return { cat: d.cat, label, text: label.replace(/[？?]$/, '') }
    }),
    [t],
  )
  const shanghaiChips = useMemo(
    (): BizQuickChip[] => SHANGHAI_QUICK_DEFS.map((d) => {
      const label = t(d.labelKey)
      return { cat: d.cat, label, text: label.replace(/[？?]$/, '') }
    }),
    [t],
  )
  const chips = commandProfile === 'shanghai' ? shanghaiChips : quickChips
  const voiceWeb = webUrl || '/agents/shanghai-voice'

  const intentLabel = t('home.plaza.cmd.intent')
  const outputLabel = t('home.plaza.cmd.output')
  const defaultModulesCmd = t('home.plaza.cmd.default_modules')
  const defaultHowtoCmd = t('home.plaza.cmd.default_howto')

  const allNodeLabels = useMemo(() => {
    if (nodeLabels.length) return nodeLabels
    return [intentLabel, ...flowLabels, outputLabel]
  }, [nodeLabels, flowLabels, intentLabel, outputLabel])

  const finish = (msg: string, clear = true) => {
    setHint(msg)
    if (clear) {
      setValue('')
      setMenuOpen(false)
    }
  }

  const runShanghai = (text: string): boolean => {
    if (commandProfile !== 'shanghai') return false

    if (/打开上海话网页|打开网页应用|Open Shanghainese web|open web app/i.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze(t('home.plaza.cmd.hint.sh.opened_web_analyze'))
      finish(t('home.plaza.cmd.hint.sh.opened_web'))
      return true
    }
    if (/测\s*voice|voice\s*配置|测配置|Test voice config/i.test(text)) {
      finish(t('home.plaza.cmd.hint.sh.testing_cfg'))
      void fetchVoiceConfig()
        .then((j) => {
          onAnalyze(
            t('home.plaza.cmd.hint.sh.real_cfg', {
              configured: String(j.configured),
              agent: j.agent_id,
              ws: j.ws_url || j.ws_path || '',
            }),
          )
          setHint(j.configured ? t('home.plaza.cmd.hint.sh.cfg_ok') : t('home.plaza.cmd.hint.sh.cfg_off'))
        })
        .catch((e: unknown) => {
          onAnalyze(t('home.plaza.cmd.hint.sh.cfg_fail_detail', {
            error: e instanceof Error ? e.message : String(e),
          }))
          setHint(t('home.plaza.cmd.hint.sh.cfg_fail'))
        })
      return true
    }
    if (/侬好|试一句|try\s*「?侬好」?/i.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze(t('home.plaza.cmd.hint.sh.try_hello_analyze'))
      finish(t('home.plaza.cmd.hint.sh.try_hello'))
      return true
    }
    if (/查审批|例句[·・]?查|approval sample/i.test(text)) {
      window.open(voiceWeb, '_blank', 'noopener')
      onAnalyze(t('home.plaza.cmd.hint.sh.approval_analyze'))
      finish(t('home.plaza.cmd.hint.sh.approval'))
      return true
    }
    if (/跑上海话冒烟|上海话冒烟|跑冒烟|真链路冒烟|real-path smoke|run smoke/i.test(text)) {
      finish(t('home.plaza.cmd.hint.sh.smoke_busy'))
      void runShanghaiVoiceSmoke(t).then((r) => {
        onAnalyze(r.summary)
        setHint(r.ok ? t('home.plaza.cmd.hint.sh.smoke_ok') : t('home.plaza.cmd.hint.sh.smoke_fail'))
      })
      return true
    }
    if (/测\s*ASR|ASR\s*鉴权|auth-probe|鉴权|Test ASR auth/i.test(text)) {
      finish(t('home.plaza.cmd.hint.sh.asr_busy'))
      void api.get<{ ok?: boolean }>('/voice/auth-probe')
        .then((res) => {
          onAnalyze(t('home.plaza.cmd.hint.sh.real_auth', {
            body: JSON.stringify(res.data, null, 2).slice(0, 500),
          }))
          setHint(res.data.ok ? t('home.plaza.cmd.hint.sh.asr_ok') : t('home.plaza.cmd.hint.sh.asr_fail'))
        })
        .catch((e: unknown) => {
          onAnalyze(t('home.plaza.cmd.hint.sh.asr_fail_detail', {
            error: e instanceof Error ? e.message : String(e),
          }))
          setHint(t('home.plaza.cmd.hint.sh.asr_err'))
        })
      return true
    }
    return false
  }

  const run = (raw: string) => {
    if (disabled) return
    const text = stripCmd(raw || (commandProfile === 'shanghai' ? defaultHowtoCmd : defaultModulesCmd))
    if (!text) return

    if (runShanghai(text)) return

    // —— 流程预览控制（不写库）——
    if (/停止预览|停止试运营|停止运行|先停一下|^停止$|Stop preview|stop trial/i.test(text)) {
      onStopTrial?.()
      finish(t('home.plaza.cmd.hint.stop'))
      return
    }
    if (/暂停|Pause/i.test(text)) {
      onPauseTrial?.()
      finish(t('home.plaza.cmd.hint.stop'))
      return
    }
    if (/流程预览|开始试运营|试运营验收|跑一遍|启动验收|Flow preview|start preview/i.test(text)) {
      onStartTrial?.()
      finish(t('home.plaza.cmd.hint.start'))
      return
    }
    if (/打开\s*Runtime|去\s*Runtime|对话改页|Open Runtime|compose-edit/i.test(text)) {
      if (webUrl) {
        window.open(webUrl, '_blank', 'noopener,noreferrer')
        finish(t('home.plaza.cmd.hint.runtime'))
      } else {
        finish(t('home.plaza.cmd.hint.no_runtime'), false)
      }
      return
    }

    // —— 跳转节点 ——
    for (const label of allNodeLabels) {
      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (new RegExp(`(打开|选中|查看|定位到?|open|select|view|go to)\\s*${esc}`, 'i').test(text) || text === label) {
        onOpenNode?.(label, 'input')
        finish(t('home.plaza.cmd.hint.open_node', { label }))
        return
      }
    }
    // 模糊匹配流程模块
    const openMatch = text.match(/^(?:打开|选中|查看|定位到?|open|select|view|go to)\s*(.+)$/i)
    if (openMatch) {
      const q = openMatch[1].trim()
      const hit =
        allNodeLabels.find((l) => l === q)
        ?? allNodeLabels.find((l) => l.includes(q))
        ?? flowLabels.find((l) => l.includes(q))
      if (hit) {
        onOpenNode?.(hit, 'input')
        finish(t('home.plaza.cmd.hint.open_node_short', { label: hit }))
        return
      }
    }

    // —— 接口测试 / curl：广场允许 ——
    if (/测试\s*out|回归测.*out|测一下\s*out|测试\s*输出|test\s*out/i.test(text)) {
      onInvoke('output')
      finish(t('home.plaza.cmd.hint.out_test'))
      return
    }
    if (/^(调用|测试|测|test|invoke)(\s|$)/i.test(text) || /测试|测接口|测一下\s*in|调用模块|联调|test api/i.test(text)) {
      onInvoke(/out|输出/i.test(text) ? 'output' : 'input')
      finish(t('home.plaza.cmd.hint.api_test'))
      return
    }
    if (/复制\s*curl|拷贝\s*curl|给我 curl|copy\s*curl/i.test(text)) {
      const sideApi = activeApiSide === 'output' ? outputApi : inputApi
      if (!sideApi) {
        finish(t('home.plaza.cmd.hint.need_node'), false)
        return
      }
      void copyText(buildApiCurl(sideApi)).then(() => finish(t('home.plaza.cmd.hint.curl_copied')))
      return
    }

    // —— 插入：禁止改结构 ——
    if (/^(插入|加|添加)/.test(text) || /插入|添加模块|加一个|insert module|add module/i.test(text)) {
      finish(t('home.plaza.cmd.hint.structure'), false)
      return
    }

    if (/^(备注|记下)\s*/.test(text)) {
      finish(t('home.plaza.cmd.hint.structure'), false)
      return
    }

    // —— 未命中动作指令：一律走大模型（带上模块/节点上下文）——
    finish(t('home.plaza.cmd.hint.analyzing'))
    void askFlowQuestion({
      question: text,
      appName,
      modules: flowLabels,
      nodes: allNodeLabels,
      activeNode: resolvedActiveNode,
      activeSide: activeApiSide,
    })
      .then((res) => {
        onAnalyze(
          res.source === 'deepseek'
            ? res.answer
            : `${res.answer}\n\n${t('home.plaza.cmd.hint.fallback_src')}`,
        )
        setHint(
          res.source === 'deepseek'
            ? t('home.plaza.cmd.hint.answered_llm')
            : t('home.plaza.cmd.hint.answered_fallback'),
        )
      })
      .catch((e: unknown) => {
        onAnalyze(t('home.plaza.cmd.hint.ask_fail_detail', {
          error: e instanceof Error ? e.message : String(e),
        }))
        setHint(t('home.plaza.cmd.hint.ask_fail'))
      })
  }

  useImperativeHandle(ref, () => ({ execute: run }), [
    disabled,
    mutateLocked,
    allNodeLabels,
    flowLabels,
    resolvedActiveNode,
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
    t,
  ])

  return (
    <div className={`plaza-biz-cmd${mutateLocked ? ' is-locked' : ''}${disabled ? ' is-disabled' : ''}${commandProfile === 'shanghai' ? ' is-shanghai' : ''}`}>
      {!disabled && (
        <div className="plaza-biz-cmd-chips" aria-label={commandProfile === 'shanghai' ? t('home.plaza.cmd.chips_shanghai') : t('home.plaza.cmd.chips_aria')}>
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
          placeholder={disabled ? t('home.plaza.cmd.disabled') : placeholder}
          aria-label={t('home.plaza.cmd.placeholder')}
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
              run(value || defaultModulesCmd)
            }
            if (e.key === 'Escape') setMenuOpen(false)
          }}
        />
        <button
          type="button"
          className="plaza-biz-cmd-go"
          disabled={disabled}
          onClick={() => run(value || defaultModulesCmd)}
        >
          {t('home.plaza.cmd.execute')}
        </button>
      </div>

      {!disabled && hint && <p className="plaza-biz-cmd-hint">{hint}</p>}

      {!disabled && menuOpen && (
        <div className="plaza-biz-cmd-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => run('打开 Runtime')}>
            {t('home.plaza.cmd.chip.runtime')}
          </button>
          <button type="button" role="menuitem" onClick={() => run('流程预览')}>
            {t('home.plaza.cmd.chip.preview')}
          </button>
          <button type="button" role="menuitem" onClick={() => run('梳理功能清单')}>
            {t('home.plaza.cmd.chip.features')}
          </button>
          <button type="button" role="menuitem" onClick={() => run(defaultModulesCmd)}>
            {t('home.plaza.cmd.chip.modules')}
          </button>
        </div>
      )}
    </div>
  )
})

export default FlowBizCommandInput
