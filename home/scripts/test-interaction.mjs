/**
 * 交互逻辑冒烟测试（纯函数层）
 * 运行: node home/scripts/test-interaction.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist', 'assets')
// 直接内联核心逻辑做断言（与 appAssembly 保持一致）
const INDUSTRIES = [
  { key: 'sales', name: '销售行业', desc: '话术、漏斗' },
  { key: 'med', name: '医疗健康', desc: '指南、排班' },
]

function composeLogicalPrompt(modules) {
  const user = modules.filter((m) => m.source !== 'auto')
  if (!user.length) return ''
  const industries = user.filter((m) => m.type === 'industry')
  const lines = []
  if (industries.length === 1) {
    const ind = INDUSTRIES.find((i) => i.key === industries[0].key)
    lines.push(`我们是「${industries[0].label}」行业${ind ? `，${ind.desc}` : ''}。`)
  } else if (industries.length > 1) {
    lines.push(`我们涉及 ${industries.length} 个行业：${industries.map((i) => i.label).join('、')}，需要一套可跨行业复用的智能应用。`)
  }
  lines.push('请基于上述行业视角，组合典型办公与行业场景，生成可交付的应用。')
  return lines.join('\n')
}

function mergePromptText(base, suffix) {
  if (!base) return suffix
  if (!suffix.trim()) return base
  return `${base}\n\n${suffix.trim()}`
}

function splitPromptText(full, modules) {
  const base = composeLogicalPrompt(modules)
  if (!base) return { base: '', suffix: full.trim() }
  if (full.startsWith(base)) return { base, suffix: full.slice(base.length).replace(/^\n+/, '').trim() }
  return { base: '', suffix: full.trim() }
}

let pass = 0
let fail = 0
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}`) }
}

console.log('\n=== 交互逻辑测试 ===\n')

// A. 选 1 个行业
const m1 = [{ type: 'industry', key: 'sales', label: '销售行业', source: 'user' }]
const t1 = composeLogicalPrompt(m1)
ok('A 单行业生成描述', t1.includes('销售行业') && t1.includes('话术'))

// B. 选多个行业
const m4 = [
  { type: 'industry', key: 'sales', label: '销售行业', source: 'user' },
  { type: 'industry', key: 'med', label: '医疗健康', source: 'user' },
]
ok('B 多行业生成描述', composeLogicalPrompt(m4).includes('2 个行业'))

// C. 去掉所有模块
ok('C 去掉模块后描述为空', composeLogicalPrompt([]) === '')

// D. 有模块 + 用户补充
const base = composeLogicalPrompt(m1)
const merged = mergePromptText(base, '希望支持移动端')
ok('D 保留用户补充', merged.includes('销售行业') && merged.includes('希望支持移动端'))

// E. 拆分补充
const { suffix } = splitPromptText(merged, m1)
ok('E 拆分出用户补充', suffix === '希望支持移动端')

// F. 清空输入框（有模块时应能恢复 base）
ok('F 清空后仍可恢复', mergePromptText(base, '') === base)

// G. 去掉一个模块
const afterRemove = [m4[0]]
ok('G 去掉勾选更新描述', composeLogicalPrompt(afterRemove).includes('销售行业') && !composeLogicalPrompt(afterRemove).includes('医疗健康'))

// H. 我的应用 localStorage 逻辑（与 myAppsStorage 一致）
function mockAddMyApp(list, result) {
  const key = result.appId || result.webUrl
  if (!key) return { list, saved: false }
  const entry = { ...result, savedAt: new Date().toISOString() }
  const prev = list.filter((a) => (a.appId || a.webUrl) !== key)
  return { list: [entry, ...prev], saved: true }
}

const r1 = { appId: 'abc123', webUrl: 'http://x/r/abc123', appName: 'Test', moduleCount: 2, modules: [] }
const s1 = mockAddMyApp([], r1)
ok('H1 首次保存我的应用', s1.saved && s1.list.length === 1)
const r2 = { ...r1, appName: 'Test2' }
const s2 = mockAddMyApp(s1.list, r2)
ok('H2 同 appId 覆盖更新', s2.list.length === 1 && s2.list[0].appName === 'Test2')
const s3 = mockAddMyApp([], { appName: 'x', moduleCount: 0, modules: [] })
ok('H3 无 appId/webUrl 不保存', !s3.saved && s3.list.length === 0)

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`)
process.exit(fail ? 1 : 0)
