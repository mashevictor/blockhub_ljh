/** 首页 Hero 悬浮框 · 默认演示（积木仓 + 意图匹配） */

import type { SuggestValidation } from '../api/client'
import { pickToModule, type PromptModule } from '../components/agentInputLogic'
import type { SuggestItem } from './promptSuggest'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE } from './showcase'

export const HERO_DOCK_DEMO_SESSION_KEY = 'tc-hero-dock-demo-dismissed'

export const HERO_DOCK_DEMO_PROMPT =
  '积木仓：制造工厂库存盘点，入库出库走审批，异常要通知车间和财务'

export const HERO_DOCK_DEMO_PROBLEM = {
  title: '问题理解',
  body: '制造工厂需要定期做库存盘点，入库出库要有审批留痕；出现缺货、超储等异常时，要能及时通知车间主管和财务对账。',
  foot: '意图 Agent 已根据描述自动匹配行业、场景、能力与模块 — 可点击取消勾选，或继续修改描述。',
}

export function isHeroDockDemoDismissed(): boolean {
  try {
    return sessionStorage.getItem(HERO_DOCK_DEMO_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissHeroDockDemo(): void {
  try {
    sessionStorage.setItem(HERO_DOCK_DEMO_SESSION_KEY, '1')
  } catch {
    /* ignore */
  }
}

const mfg = INDUSTRIES_SHOWCASE.find((i) => i.key === 'mfg')!
const logistics = INDUSTRIES_SHOWCASE.find((i) => i.key === 'logistics')!
const formCap = CAPABILITIES_SHOWCASE.find((c) => c.id === 'workflow')

export const HERO_DOCK_DEMO_VALIDATION: SuggestValidation = {
  status: 'valid',
  confidence: 0.88,
  intent_summary: '制造业库存盘点与出入库审批，需异常消息推送给车间与财务',
  guidance: '',
  rejection_reason: '',
}

export function buildHeroDockDemoModules(): PromptModule[] {
  return [
    {
      ...pickToModule({ type: 'industry', key: 'mfg', label: '传统制造' }, { iconKey: mfg.iconKey, color: mfg.color }),
      source: 'suggest',
      order: 0,
    },
    {
      ...pickToModule({ type: 'office', key: '流程审批', label: '流程审批' }, { iconKey: 'approval', color: '#6366f1' }),
      source: 'suggest',
      order: 1,
    },
    {
      ...pickToModule({ type: 'module', key: 'approval_flow', label: '审批流' }, { iconKey: 'approval', color: '#f59e0b' }),
      source: 'suggest',
      order: 2,
    },
    {
      ...pickToModule({ type: 'module', key: 'notify_inapp', label: '站内信' }, { iconKey: 'notify', color: '#f59e0b' }),
      source: 'suggest',
      order: 3,
    },
    {
      ...pickToModule({ type: 'module', key: 'chart_dashboard', label: '数据看板' }, { iconKey: 'chart-dashboard', color: '#f59e0b' }),
      source: 'suggest',
      order: 4,
    },
    {
      ...pickToModule(
        { type: 'capability', key: 'workflow', label: '流程编排' },
        { iconKey: formCap?.iconKey ?? 'workflow', color: formCap?.color ?? '#8b5cf6' },
      ),
      source: 'suggest',
      order: 5,
    },
    {
      ...pickToModule({ type: 'scenario', key: 'hero-demo-inventory', label: '库存盘点' }, { iconKey: 'logistics', color: logistics.color }),
      source: 'suggest',
      order: 6,
    },
  ]
}

export function buildHeroDockDemoSuggestions(): SuggestItem[] {
  return [
    { pick: { type: 'industry', key: 'mfg', label: '传统制造' }, score: 8, reason: '匹配制造与库存描述', iconKey: mfg.iconKey, color: mfg.color },
    { pick: { type: 'industry', key: 'logistics', label: '物流仓储' }, score: 6, reason: '涉及仓储盘点场景', iconKey: logistics.iconKey, color: logistics.color },
    { pick: { type: 'office', key: '流程审批', label: '流程审批' }, score: 7, reason: '出入库需审批', iconKey: 'approval', color: '#6366f1' },
    { pick: { type: 'module', key: 'approval_flow', label: '审批流' }, score: 8, reason: '核心流程能力', iconKey: 'approval', color: '#f59e0b' },
    { pick: { type: 'module', key: 'notify_inapp', label: '站内信' }, score: 7, reason: '异常通知触达', iconKey: 'notify', color: '#f59e0b' },
    { pick: { type: 'module', key: 'chart_dashboard', label: '数据看板' }, score: 6, reason: '库存数据可视化', iconKey: 'chart-dashboard', color: '#f59e0b' },
    {
      pick: { type: 'capability', key: 'workflow', label: '流程编排' },
      score: 5,
      reason: '盘点与审批流程编排',
      iconKey: formCap?.iconKey ?? 'workflow',
      color: formCap?.color ?? '#8b5cf6',
    },
    { pick: { type: 'scenario', key: 'hero-demo-inventory', label: '库存盘点' }, score: 7, reason: '典型业务场景', iconKey: 'logistics', color: logistics.color },
  ]
}

export const HERO_DOCK_DEMO_ENHANCED =
  '为制造工厂搭建库存盘点应用：支持入库/出库审批流，库存异常通过站内信通知车间主管与财务，并以数据看板展示库存态势。'
