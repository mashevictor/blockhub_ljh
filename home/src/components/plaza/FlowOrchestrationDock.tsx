import { useEffect, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
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

  let title = t('home.plaza.dock.title_empty')
  let desc = t('home.plaza.dock.desc_empty')

  if (isIngress) {
    title = t('home.plaza.dock.title_ingress')
    desc = t('home.plaza.dock.desc_ingress')
  } else if (isEgress) {
    title = t('home.plaza.dock.title_egress')
    desc = t('home.plaza.dock.desc_egress')
  } else if (activeStep) {
    title = activeStep.label
    desc = cap?.desc ?? activeStep.note
  }

  return (
    <div
      className={`plaza-orch-dock${canEdit ? '' : ' is-run-locked'}`}
      role="complementary"
      aria-label={t('home.plaza.dock.aria')}
      data-active-node={activeNodeId ?? ''}
    >
      {isCreator ? (
        <PlazaChevTrigger
          actions={
            webUrl
              ? [
                  {
                    id: 'runtime',
                    label: t('home.plaza.dock.runtime_edit'),
                    onClick: () => window.open(webUrl, '_blank', 'noopener,noreferrer'),
                  },
                  {
                    id: 'preview',
                    label:
                      run.phase === 'running' || run.phase === 'paused'
                        ? t('home.plaza.dock.stop_preview')
                        : t('home.plaza.dock.start_preview'),
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
                        ? t('home.plaza.dock.stop_preview')
                        : t('home.plaza.dock.start_preview'),
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
            {t('home.plaza.dock.linked', { label: activeApiNode.label })}
            {activeApiSide === 'input'
              ? t('home.plaza.dock.side_in')
              : activeApiSide === 'output'
                ? t('home.plaza.dock.side_out')
                : ''}
          </em>
        )}
      </div>

      {/* 业务输入：可问答 / 测接口 / 预览；不可改模块结构 */}
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
          isIngress
            ? t('home.plaza.cmd.intent')
            : isEgress
              ? t('home.plaza.cmd.output')
              : activeStep?.label ?? activeApiNode?.label ?? t('home.plaza.cmd.intent')
        }
        activeApiSide={activeApiSide}
        inputApi={activeApiNode?.input_api ?? null}
        outputApi={activeApiNode?.output_api ?? null}
        placeholder={
          commandProfile === 'shanghai'
            ? t('home.plaza.dock.ph_shanghai')
            : t('home.plaza.cmd.placeholder')
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
          <strong>{t('home.plaza.dock.result')}</strong>
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
        <p className="plaza-orch-dock-empty">{t('home.plaza.dock.empty_api')}</p>
      )}

      {pickerOpen && canEdit && (
        <div className="plaza-orch-dock-picker">
          <div className="plaza-orch-dock-picker-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span>
            <strong>{isIngress ? t('home.plaza.dock.insert_first') : t('home.plaza.dock.insert')}</strong>
            <button type="button" className="plaza-mflow-picker-close" onClick={onClosePicker} aria-label={t('home.plaza.orch.close')}>×</button>
          </div>
          {availableModules.length === 0 ? (
            <p className="plaza-mflow-picker-empty">{t('home.plaza.dock.picker_empty')}</p>
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
