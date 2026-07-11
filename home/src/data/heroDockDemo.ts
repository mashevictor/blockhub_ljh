/** 首页 Hero 悬浮框 · 首次输入打字演示（积木仓 → 平台能力匹配） */

import { BRAND } from '@shared/brand'
import { PLATFORM_STATS } from '@shared/platformStats'
import type { SuggestValidation } from '../api/client'
import { pickToModule, type PromptModule } from '../components/agentInputLogic'
import type { SuggestItem } from './promptSuggest'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE } from './showcase'

/** 持久标记：用户已看过一次打字演示 */
export const HERO_DOCK_TYPING_DEMO_KEY = 'tc-hero-dock-typing-demo-seen'

export const HERO_DOCK_DEMO_PROMPT = BRAND.nameZh

/** 逐字打字间隔（毫秒） */
export const HERO_DOCK_TYPING_CHAR_MS = 140

export const HERO_DOCK_DEMO_PROBLEM = {
  title: '平台理解',
  body: `${BRAND.nameZh} ${BRAND.nameEn} 是企业智能应用 PaaS——描述需求、选行业、搭模块，${PLATFORM_STATS.scenarios}+ 场景 · ${PLATFORM_STATS.capabilities} 项能力 · ${PLATFORM_STATS.industryPacks} 个行业包 · 五端发布。${BRAND.tagline}。`,
  foot: '意图 Agent 已识别品牌并匹配平台核心能力 — 可继续描述业务场景，或输入 >> 手动选模块。',
}

export function isHeroDockTypingDemoSeen(): boolean {
  try {
    return localStorage.getItem(HERO_DOCK_TYPING_DEMO_KEY) === '1'
  } catch {
    return false
  }
}

export function markHeroDockTypingDemoSeen(): void {
  try {
    localStorage.setItem(HERO_DOCK_TYPING_DEMO_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** @deprecated 与 markHeroDockTypingDemoSeen 相同 */
export function dismissHeroDockDemo(): void {
  markHeroDockTypingDemoSeen()
}

export function isHeroDockDemoDismissed(): boolean {
  return isHeroDockTypingDemoSeen()
}

const office = INDUSTRIES_SHOWCASE.find((i) => i.key === 'office')!
const creation = CAPABILITIES_SHOWCASE.find((c) => c.id === 'creation')!
const chatQa = CAPABILITIES_SHOWCASE.find((c) => c.id === 'chat_qa')!
const approval = CAPABILITIES_SHOWCASE.find((c) => c.id === 'approval')!
const portal = CAPABILITIES_SHOWCASE.find((c) => c.id === 'portal')!

export const HERO_DOCK_DEMO_VALIDATION: SuggestValidation = {
  status: 'valid',
  confidence: 0.92,
  intent_summary: `识别为「${BRAND.nameZh}」平台本体查询，推荐智能创建、行业方案与核心模块组合`,
  guidance: '',
  rejection_reason: '',
}

export function buildHeroDockDemoModules(): PromptModule[] {
  return [
    {
      ...pickToModule({ type: 'industry', key: 'office', label: '通用办公' }, { iconKey: office.iconKey, color: office.color }),
      source: 'suggest',
      order: 0,
    },
    {
      ...pickToModule({ type: 'capability', key: 'creation', label: '智能创建' }, { iconKey: creation.iconKey, color: creation.color }),
      source: 'suggest',
      order: 1,
    },
    {
      ...pickToModule({ type: 'module', key: 'chat_qa', label: '智能问答' }, { iconKey: 'chat_qa', color: chatQa.color }),
      source: 'suggest',
      order: 2,
    },
    {
      ...pickToModule({ type: 'module', key: 'approval_flow', label: '审批流' }, { iconKey: 'approval', color: approval.color }),
      source: 'suggest',
      order: 3,
    },
    {
      ...pickToModule({ type: 'module', key: 'kb_document', label: '知识库' }, { iconKey: 'kb', color: '#059669' }),
      source: 'suggest',
      order: 4,
    },
    {
      ...pickToModule({ type: 'office', key: '知识协同', label: '知识协同' }, { iconKey: 'kb', color: '#059669' }),
      source: 'suggest',
      order: 5,
    },
    {
      ...pickToModule(
        { type: 'capability', key: 'portal', label: '多端门户' },
        { iconKey: portal.iconKey, color: portal.color },
      ),
      source: 'suggest',
      order: 6,
    },
    {
      ...pickToModule({ type: 'scenario', key: 'hero-demo-create', label: '描述创建' }, { iconKey: 'creation', color: creation.color }),
      source: 'suggest',
      order: 7,
    },
  ]
}

export function buildHeroDockDemoSuggestions(): SuggestItem[] {
  return [
    { pick: { type: 'industry', key: 'office', label: '通用办公' }, score: 9, reason: `${BRAND.nameZh} 核心场景库`, iconKey: office.iconKey, color: office.color },
    { pick: { type: 'capability', key: 'creation', label: '智能创建' }, score: 9, reason: '平台主入口 · 描述即创建', iconKey: creation.iconKey, color: creation.color },
    { pick: { type: 'capability', key: 'portal', label: '多端门户' }, score: 8, reason: `${PLATFORM_STATS.platforms} 端一次发布`, iconKey: portal.iconKey, color: portal.color },
    { pick: { type: 'capability', key: 'approval', label: '审批流程' }, score: 7, reason: '高频办公能力', iconKey: approval.iconKey, color: approval.color },
    { pick: { type: 'office', key: '知识协同', label: '知识协同' }, score: 7, reason: '制度 · 文档 · 问答', iconKey: 'kb', color: '#059669' },
    { pick: { type: 'module', key: 'chat_qa', label: '智能问答' }, score: 8, reason: 'RAG 知识库问答', iconKey: 'chat_qa', color: chatQa.color },
    { pick: { type: 'module', key: 'approval_flow', label: '审批流' }, score: 8, reason: '请假 · 报销 · 通用审批', iconKey: 'approval', color: approval.color },
    { pick: { type: 'module', key: 'kb_document', label: '知识库' }, score: 7, reason: '文档切片与检索', iconKey: 'kb', color: '#059669' },
    { pick: { type: 'scenario', key: 'hero-demo-create', label: '描述创建' }, score: 8, reason: '三种创建方式之一', iconKey: 'creation', color: creation.color },
    { pick: { type: 'supplement', key: 'llm-intent', label: '意图解析' }, score: 8, reason: '大模型拆解需求', iconKey: 'creation', color: '#1d4ed8' },
  ]
}

export const HERO_DOCK_DEMO_ENHANCED =
  `${BRAND.nameZh} ${BRAND.nameEn}：企业智能应用 PaaS，支持描述需求创建、${PLATFORM_STATS.industryPacks} 个行业深度包、${PLATFORM_STATS.scenarios}+ 业务场景与 ${PLATFORM_STATS.capabilities} 项能力模块自由组合，一次发布 Web · iOS · Android · Windows · macOS 五端可用。`
