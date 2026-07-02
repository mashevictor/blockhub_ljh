import { useState } from 'react'
import { publishApp } from '../api/client'
import { createdAppToPublishResult } from '../api/publishHelpers'
import { MODULES, type PublishResult } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { MODULE_ICON_KEYS, iconWrapStyle, moduleColor } from '../data/iconPalette'
import { buildPublishedModulesFromWidgets } from '../data/publishDisplay'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'

interface Props {
  onPublish: (r: PublishResult) => void
}

interface Widget { key: string; name: string; iconKey: string }

export default function ModuleView({ onPublish }: Props) {
  const { theme } = useTheme()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [device, setDevice] = useState<'web' | 'app' | 'both'>('web')

  const [loading, setLoading] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const add = (w: Widget) => {
    if (widgets.some((x) => x.key === w.key)) return
    setWidgets((prev) => [...prev, w])
  }

  const remove = (key: string) => setWidgets((prev) => prev.filter((w) => w.key !== key))

  const doPublish = async (contact: ContactInfo) => {
    if (!widgets.length) return
    const publishedModules = buildPublishedModulesFromWidgets(widgets)
    setLoading(true)
    try {
      const res = await publishApp('模块组装应用', 'office', {
        scenarioNames: widgets.map((w) => w.name),
        capabilityKeys: widgets.map((w) => w.key),
        modules: publishedModules.map((m) => ({
          key: m.key,
          label: m.label,
          kind: m.kind,
          iconKey: m.iconKey,
          source: m.source,
        })),
        deliver: device,
        source: 'module',
        contactEmail: contact.type === 'email' ? contact.value : undefined,
        contactPhone: contact.type === 'phone' ? contact.value : undefined,
      })
      onPublish(createdAppToPublishResult(res.app, {
        moduleCount: publishedModules.length,
        modules: publishedModules,
        scenarios: widgets.map((w) => w.name),
      }))
    } catch {
      onPublish({
        appName: '模块组装应用',
        webUrl: `https://app.trackchat.io/build/${Date.now().toString(36)}`,
        appQr: 'trackchat://build/preview',
        moduleCount: publishedModules.length,
        modules: publishedModules,
        scenarios: widgets.map((w) => w.name),
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = () => setContactOpen(true)

  return (
    <div className="view module-view">
      <div className="builder-layout cube-panel">
        <aside className="builder-palette cube-panel-inner">
          <h3>功能模块</h3>
          <p className="palette-hint">点击添加到右侧 · 可自由组合</p>
          {MODULES.map((g) => (
            <div key={g.cat} className="palette-group">
              <div className="palette-cat">{g.cat}</div>
              {g.items.map((m) => {
                const iconKey = MODULE_ICON_KEYS[m.key] ?? 'creation'
                const ic = moduleColor(m.key, theme)
                const added = widgets.some((w) => w.key === m.key)
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`palette-item${added ? ' added' : ''}`}
                    onClick={() => add({ key: m.key, name: m.name, iconKey })}
                    disabled={added}
                  >
                    <span className="module-icon-wrap icon-themed" style={iconWrapStyle(ic)}>
                      <DynamicIcon name={iconKey} size={16} color={ic} />
                    </span>
                    {m.name}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        <div className="builder-canvas cube-panel-inner">
          <div className="canvas-toolbar">
            <h3>您的应用</h3>
            <div className="device-tabs">
              {(['web', 'app', 'both'] as const).map((d) => (
                <button key={d} type="button" className={device === d ? 'on' : ''} onClick={() => setDevice(d)}>
                  {d === 'web' ? 'Web' : d === 'app' ? 'App' : '双端'}
                </button>
              ))}
            </div>
          </div>
          <div className="canvas-drop">
            {!widgets.length && (
              <div className="canvas-empty">
                <span className="canvas-empty-icon icon-themed" style={iconWrapStyle(theme.pri)}>
                  <DynamicIcon name="creation" size={32} color={theme.pri} />
                </span>
                <p>从左侧选择功能，组合成专属应用</p>
              </div>
            )}
            {widgets.map((w) => {
              const ic = moduleColor(w.key, theme)
              return (
                <div key={w.key} className="canvas-widget">
                  <span className="cw-icon icon-themed" style={iconWrapStyle(ic)}>
                    <DynamicIcon name={w.iconKey} size={22} color={ic} />
                  </span>
                  <div><strong>{w.name}</strong></div>
                  <button type="button" onClick={() => remove(w.key)} aria-label="移除">×</button>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="builder-inspector cube-panel-inner">
          <h3>应用摘要</h3>
          <dl className="inspect-list">
            <div><dt>已选功能</dt><dd>{widgets.length}</dd></div>
            <div><dt>发布形式</dt><dd>{device === 'web' ? '网页版' : device === 'app' ? '手机 App' : '网页 + 手机'}</dd></div>
            <div><dt>界面风格</dt><dd>{device === 'app' ? '简洁单列' : '完整工作台'}</dd></div>
          </dl>
          <button type="button" className="btn-primary full" disabled={!widgets.length || loading} onClick={handlePublish}>
            {loading ? '发布中…' : '发布应用'}
          </button>
        </aside>
      </div>

      <ContactGateModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onConfirm={(c) => { setContactOpen(false); void doPublish(c) }}
      />
    </div>
  )
}
