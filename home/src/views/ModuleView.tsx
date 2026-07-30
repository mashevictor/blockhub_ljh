import { useEffect, useMemo, useState } from 'react'
import { useI18n, useT } from '@blockhub/i18n/react'
import { COMPOSER_MODES } from '@capship/composer'
import { fetchCatalogModules, publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runLoadingPublishPipeline } from '../lib/publishFlow'
import { publishGenerateLabel, publishGenerateLoading, blockhubDemoAppNameI18n } from '../i18n/publishLabels'
import { capabilityName, localizeModuleGroupCat } from '../i18n/capabilityLabels'
import { AgentButtonContent } from '../components/AgentChevron'
import type { PublishResult } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { MODULE_ICON_KEYS, iconWrapStyle, moduleColor } from '../data/iconPalette'
import { buildPublishedModulesFromWidgets } from '../data/publishDisplay'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding, BLOCKHUB_DEMO_MODULE_KEYS } from '../data/appBranding'
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

function buildDemoWidgets(t: (key: string, vars?: Record<string, string | number>) => string): Widget[] {
  return BLOCKHUB_DEMO_MODULE_KEYS.map((key) => ({
    key,
    name: capabilityName(t, key, key),
    iconKey: MODULE_ICON_KEYS[key] ?? 'creation',
  }))
}

export default function ModuleView({ onPublish, active = true }: Props) {
  const t = useT()
  const { locale } = useI18n()
  const { theme } = useTheme()
  const [widgets, setWidgets] = useState<Widget[]>(() => buildDemoWidgets(t))
  const [moduleGroups, setModuleGroups] = useState<CapabilityGroup[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [modulesError, setModulesError] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<PlatformId[]>(() => deliverToPlatforms('web'))
  const device = platformsToDeliver(platforms)
  const [webTemplateId, setWebTemplateId] = useState('sidebar_admin')
  const [appUiId, setAppUiId] = useState('drawer_nav')
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [branding, setBranding] = useState(() => emptyBranding(blockhubDemoAppNameI18n(t)))

  const labelOf = (key: string, fallback: string) => capabilityName(t, key, fallback)

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
          setModulesError(t('home.builder.modules_empty'))
          setModuleGroups([])
          return
        }
        setModuleGroups(groups)
      })
      .catch(() => {
        setModulesError(t('home.builder.modules_error'))
        setModuleGroups([])
      })
      .finally(() => setModulesLoading(false))
  }

  useEffect(() => {
    if (!active) return
    loadModules()
  }, [active, locale])

  useEffect(() => {
    setWidgets((prev) => {
      if (!prev.length) return buildDemoWidgets(t)
      return prev.map((w) => ({ ...w, name: labelOf(w.key, w.name) }))
    })
    setBranding((prev) => {
      const demo = blockhubDemoAppNameI18n(t)
      const knownDefaults = new Set(['积木仓演示页面', 'BlockHub demo page', demo])
      if (!prev.appName || knownDefaults.has(prev.appName)) {
        return { ...prev, appName: demo }
      }
      return prev
    })
  }, [locale, t])

  useEffect(() => {
    if (active) return
    setContactOpen(false)
  }, [active])

  const add = (w: Widget) => {
    if (widgets.some((x) => x.key === w.key)) return
    const next = { ...w, name: labelOf(w.key, w.name) }
    setWidgets((prev) => [...prev, next])
    setLastAddedId(w.key)
    setBoxOpenSignal((n) => n + 1)
  }

  const remove = (key: string) => setWidgets((prev) => prev.filter((w) => w.key !== key))
  const clearSelection = () => setWidgets([])

  const selectionItems: SelectionItem[] = useMemo(
    () => widgets.map((w) => ({
      id: w.key,
      name: labelOf(w.key, w.name),
      kind: 'module' as const,
      iconKey: w.iconKey,
      color: moduleColor(w.key, theme),
    })),
    [widgets, theme, t],
  )

  const deliverLabel =
    device === 'web'
      ? t('home.builder.deliver.web')
      : device === 'app'
        ? t('home.builder.deliver.app')
        : t('home.builder.deliver.both')
  const styleLabel = device === 'app' ? t('home.builder.style.simple') : t('home.builder.style.workbench')

  const doPublish = async (contact: ContactInfo, nameOverride?: string) => {
    if (!widgets.length) return
    const finalName =
      (nameOverride || branding.appName || blockhubDemoAppNameI18n(t)).trim() || blockhubDemoAppNameI18n(t)
    await runLoadingPublishPipeline({
      closeContact: () => setContactOpen(false),
      setLoading,
      setError: setPublishError,
      onSuccess: onPublish,
      execute: async () => {
        const named = widgets.map((w) => ({ ...w, name: labelOf(w.key, w.name) }))
        const publishedModules = buildPublishedModulesFromWidgets(named)
        const res = await publishApp(finalName, 'office', {
          scenarioNames: named.map((w) => w.name),
          capabilityKeys: named.map((w) => w.key),
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
          scenarios: named.map((w) => w.name),
        })
      },
    })
  }

  const handlePublish = () => setContactOpen(true)

  return (
    <div className="view module-view" data-capship-mode={MODULE_COMPOSER_MODE}>
      <div className="builder-layout cube-panel">
        <aside className="builder-palette cube-panel-inner">
          <h3>{t('home.builder.modules_title')}</h3>
          <p className="palette-hint">{t('home.builder.modules_hint')}</p>
          {modulesLoading && (
            <ChevronDotLoadingRow variant="scan" size="sm" text={t('home.builder.modules_loading')} className="catalog-loading" />
          )}
          {modulesError && (
            <div className="catalog-error">
              <p>{modulesError}</p>
              <button type="button" className="btn-secondary" onClick={loadModules}>{t('home.builder.retry')}</button>
            </div>
          )}
          {!modulesLoading && !modulesError && moduleGroups.map((g) => (
            <div key={g.cat} className="palette-group">
              <div className="palette-cat">{localizeModuleGroupCat(t, g.cat, g.items[0]?.key)}</div>
              {g.items.map((m) => {
                const iconKey = MODULE_ICON_KEYS[m.key] ?? 'creation'
                const ic = moduleColor(m.key, theme)
                const added = widgets.some((w) => w.key === m.key)
                const name = labelOf(m.key, m.name)
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`palette-item${added ? ' added' : ''}`}
                    onClick={() => add({ key: m.key, name, iconKey })}
                    disabled={added}
                  >
                    <span className="module-icon-wrap icon-themed" style={iconWrapStyle(ic)}>
                      <DynamicIcon name={iconKey} size={16} color={ic} />
                    </span>
                    {name}
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        <div className="builder-canvas cube-panel-inner">
          <div className="canvas-toolbar">
            <h3>{t('home.builder.your_app')}</h3>
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
            knownLabels={widgets.map((w) => labelOf(w.key, w.name))}
            pendingLabels={[]}
            compact
          />
          <div className="canvas-drop">
            {!widgets.length && (
              <div className="canvas-empty">
                <span className="canvas-empty-icon icon-themed" style={iconWrapStyle(theme.pri)}>
                  <DynamicIcon name="creation" size={32} color={theme.pri} />
                </span>
                <p>{t('home.builder.empty')}</p>
              </div>
            )}
            {widgets.map((w) => {
              const ic = moduleColor(w.key, theme)
              const name = labelOf(w.key, w.name)
              return (
                <div key={w.key} className="canvas-widget">
                  <span className="cw-icon icon-themed" style={iconWrapStyle(ic)}>
                    <DynamicIcon name={w.iconKey} size={22} color={ic} />
                  </span>
                  <div><strong>{name}</strong></div>
                  <button type="button" onClick={() => remove(w.key)} aria-label={t('home.builder.remove')}>×</button>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="builder-inspector cube-panel-inner">
          <h3>{t('home.builder.summary')}</h3>
          <dl className="inspect-list">
            <div><dt>{t('home.builder.selected')}</dt><dd>{widgets.length}</dd></div>
            <div><dt>{t('home.builder.deliver')}</dt><dd>{deliverLabel}</dd></div>
            <div><dt>{t('home.builder.style')}</dt><dd>{styleLabel}</dd></div>
          </dl>
          <AppBrandingFields value={branding} onChange={setBranding} compact />
          <button type="button" className="btn-primary full agent-action-btn" disabled={!widgets.length || loading} onClick={handlePublish}>
            {loading ? publishGenerateLoading(t) : (
              <AgentButtonContent>{publishGenerateLabel(t)}</AgentButtonContent>
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
        defaultAppName={branding.appName || blockhubDemoAppNameI18n(t)}
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
