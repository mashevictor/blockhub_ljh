import { useEffect, useState } from 'react'
import { COMPOSER_MODES } from '@capship/composer'
import { fetchCatalogModules, publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runLoadingPublishPipeline } from '../lib/publishFlow'
import { GENERATE_APP_LABEL, GENERATE_APP_LOADING } from '../data/publishUi'
import { AgentButtonContent } from '../components/AgentChevron'
import type { PublishResult } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { MODULE_ICON_KEYS, iconWrapStyle, moduleColor } from '../data/iconPalette'
import { buildPublishedModulesFromWidgets } from '../data/publishDisplay'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding } from '../data/appBranding'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import { ChevronDotLoadingRow } from '../components/ChevronDotLoader'
import DeliverTargetPicker from '../components/DeliverTargetPicker'
import DeliveryTemplatePicker from '../components/DeliveryTemplatePicker'
import CapabilitySplitBanner from '../components/CapabilitySplitBanner'
import { deliverToPlatforms, platformsToDeliver, type PlatformId } from '../data/deliverTargets'

interface Props {
  onPublish: (r: PublishResult) => void
  active?: boolean
}

interface Widget { key: string; name: string; iconKey: string }

interface CapabilityGroup {
  cat: string
  items: Widget[]
}

const MODULE_COMPOSER_MODE = COMPOSER_MODES.find((m) => m.id === 'select_modules')?.id ?? 'select_modules'

export default function ModuleView({ onPublish, active = true }: Props) {
  const { theme } = useTheme()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [moduleGroups, setModuleGroups] = useState<CapabilityGroup[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [modulesError, setModulesError] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<PlatformId[]>(() => deliverToPlatforms('web'))
  const device = platformsToDeliver(platforms)
  const [webTemplateId, setWebTemplateId] = useState('tabs_portal')
  const [appUiId, setAppUiId] = useState('bottom_tabs')
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [branding, setBranding] = useState(() => emptyBranding('模块组装应用'))

  const loadModules = () => {
    setModulesLoading(true)
    setModulesError(null)
    fetchCatalogModules()
      .then((data) => {
        const groups = Object.entries(data.by_category ?? {}).map(([cat, items]) => ({
          cat,
          items: items.map((m) => ({
            key: m.key,
            name: m.name,
            iconKey: MODULE_ICON_KEYS[m.key] ?? 'creation',
          })),
        }))
        if (groups.length === 0) {
          setModulesError('能力模块为空，请执行 POST /api/v1/seed')
          setModuleGroups([])
          return
        }
        setModuleGroups(groups)
      })
      .catch(() => {
        setModulesError('无法加载能力模块，请稍后重试')
        setModuleGroups([])
      })
      .finally(() => setModulesLoading(false))
  }

  useEffect(() => {
    if (!active) return
    loadModules()
  }, [active])

  useEffect(() => {
    if (active) return
    setContactOpen(false)
  }, [active])

  const add = (w: Widget) => {
    if (widgets.some((x) => x.key === w.key)) return
    setWidgets((prev) => [...prev, w])
    setLastAddedId(w.key)
    setBoxOpenSignal((n) => n + 1)
  }

  const remove = (key: string) => setWidgets((prev) => prev.filter((w) => w.key !== key))
  const clearSelection = () => setWidgets([])

  const selectionItems: SelectionItem[] = widgets.map((w) => ({
    id: w.key,
    name: w.name,
    kind: 'module',
    iconKey: w.iconKey,
    color: moduleColor(w.key, theme),
  }))

  const doPublish = async (contact: ContactInfo, nameOverride?: string) => {
    if (!widgets.length) return
    const finalName = (nameOverride || branding.appName || '模块组装应用').trim() || '模块组装应用'
    await runLoadingPublishPipeline({
      closeContact: () => setContactOpen(false),
      setLoading,
      setError: setPublishError,
      onSuccess: onPublish,
      execute: async () => {
        const publishedModules = buildPublishedModulesFromWidgets(widgets)
        const res = await publishApp(finalName, 'office', {
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
          entrySource: 'capship_workbench',
          iconUrl: branding.iconUrl,
          primaryColor: branding.primaryColor,
          webTemplateId,
          appUiId,
          contactEmail: contact.type === 'email' ? contact.value : undefined,
          contactPhone: contact.type === 'phone' ? contact.value : undefined,
        })
        return publishApiToResult(res, {
          moduleCount: publishedModules.length,
          modules: publishedModules,
          scenarios: widgets.map((w) => w.name),
        })
      },
    })
  }

  const handlePublish = () => setContactOpen(true)

  return (
    <div className="view module-view" data-capship-mode={MODULE_COMPOSER_MODE}>
      <div className="builder-layout cube-panel">
        <aside className="builder-palette cube-panel-inner">
          <h3>功能模块</h3>
          <p className="palette-hint">点击添加到右侧 · 来自平台能力库</p>
          {modulesLoading && (
            <ChevronDotLoadingRow variant="scan" size="sm" text="加载能力模块…" className="catalog-loading" />
          )}
          {modulesError && (
            <div className="catalog-error">
              <p>{modulesError}</p>
              <button type="button" className="btn-secondary" onClick={loadModules}>重试</button>
            </div>
          )}
          {!modulesLoading && !modulesError && moduleGroups.map((g) => (
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
            <div className="canvas-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <DeliveryTemplatePicker
                webTemplateId={webTemplateId}
                appUiId={appUiId}
                onWebTemplateChange={setWebTemplateId}
                onAppUiChange={setAppUiId}
                recommendAppUiId={
                  widgets.some((w) => w.key.includes('shanghai_voice')) ? 'immersive_chat' : undefined
                }
                compact
              />
              <DeliverTargetPicker value={platforms} onChange={setPlatforms} />
            </div>
          </div>
          <CapabilitySplitBanner
            knownLabels={widgets.map((w) => w.name)}
            pendingLabels={[]}
            compact
          />
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
          <AppBrandingFields value={branding} onChange={setBranding} compact />
          <button type="button" className="btn-primary full agent-action-btn" disabled={!widgets.length || loading} onClick={handlePublish}>
            {loading ? GENERATE_APP_LOADING : (
              <AgentButtonContent>{GENERATE_APP_LABEL}</AgentButtonContent>
            )}
          </button>
        </aside>
      </div>

      {publishError && <p className="publish-error">{publishError}</p>}

      {loading && <GenerateLoadingOverlay phase="publish" />}

      {active && selectionItems.length > 0 && (
        <SelectionBox
          items={selectionItems}
          onRemove={remove}
          onClear={clearSelection}
          onGenerate={handlePublish}
          generating={loading}
          lastAddedId={lastAddedId}
          openSignal={boxOpenSignal}
        />
      )}

      <ContactGateModal
        open={active && contactOpen}
        defaultAppName={branding.appName || '模块组装应用'}
        onClose={() => setContactOpen(false)}
        onConfirm={(c, opts) => {
          const named = opts?.appName?.trim()
          if (named) setBranding((prev) => ({ ...prev, appName: named }))
          void doPublish(c, named)
        }}
      />
    </div>
  )
}
