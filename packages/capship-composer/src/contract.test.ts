import { describe, expect, it } from 'vitest'
import { applyComposeOps } from './CapShipComposer'
import { applyFlowEditOps, buildDefaultModuleFlow } from './flowOps'
import { COMPOSER_MODES } from './types'
import type { ComposerPageSchema } from './types'

describe('capship composer contract', () => {
  it('exposes live_edit, module_flow, select_modules', () => {
    expect(COMPOSER_MODES.map((m) => m.id)).toEqual(['live_edit', 'module_flow', 'select_modules'])
  })

  it('applies compose ops to schema menu', () => {
    const base: ComposerPageSchema = {
      version: '1',
      appId: 't',
      title: 't',
      capability_keys: ['device_repair'],
      menu: [
        { key: 'a', label: '设备报修', route: '/s/a', capability_key: 'device_repair' },
        { key: 'b', label: '保养计划', route: '/s/b', capability_key: 'maintenance_plan' },
      ],
      root: {
        id: 'root',
        type: 'page',
        children: [
          { id: 'a', type: 'section' },
          { id: 'b', type: 'section' },
        ],
      },
    }
    const next = applyComposeOps(base, [
      { op: 'remove', label: '保养计划' },
      { op: 'add', label: '能耗统计', capability_key: 'energy_carbon', category: '能源' },
      { op: 'rename', from: '设备报修', to: '报修工单' },
    ])
    expect(next.menu.map((m) => m.label)).toEqual(['报修工单', '能耗统计'])
    expect(next.capability_keys).toContain('energy_carbon')
  })

  it('adds formal capability with real widget (not ListWidget mock page)', () => {
    const base: ComposerPageSchema = {
      version: '1',
      appId: 't',
      title: 't',
      capability_keys: [],
      menu: [],
      root: { id: 'root', type: 'page', children: [] },
    }
    const next = applyComposeOps(base, [
      {
        op: 'add',
        label: '请假管理',
        capability_key: 'leave_request',
        widget: 'LeaveRequestWidget',
        summary: '员工请假申请与审批',
        page_kind: 'form_list',
        page_mock: {
          form_title: '新建请假单',
          fields: [{ label: '请假类型', value: '年假' }],
          list: [{ id: 'LV-1', title: '年假 3 天', status: '审批中' }],
        },
      },
    ])
    expect(next.menu[0].capability_key).toBe('leave_request')
    expect(next.menu[0].page_mock).toBeDefined()
    expect(next.menu[0].summary).toContain('请假')
    const child = next.root.children?.[0]
    expect(child?.props?.widget).toBe('LeaveRequestWidget')
    expect(child?.type).toBe('leaverequest')
  })

  it('patches existing page form fields (date picker)', () => {
    const base: ComposerPageSchema = {
      version: '1',
      appId: 't',
      title: 't',
      capability_keys: ['leave_request'],
      menu: [
        { key: 'leave', label: '请假审批', route: '/s/leave', capability_key: 'leave_request' },
        { key: 'ot', label: '加班申请', route: '/s/ot', capability_key: 'leave_request' },
      ],
      root: {
        id: 'root',
        type: 'page',
        children: [
          { id: 'leave', type: 'leaverequest', props: { capability_key: 'leave_request' } },
          { id: 'ot', type: 'leaverequest', props: { capability_key: 'leave_request' } },
        ],
      },
    }
    const next = applyComposeOps(base, [
      {
        op: 'patch_page',
        label: '请假审批',
        capability_key: 'leave_request',
        page_mock: {
          form_title: '请假审批 · 提交',
          fields: [
            { key: 'start_at', label: '开始日期', type: 'date' },
            { key: 'end_at', label: '结束日期', type: 'date' },
          ],
        },
        form_fields: [
          { key: 'start_at', label: '开始日期', type: 'date' },
          { key: 'end_at', label: '结束日期', type: 'date' },
        ],
      },
    ])
    expect(next.menu[0].page_mock?.fields?.[0]?.type).toBe('date')
    expect(next.root.children?.[0]?.props?.form_fields).toEqual([
      { key: 'start_at', label: '开始日期', type: 'date' },
      { key: 'end_at', label: '结束日期', type: 'date' },
    ])
    // 同 capability 多场景一并同步
    expect(next.root.children?.[1]?.props?.form_fields).toEqual([
      { key: 'start_at', label: '开始日期', type: 'date' },
      { key: 'end_at', label: '结束日期', type: 'date' },
    ])
  })

  it('applies flow edit ops', () => {
    const flow = buildDefaultModuleFlow('t', ['设备报修', '知识库'])
    const next = applyFlowEditOps(flow, [
      { op: 'add', label: '审批流', after: '设备报修' },
      { op: 'remove', label: '知识库' },
    ])
    expect(next.steps.map((s) => s.label)).toEqual(['设备报修', '审批流'])
  })
})
