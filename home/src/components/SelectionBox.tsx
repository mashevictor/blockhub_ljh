import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DynamicIcon, IconCheckCircle, IconX } from './icons'
import { iconWrapStyle } from '../data/iconPalette'
import { BRAND, LOGO } from '../data/brand'

export interface SelectionItem {
  id: string
  name: string
  category?: string
  kind: 'scenario' | 'industry' | 'office' | 'capability' | 'module'
  iconKey?: string
  color?: string
  auto?: boolean
  order?: number
}

interface Props {
  items: SelectionItem[]
  onRemove: (id: string) => void
  onClear: () => void
  onScrollToPrompt?: () => void
  onGenerate?: () => void
  generating?: boolean
  lastAddedId?: string | null
  openSignal?: number
}

const KIND_LABEL: Record<SelectionItem['kind'], string> = {
  industry: '行业',
  office: '分类',
  scenario: '场景',
  capability: '能力',
  module: '模块',
}

function ItemRow({
  item,
  index,
  onRemove,
  isNew,
}: {
  item: SelectionItem
  index: number
  onRemove: (id: string) => void
  isNew?: boolean
}) {
  const sub = item.auto ? '系统补齐' : (item.category ?? KIND_LABEL[item.kind])
  return (
    <li
      className={`selbox-item${isNew ? ' is-new' : ''}${item.auto ? ' is-auto' : ''}`}
      style={{ '--item-i': index } as CSSProperties}
    >
      {item.iconKey && item.color ? (
        <span className="selbox-item-icon icon-themed" style={iconWrapStyle(item.color)}>
          <DynamicIcon name={item.iconKey} size={16} color={item.color} />
        </span>
      ) : (
        <span className="selbox-item-dot" data-kind={item.kind} />
      )}
      <div className="selbox-item-body">
        <strong>{item.name}</strong>
        <span>{sub}</span>
      </div>
      {!item.auto && (
        <button type="button" className="selbox-item-remove" onClick={() => onRemove(item.id)} aria-label={`移除 ${item.name}`}>
          <IconX size={14} />
        </button>
      )}
    </li>
  )
}

export default function SelectionBox({
  items,
  onRemove,
  onClear,
  onScrollToPrompt,
  onGenerate,
  generating = false,
  lastAddedId,
  openSignal = 0,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [toast, setToast] = useState<{ name: string; id: string } | null>(null)
  const prevCount = useRef(0)

  useEffect(() => {
    if (openSignal > 0) setOpen(true)
  }, [openSignal])

  const userItems = items.filter((i) => !i.auto)
  const autoItems = items.filter((i) => i.auto)
  const count = userItems.length

  const lastItem = lastAddedId ? items.find((i) => i.id === lastAddedId) : undefined

  useEffect(() => {
    if (count > prevCount.current) {
      setPulse(true)
      setOpen(true)
      if (lastItem) {
        setToast({ name: lastItem.name, id: lastItem.id })
        const t2 = window.setTimeout(() => setToast(null), 2200)
        const t1 = window.setTimeout(() => setPulse(false), 650)
        prevCount.current = count
        return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
      }
      const t = window.setTimeout(() => setPulse(false), 650)
      prevCount.current = count
      return () => window.clearTimeout(t)
    }
    prevCount.current = count
    if (count === 0 && autoItems.length === 0) {
      setOpen(false)
      setToast(null)
    }
  }, [count, lastItem, autoItems.length])

  const handleClear = () => {
    onClear()
    setOpen(false)
    setToast(null)
    setPulse(false)
    prevCount.current = 0
  }

  if (userItems.length === 0) return null

  const ui = (
    <div
      className={`selbox selbox-warehouse wh-portal${open ? ' open' : ''}${pulse ? ' pulse' : ''}`}
      role="region"
      aria-label="积木仓"
    >
      {toast && (
        <div key={toast.id} className="warehouse-toast" aria-live="polite">
          <IconCheckCircle size={16} />
          <span><strong>{toast.name}</strong> 已入仓</span>
        </div>
      )}

      <div className="warehouse-shell">
        <button
          type="button"
          className="warehouse-lid-bar"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <img src={LOGO.mark} alt="" width={28} height={28} className="warehouse-logo" />
          <span className="warehouse-brand">{BRAND.nameZh}</span>
          <em className={`warehouse-count${pulse ? ' bump' : ''}`}>{userItems.length || items.length}</em>
          <span className="warehouse-lid-tag">{open ? '收起' : '展开'}</span>
          <span className="warehouse-lid-chevron" aria-hidden>{open ? '▴' : '▾'}</span>
        </button>

        <div className="warehouse-lid-ridge" aria-hidden />

        <div className="warehouse-panel">
            <div className="warehouse-panel-inner">
            <div className="warehouse-panel-scroll">
            {userItems.length > 0 && (
              <>
                <div className="selbox-group-title">我的选择 · 按顺序组合</div>
                <ul className="selbox-list">
                  {userItems.map((item, i) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={i}
                      onRemove={onRemove}
                      isNew={item.id === lastAddedId}
                    />
                  ))}
                </ul>
              </>
            )}
            {autoItems.length > 0 && (
              <>
                <div className="selbox-group-title auto">系统将自动补齐</div>
                <ul className="selbox-list auto">
                  {autoItems.map((item, i) => (
                    <ItemRow key={item.id} item={item} index={i} onRemove={onRemove} />
                  ))}
                </ul>
              </>
            )}
            </div>
            <div className="selbox-foot">
              <div className="selbox-foot-row">
                <button type="button" className="selbox-clear" onClick={handleClear}>清空</button>
                <button type="button" className="btn-primary selbox-go" onClick={onScrollToPrompt}>
                  查看提示词
                </button>
              </div>
              {onGenerate && (
                <button
                  type="button"
                  className="btn-primary selbox-generate"
                  disabled={generating}
                  onClick={onGenerate}
                >
                  {generating ? '正在生成…' : '生成我的应用'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(ui, document.body)
}
