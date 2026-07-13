import type { ModuleFlowStep } from '../../lib/plazaModuleFlow'
import { FLOW_EGRESS_ID, FLOW_INGRESS_ID } from '../../lib/plazaModuleFlow'
import { getModuleCapability, type ModuleCapability } from '../../data/moduleCatalog'
import type { FlowApiNode } from '../../lib/flowModuleApis'
import FlowApiEndpointRow from './FlowApiEndpointRow'

interface Props {
  activeNodeId: string | null
  activeStep: ModuleFlowStep | null
  activeApiNode: FlowApiNode | null
  activeApiSide: 'input' | 'output' | null
  isCreator: boolean
  pickerOpen: boolean
  availableModules: ModuleCapability[]
  onAddModule: () => void
  onEditNote: () => void
  onDelete: () => void
  onPickModule: (mod: ModuleCapability) => void
  onClosePicker: () => void
}

export default function FlowOrchestrationDock({
  activeNodeId,
  activeStep,
  activeApiNode,
  activeApiSide,
  isCreator,
  pickerOpen,
  availableModules,
  onAddModule,
  onEditNote,
  onDelete,
  onPickModule,
  onClosePicker,
}: Props) {
  const isIngress = activeNodeId === FLOW_INGRESS_ID
  const isEgress = activeNodeId === FLOW_EGRESS_ID
  const isEndpoint = isIngress || isEgress
  const cap = activeStep ? getModuleCapability(activeStep.label) : null

  let title = '点击数据流中的模块'
  let desc = '在上方完整数据流里选择节点，在此编排添加、编辑与拨通'

  if (isIngress) {
    title = '业务输入'
    desc = '外部请求由此进入应用数据流 · 下方可测试 IN/OUT 接口'
  } else if (isEgress) {
    title = '触达输出'
    desc = '处理结果推送到网页、手机或消息通知 · 下方可测试 IN/OUT 接口'
  } else if (activeStep) {
    title = activeStep.label
    desc = cap?.desc ?? activeStep.note
  }

  return (
    <div className="plaza-orch-dock" role="complementary" aria-label="编排悬浮框">
      <div className="plaza-orch-dock-chev" aria-hidden>&gt;&gt;</div>
      <div className="plaza-orch-dock-body">
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      {isCreator && isIngress && (
        <div className="plaza-orch-dock-actions">
          <button type="button" className="btn-primary-sm" onClick={onAddModule}>
            <span className="plaza-mflow-chev">&gt;</span> 添加首模块
          </button>
        </div>
      )}
      {isCreator && activeStep && !isEndpoint && (
        <div className="plaza-orch-dock-actions">
          <button type="button" className="btn-primary-sm" onClick={onAddModule}>
            <span className="plaza-mflow-chev">&gt;</span> 添加模块
          </button>
          <button type="button" className="btn-ghost-sm" onClick={onEditNote}>编辑说明</button>
          <button type="button" className="btn-ghost-sm" onClick={onDelete}>删除</button>
        </div>
      )}

      {activeApiNode && (
        <div className="plaza-orch-dock-api">
          <FlowApiEndpointRow
            title="IN"
            api={activeApiNode.input_api}
            variant="input"
            highlighted={activeApiSide === 'input'}
            compact
          />
          <FlowApiEndpointRow
            title="OUT"
            api={activeApiNode.output_api}
            variant="output"
            highlighted={activeApiSide === 'output'}
            compact
          />
        </div>
      )}

      {pickerOpen && (
        <div className="plaza-orch-dock-picker">
          <div className="plaza-orch-dock-picker-head">
            <span className="plaza-mflow-chev">&gt;&gt;</span>
            <strong>选择模块</strong>
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
