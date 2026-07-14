import { useEffect, useMemo, useRef, useState } from 'react'
import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID } from '../../lib/plazaModuleFlow'
import { getModuleCapability, type ModuleCapability } from '../../data/moduleCatalog'
import type { FlowApiNode } from '../../lib/flowModuleApis'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import FlowApiEndpointRow from './FlowApiEndpointRow'
import FlowBizCommandInput, { type FlowBizCommandHandle } from './FlowBizCommandInput'
import PlazaChevTrigger from './PlazaChevTrigger'
import type { PlazaChevAction } from './PlazaChevMenu'

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
  analysisText,
  onAddModule,
  onEditNote,
  onDelete,
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
  const isEndpoint = isIngress || isEgress
  const cap = activeStep ? getModuleCapability(activeStep.label) : null

  let title = '点击数据流中的模块'
  let desc = '在上方双轨选择节点；可编排态下可编辑、测试与 >> 命令'

  if (isIngress) {
    title = '业务输入'
    desc = '外部请求进入数据流 · 停止/编排态下可测 IN·OUT · 用 >> 插入/调用/分析'
  } else if (isEgress) {
    title = '触达输出'
    desc = '结果推送到网页/App · 可编排态下可测接口'
  } else if (activeStep) {
    title = activeStep.label
    desc = cap?.desc ?? activeStep.note
  }

  const chevActions = useMemo((): PlazaChevAction[] => {
    if (!canEdit) return []
    const items: PlazaChevAction[] = []
    if (!isEgress) {
      items.push({
        id: 'insert',
        label: isIngress ? '插入首模块' : '插入模块',
        onClick: onAddModule,
        disabled: availableModules.length === 0,
      })
    }
    if (activeApiNode) {
      items.push({
        id: 'invoke-in',
        label: isEgress ? '调用输出接口' : '调用模块',
        onClick: () => {
          if (isEgress) setTestOutputTrigger((n) => n + 1)
          else setTestInputTrigger((n) => n + 1)
        },
      })
      if (!isEndpoint) {
        items.push({
          id: 'invoke-out',
          label: '调用输出接口',
          onClick: () => setTestOutputTrigger((n) => n + 1),
        })
      }
    }
    if (activeStep && !isEndpoint) {
      items.push({ id: 'edit', label: '编辑说明', onClick: onEditNote })
      items.push({ id: 'delete', label: '删除模块', onClick: onDelete })
    }
    return items
  }, [
    canEdit,
    isEgress,
    isIngress,
    isEndpoint,
    activeApiNode,
    activeStep,
    availableModules.length,
    onAddModule,
    onEditNote,
    onDelete,
  ])

  return (
    <div
      className={`plaza-orch-dock${canEdit ? '' : ' is-run-locked'}`}
      role="complementary"
      aria-label="编排编辑区"
      data-active-node={activeNodeId ?? ''}
    >
      {isCreator ? (
        <PlazaChevTrigger
          actions={
            canEdit && chevActions.length > 0
              ? chevActions
              : [
                  {
                    id: 'unlock',
                    label:
                      run.phase === 'running' || run.phase === 'paused'
                        ? '停止并回到可编辑'
                        : '重置到就绪后可编辑',
                    onClick: () => {
                      if (run.phase === 'running' || run.phase === 'paused') run.stop()
                      else run.enterEditMode()
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

      {/* 业务输入始终保留；运行锁定仍可问答/停止，改模块/测接口需就绪 */}
      <FlowBizCommandInput
        ref={cmdRef}
        disabled={!isCreator}
        mutateLocked={mutateLocked}
        availableModules={availableModules}
        flowLabels={flowLabels}
        nodeLabels={nodeLabels}
        appName={appName}
        activeNodeLabel={
          isIngress ? '用户意图' : isEgress ? '触达输出' : activeStep?.label ?? activeApiNode?.label ?? '用户意图'
        }
        activeApiSide={activeApiSide}
        inputApi={activeApiNode?.input_api ?? null}
        outputApi={activeApiNode?.output_api ?? null}
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
          run.enterRunMode()
          run.start()
        }}
        onStopTrial={() => {
          run.stop()
          run.enterEditMode()
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
