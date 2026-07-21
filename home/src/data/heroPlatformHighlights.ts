/** Hero 右侧「平台能力一览」— 统一数字+标题模块 */

import {
  AGENT_TEMPLATES,
  ATOMIC_AI_CAPABILITIES,
  COMMON_INSERT_MODULES,
  LLM_POWERED_AGENTS,
} from './productShowcase'
import { PLATFORM_STATS } from '@shared/platformStats'

export const HERO_PLATFORM_INTRO =
  `${PLATFORM_STATS.scenarios} 场景 · ${PLATFORM_STATS.capabilities} 项模块 · ${AGENT_TEMPLATES.length} 套 AI 模板 · ${PLATFORM_STATS.agents} 个智能体`

export interface HeroStatModule {
  target: number
  suffix?: string
  label: string
  sub: string
}

/** 全部统一为「数字 + 标题 + 副标题」横排模块 */
export const HERO_PLATFORM_STATS: HeroStatModule[] = [
  {
    target: PLATFORM_STATS.scenarios,
    label: '业务场景',
    sub: '典型流程开箱即用',
  },
  {
    target: PLATFORM_STATS.officeScenarios,
    label: '办公场景',
    sub: '8 大分类 · 人事财务审批',
  },
  {
    target: PLATFORM_STATS.industryScenarios,
    label: '行业场景',
    sub: '20 个深度包配套',
  },
  {
    target: PLATFORM_STATS.capabilities,
    label: '能力模块',
    sub: '搭积木式自由组合',
  },
  {
    target: AGENT_TEMPLATES.length,
    label: 'AI 模板',
    sub: '问答 · 审批 · 看板 · 语音',
  },
  {
    target: COMMON_INSERT_MODULES.length,
    label: '高频模块',
    sub: '通知 · 待办 · 表单 · 权限',
  },
  {
    target: PLATFORM_STATS.agents,
    label: '智能体',
    sub: '核心助手 · 大模型编排',
  },
  {
    target: ATOMIC_AI_CAPABILITIES.length,
    label: '原子能力',
    sub: '问答 · 语音 · 知识 · 审批',
  },
  {
    target: LLM_POWERED_AGENTS.length,
    label: '大模型',
    sub: '意图 · 推荐 · 对话 · 编排',
  },
  {
    target: PLATFORM_STATS.platforms,
    label: '端交付',
    sub: 'Web · 移动 · 桌面同步',
  },
  {
    target: PLATFORM_STATS.industryPacks,
    label: '行业方案',
    sub: '独立站 · 深度包',
  },
  {
    target: 3,
    label: '创建方式',
    sub: '对话改页 · 行业 · 模块',
  },
]
