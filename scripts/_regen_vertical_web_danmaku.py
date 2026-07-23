#!/usr/bin/env python3
"""Regenerate vertical-ops Web widgets + danmaku probes + manifest from catalog."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.vertical_ops_catalog import VERTICAL_OPS, all_kind_keys  # noqa: E402


def gen_web() -> None:
    widgets = []
    configs = {}
    for ind_key, ind in VERTICAL_OPS.items():
        for kind, meta in ind["kinds"].items():
            fields = []
            for item in meta["fields"]:
                key, label = item[0], item[1]
                optional = len(item) > 2 and item[2]
                f: dict = {"key": key, "label": label}
                if optional or key == "note":
                    f["optional"] = True
                if key == "note":
                    f["inputType"] = "textarea"
                fields.append(f)
            if not any(f["key"] == "title" for f in fields):
                fields.insert(0, {"key": "title", "label": "标题"})
            configs[kind] = {
                "kind": kind,
                "heading": meta["name"],
                "accent": ind["color"],
                "industry": ind_key,
                "fields": fields,
                "doneLabel": meta.get("done_label") or "完成",
                "doneAction": meta.get("done_action") or "done",
            }
            wname = "".join(p.title() for p in kind.split("_")) + "Widget"
            widgets.append((kind, wname))

    configs_json = json.dumps(configs, ensure_ascii=False, indent=2)
    widget_exports = "\n".join(
        f"export const {w} = (props: {{ node: SchemaNode }}) => <VerticalOpsPanel kind={{'{k}' as OpsKind}} node={{props.node}} />"
        for k, w in widgets
    )
    register_lines = "\n".join(
        f"registerWidget('{w}', {w} as Parameters<typeof registerWidget>[1])" for _, w in widgets
    )
    kinds_type = json.dumps([k for k, _ in widgets])
    tsx = f'''import {{ useCallback, useEffect, useMemo, useState }} from 'react'
import type {{ SchemaNode }} from '@blockhub/web-core'
import {{ apiFetch, GtgtStepComposer, useRuntime, type GtgtStep }} from '@blockhub/web-core'

export type OpsKind = {kinds_type}[number]

interface RecordItem {{
  id: string
  record_no: string
  title: string
  field_a: string
  field_b: string
  field_c: string
  field_d: string
  note: string
  status: string
}}

interface FieldDef {{
  key: 'title' | 'field_a' | 'field_b' | 'field_c' | 'field_d' | 'note'
  label: string
  placeholder?: string
  optional?: boolean
  inputType?: string
  choices?: Array<{{ value: string; label: string }}>
}}

interface KindConfig {{
  kind: OpsKind
  heading: string
  accent: string
  industry: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}}

const CONFIGS = {configs_json} as Record<OpsKind, KindConfig>

function VerticalOpsPanel({{ kind, node }}: {{ kind: OpsKind; node: SchemaNode }}) {{
  const cfg = CONFIGS[kind]
  const {{ token, appId }} = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {{
    if (!token) return
    try {{
      const q = new URLSearchParams()
      if (appId) q.set('app_id', appId)
      const data = await apiFetch<{{ total: number; items: RecordItem[] }}>(
        `/api/v1/vertical-ops/${{kind}}/records?${{q}}`,
        token,
      )
      setItems(data.items || [])
      setErr('')
    }} catch (e) {{
      setErr(e instanceof Error ? e.message : '加载失败')
    }}
  }}, [token, appId, kind])

  useEffect(() => {{ void load() }}, [load])

  const steps: GtgtStep[] = useMemo(
    () =>
      cfg.fields.map((f) => ({{
        key: f.key,
        label: f.label,
        optional: f.optional,
        inputType: f.inputType,
        choices: f.choices,
        placeholder: f.placeholder,
      }})),
    [cfg],
  )

  const onSubmit = async (values: Record<string, string>) => {{
    if (!token) return
    setBusy(true)
    try {{
      await apiFetch(`/api/v1/vertical-ops/${{kind}}/records`, token, {{
        method: 'POST',
        body: JSON.stringify({{
          title: values.title || values.field_a || cfg.heading,
          field_a: values.field_a || '',
          field_b: values.field_b || '',
          field_c: values.field_c || '',
          field_d: values.field_d || '',
          note: values.note || '',
          app_public_id: appId || '',
          industry_key: cfg.industry,
        }}),
      }})
      setResetKey((k) => k + 1)
      await load()
    }} catch (e) {{
      setErr(e instanceof Error ? e.message : '提交失败')
    }} finally {{
      setBusy(false)
    }}
  }}

  const act = async (id: string, action: string) => {{
    if (!token) return
    await apiFetch(`/api/v1/vertical-ops/${{kind}}/records/${{id}}/${{action}}`, token, {{ method: 'POST', body: '{{}}' }})
    await load()
  }}

  return (
    <div className="bh-flow-body" style={{{{ ['--bh-accent' as string]: cfg.accent }}}}>
      <h2 style={{{{ margin: '0 0 8px', color: cfg.accent }}}}>{{cfg.heading}}</h2>
      <p style={{{{ opacity: 0.7, marginTop: 0 }}}}>空库空列表 · >> 单字段步进 · 真 API</p>
      {{err ? <p style={{{{ color: '#b91c1c' }}}}>{{err}}</p> : null}}
      <GtgtStepComposer key={{resetKey}} steps={{steps}} onComplete={{onSubmit}} disabled={{busy || !token}} />
      <ul style={{{{ listStyle: 'none', padding: 0, marginTop: 16 }}}}>
        {{items.map((it) => (
          <li key={{it.id}} style={{{{ borderTop: '1px solid #e5e7eb', padding: '10px 0' }}}}>
            <div><strong>{{it.record_no}}</strong> · {{it.title}} · {{it.status}}</div>
            <div style={{{{ opacity: 0.7, fontSize: 13 }}}}>{{[it.field_a, it.field_b, it.note].filter(Boolean).join(' · ')}}</div>
            {{it.status === 'open' ? (
              <button type="button" onClick={{() => void act(it.id, cfg.doneAction)}} style={{{{ marginTop: 6 }}}}>
                {{cfg.doneLabel}}
              </button>
            ) : null}}
          </li>
        ))}}
      </ul>
      {{!items.length ? <p style={{{{ opacity: 0.55 }}}}>暂无记录</p> : null}}
      <span style={{{{ display: 'none' }}}}>{{String(node?.id || '')}}</span>
    </div>
  )
}}

{widget_exports}
'''
    pkg = ROOT / "packages/web-capability-vertical-ops/src"
    (pkg / "VerticalOpsWidgets.tsx").write_text(tsx, encoding="utf-8")
    (pkg / "index.ts").write_text(
        "import { registerWidget } from '@blockhub/web-core'\n"
        + "import {\n  "
        + ",\n  ".join(w for _, w in widgets)
        + "\n} from './VerticalOpsWidgets'\n\n"
        + register_lines
        + "\n",
        encoding="utf-8",
    )
    print("web widgets", len(widgets))


def patch_danmaku() -> None:
    path = ROOT / "backend/app/services/danmaku_smoke.py"
    text = path.read_text(encoding="utf-8")
    for kind in all_kind_keys():
        if f'"{kind}":' in text:
            continue
        line = (
            f'    "{kind}": ("app.services.vertical_ops_store", "list_records", '
            f'"/vertical-ops/{kind}/records"),\n'
        )
        text = text.replace(
            '    "mkt_content": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_content/records"),\n',
            '    "mkt_content": ("app.services.vertical_ops_store", "list_records", "/vertical-ops/mkt_content/records"),\n' + line,
        )
        if f'"{kind}":' not in text:
            # append before closing of _STORE_PROBES
            text = text.replace(
                "\n}\n\n# 共享能力",
                "\n" + line + "}\n\n# 共享能力",
                1,
            )
    path.write_text(text, encoding="utf-8")
    print("danmaku probes updated")


def main() -> None:
    gen_web()
    patch_danmaku()
    print("kinds", len(all_kind_keys()))


if __name__ == "__main__":
    main()
