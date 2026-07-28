/**
 * @blockhub/eslint-plugin-i18n
 * Ban user-visible UI string literals (CJK) outside t()/tf() calls.
 */
'use strict'

const CJK = /[\u4e00-\u9fff]/

const I18N_CALLEES = new Set(['t', 'tf', 'translate', 'formatMessage'])

function isI18nCallee(node) {
  if (!node) return false
  if (node.type === 'Identifier') return I18N_CALLEES.has(node.name)
  if (node.type === 'MemberExpression') {
    const prop = node.property
    if (prop && prop.type === 'Identifier' && I18N_CALLEES.has(prop.name)) return true
    if (prop && prop.type === 'Identifier' && prop.name === 't') return true
  }
  return false
}

function isInsideI18nCall(node) {
  let cur = node.parent
  while (cur) {
    if (cur.type === 'CallExpression' && isI18nCallee(cur.callee)) return true
    // allow tf('key', '中文fallback') — second arg is intentional
    cur = cur.parent
  }
  return false
}

function isTestFile(filename) {
  return /\.(test|spec)\.[jt]sx?$/i.test(filename) || /[\\/]__tests__[\\/]/.test(filename)
}

const UI_ATTRS = new Set([
  'title',
  'placeholder',
  'aria-label',
  'aria-description',
  'alt',
  'label',
  'helperText',
  'emptyText',
])

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded CJK UI literals; use t()/tf() instead',
    },
    schema: [],
    messages: {
      jsxText: 'Hardcoded UI text {{text}} — use t()/tf() (i18n).',
      jsxAttr: 'Hardcoded UI attribute {{attr}}={{text}} — use t()/tf() (i18n).',
    },
  },
  create(context) {
    const filename = context.filename || context.getFilename()
    if (isTestFile(filename)) return {}

    return {
      JSXText(node) {
        const raw = String(node.value || '')
        const text = raw.replace(/\s+/g, ' ').trim()
        if (!text || !CJK.test(text)) return
        if (isInsideI18nCall(node)) return
        context.report({
          node,
          messageId: 'jsxText',
          data: { text: JSON.stringify(text.slice(0, 40)) },
        })
      },
      JSXAttribute(node) {
        const name = node.name && node.name.name
        if (!name || !UI_ATTRS.has(name)) return
        const value = node.value
        if (!value || value.type !== 'Literal' || typeof value.value !== 'string') return
        if (!CJK.test(value.value)) return
        if (isInsideI18nCall(node)) return
        context.report({
          node: value,
          messageId: 'jsxAttr',
          data: { attr: name, text: JSON.stringify(value.value.slice(0, 40)) },
        })
      },
    }
  },
}

module.exports = {
  rules: {
    'no-ui-literal': rule,
  },
  configs: {
    recommended: {
      plugins: ['@blockhub/i18n'],
      rules: {
        '@blockhub/i18n/no-ui-literal': 'error',
      },
    },
  },
}
