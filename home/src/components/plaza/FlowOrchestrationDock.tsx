import { useEffect, useRef, useState } from 'react'
import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID } from '../../lib/plazaModuleFlow'
import { getModuleCapability, type ModuleCapability } from '../../data/moduleCatalog'
import type { FlowApiNode } from '../../lib/flowModuleApis'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import FlowApiEndpointRow from './FlowApiEndpointRow'
import FlowBizCommandInput, { type FlowBizCommandHandle } from './FlowBizCommandInput'
import PlazaChevTrigger from './PlazaChevTrigger'

interface Props {
  activeNodeId: string | null
  activeStep: ModuleFlowStep | null
  activeApiNode: FlowApiNode | null
  activeApiSide: 'input' | 'output' | null
  isCreator: boolean
  pickerOpen: boolean
  availableModules: ModuleCapability[]
  flowLabels: string[]
  /** 含入口/出口，供指令「打开 xxx」 */
  nodeLabels?: string[]
  appName?: string
  appKey?: string
  webUrl?: string
  commandProfile?: 'default' | 'shanghai'
  analysisText?: string
  onAddModule: () => void
  onEditNote: () => void
  onDelete: () => void
  onPickModule: (mod: ModuleCapability) => void
  onClosePicker: () => void
  onInsertModule: (mod: ModuleCapability) => void
  onSaveNote?: (note: string) => void
  onAnalyze?: (text: string) => void
  onOpenNodeByLabel?: (label: string, side?: 'input' | 'output') => void
}

export default function FlowOrchestrationDock({
  activeNodeId,
  activeStep,
  activeApiNode,
  activeApiSide,
  isCreator,
  pickerOpen,
  availableModules,
  flowLabels,
  nodeLabels,
  appName = '',
  appKey = '',
  webUrl = '',
  commandProfile = 'default',
  analysisText,
  onAddModule: _onAddModule,
  onEditNote: _onEditNote,
  onDelete: _onDelete,
  onPickModule,
  onClosePicker,
  onInsertModule,
  onSaveNote,
  onAnalyze,
  onOpenNodeByLabel,
}: Props) {
  const run = usePlazaFlowRun()
  const { registerCommandRunner } = usePlazaFocus()
  const cmdRef = useRef<FlowBizCommandHandle>(null)
  const [testInputTrigger, setTestInputTrigger] = useState(0)
  const [testOutputTrigger, setTestOutputTrigger] = useState(0)
  const [localAnalysis, setLocalAnalysis] = useState('')

  const canEdit = isCreator && run.canEdit
  const canTest = isCreator && run.canTestApi
  const mutateLocked = isCreator && !run.canEdit

  useEffect(() => {
    registerCommandRunner((cmd) => {
      cmdRef.current?.execute(cmd)
    })
    return () => registerCommandRunner(null)
  }, [registerCommandRunner])

  const isIngress = activeNodeId === FLOW_INGRESS_ID
  const isEgress = activeNodeId === FLOW_EGRESS_ID
  const cap = activeStep ? getModuleCapability(activeStep.label) : null

  let title = '点击数据流中的模块'
  let desc = '在上方双轨选择节点查看说明；增删改请打开 Runtime'

  if (isIngress) {
    title = '业务输入'
    desc = '外部请求进入数据流 · 只读查看 IN/OUT 契约 · 用 >> 问答或打开 Runtime'
  } else if (isEgress) {
    title = '触达输出'
    desc = '结果推送到网页/App · 只读查看接口契约'
  } else if (activeStep) {
    title = activeStep.label
    desc = cap?.desc ?? activeStep.note
  }

  return (
    <div
      className={`plaza-orch-dock${canEdit ? '' : ' is-run-locked'}`}
      role="complementary"
      aria-label="应用概览编辑区"
      data-active-node={activeNodeId ?? ''}
    >
      {isCreator ? (
        <PlazaChevTrigger
          actions={
            webUrl
              ? [
                  {
                    id: 'runtime',
                    label: '打开 Runtime 对话改页',
                    onClick: () => window.open(webUrl, '_blank', 'noopener,noreferrer'),
                  },
                  {
                    id: 'preview',
                    label:
                      run.phase === 'running' || run.phase === 'paused'
                        ? '停止流程预览'
                        : '开始流程预览',
                    onClick: () => {
                      if (run.phase === 'running' || run.phase === 'paused') {
                        run.stop()
                        run.enterOverviewMode()
                      } else {
                        run.enterPreviewMode()
                        run.start()
                      }
                    },
                  },
                ]
              : [
                  {
                    id: 'preview',
                    label:
                      run.phase === 'running' || run.phase === 'paused'
                        ? '停止流程预览'
                        : '开始流程预览',
                    onClick: () => {
                      if (run.phase === 'running' || run.phase === 'paused') {
                        run.stop()
                        run.enterOverviewMode()
                      } else {
                        run.enterPreviewMode()
                        run.start()
                      }
                    },
                  },
                ]
          }
          className="plaza-orch-dock-chev-trigger"
        />
      ) : (
        <div className="plaza-orch-dock-chev" aria-hidden>&gt;&gt;</div>
      )}
      <div className="plaza-orch-dock-body">
        <strong>{title}</strong>
        <span>{desc}</span>
        {activeApiNode && (
          <em className="plaza-orch-dock-linkhint">
            已联动 · {activeApiNode.label}
            {activeApiSide === 'input' ? ' · 侧重 IN' : activeApiSide === 'output' ? ' · 侧重 OUT' : ''}
          </em>
        )}
      </div>

      {/* 业务输入：只读概览下仍可问答 / 预览 / 打开 Runtime */}
      <FlowBizCommandInput
        ref={cmdRef}
        disabled={!isCreator}
        mutateLocked={mutateLocked}
        availableModules={availableModules}
        flowLabels={flowLabels}
        nodeLabels={nodeLabels}
        appName={appName}
        appKey={appKey}
        webUrl={webUrl}
        commandProfile={commandProfile}
        activeNodeLabel={
          isIngress ? '用户意图' : isEgress ? '触达输出' : activeStep?.label ?? activeApiNode?.label ?? '用户意图'
        }
        activeApiSide={activeApiSide}
        inputApi={activeApiNode?.input_api ?? null}
        outputApi={activeApiNode?.output_api ?? null}
        placeholder={
          commandProfile === 'shanghai'
            ? '>> 测 voice 配置 · 试一句侬好 · 跑上海话冒烟'
            : '>> 询问应用、打开能力，或点下方常用指令'
        }
        onInsert={onInsertModule}
        onInvoke={(side) => {
          if (!canTest) return
          if (side === 'output' || isEgress) setTestOutputTrigger((n) => n + 1)
          else setTestInputTrigger((n) => n + 1)
        }}
        onAnalyze={(text) => {
          setLocalAnalysis(text)
          onAnalyze?.(text)
        }}
        onNote={(text) => {
          if (text && isCreator && canEdit) onSaveNote?.(text)
        }}
        onOpenNode={onOpenNodeByLabel}
        onStartTrial={() => {
          run.enterPreviewMode()
          run.start()
        }}
        onStopTrial={() => {
          run.stop()
          run.enterOverviewMode()
        }}
        onPauseTrial={() => run.pause()}
      />

      {(analysisText || localAnalysis) && (
        <div className="plaza-orch-analysis" role="status">
          <strong>指令结果</strong>
          <p>{analysisText || localAnalysis}</p>
        </div>
      )}

      {activeApiNode ? (
        <div className="plaza-orch-dock-api">
          <FlowApiEndpointRow
            title="IN"
            api={activeApiNode.input_api}
            variant="input"
            highlighted={activeApiSide === 'input'}
            compact
            showFields
            testTrigger={testInputTrigger}
            testDisabled={!canTest}
          />
          <FlowApiEndpointRow
            title="OUT"
            api={activeApiNode.output_api}
            variant="output"
            highlighted={activeApiSide === 'output'}
            compact
            showFields
            testTrigger={testOutputTrigger}
            testDisabled={!canTest}
          />
        </div>
      ) : (
        <p className="plaza-orch-dock-empty">点击上方功能轨或数据轨节点，下方将显示该节点的输入/输出字段</p>
      )}

      {pickerOpen && canEdit && (
        <div className="plaza-orch-dock-picker">
          <div className="plaza-orch-dock-picker-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span>
            <strong>{isIngress ? '插入首模块' : '插入模块'}</strong>
            <button type="button" className="plaza-mflow-picker-close" onClick={onClosePicker} aria-label="关闭">×</button>
          </div>
          {availableModules.length === 0 ? (
            <p className="plaza-mflow-picker-empty">推荐模块已全部添加</p>
          ) : (
            <div className="plaza-orch-dock-picker-grid">
              {availableModules.slice(0, 6).map((mod) => (
                <button
                  key={mod.label}
                  type="button"
                  className="plaza-mflow-picker-item"
                  onClick={() => onPickModule(mod)}
                >
                  <span className="plaza-mflow-picker-icon" aria-hidden>{mod.icon}</span>
                  <span className="plaza-mflow-picker-label">{mod.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
