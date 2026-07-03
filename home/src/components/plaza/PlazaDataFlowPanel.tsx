import { useState } from 'react'
import type { PlazaDataFlowSnapshot } from '../../lib/plazaBarrage'

interface Props {
  snapshot: PlazaDataFlowSnapshot
  selectedId: string | null
  filterLabel: string
}

export default function PlazaDataFlowPanel({ snapshot, selectedId, filterLabel }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <aside className="plaza-dataflow" aria-label="广场数据流">
      <button
        type="button"
        className="plaza-dataflow-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="plaza-dataflow-chev">&gt;&gt;</span>
        数据流 · 修改时可追踪
        <span className="plaza-dataflow-badge">{snapshot.mergedCount} 条</span>
      </button>
      {open && (
        <div className="plaza-dataflow-body">
          <div className="plaza-dataflow-step">
            <span className="step-num">1</span>
            <div>
              <strong>发布 → localStorage</strong>
              <code>{snapshot.storageKey}</code>
              <span className="step-meta">用户帖 {snapshot.userPostCount} 条</span>
            </div>
          </div>
          <div className="plaza-dataflow-arrow">↓ loadPlazaFeedItems()</div>
          <div className="plaza-dataflow-step">
            <span className="step-num">2</span>
            <div>
              <strong>合并 Mock 演示数据</strong>
              <span className="step-meta">mock {snapshot.mockCount} · 合计 {snapshot.mergedCount}</span>
              {snapshot.userPostIds.length > 0 && (
                <span className="step-ids">user: {snapshot.userPostIds.join(', ')}</span>
              )}
            </div>
          </div>
          <div className="plaza-dataflow-arrow">↓ splitIntoRails() · 筛选 {filterLabel}</div>
          <div className="plaza-dataflow-step">
            <span className="step-num">3</span>
            <div>
              <strong>双轨弹幕分配</strong>
              <span className="step-meta">
                轨1 公开/组织 {snapshot.rail1Count} · 轨2 部门 {snapshot.rail2Count}
              </span>
            </div>
          </div>
          <div className="plaza-dataflow-arrow">↓ 点击弹幕 → selectedId</div>
          <div className="plaza-dataflow-step active">
            <span className="step-num">4</span>
            <div>
              <strong>Feed 卡片展开</strong>
              <span className="step-meta">
                {selectedId ? `选中 ${selectedId}` : '未选中 · 点击轨道标签激活'}
              </span>
            </div>
          </div>
          <p className="plaza-dataflow-note">W4 接 PostgreSQL 后步骤 1–2 改为 API · 轨道逻辑不变</p>
        </div>
      )}
    </aside>
  )
}
