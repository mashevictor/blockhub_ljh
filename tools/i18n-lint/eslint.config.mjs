/**
 * Gradual i18n UI-literal gate (P5).
 * Allowlist: packages already on t()/tf() — expand over time.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import tseslint from 'typescript-eslint'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const blockhubI18n = require(path.join(__dirname, '../../packages/eslint-plugin-blockhub-i18n/index.js'))

const allowlist = [
  '../../packages/web-core/src/GtgtStepComposer.tsx',
  '../../packages/web-capability-leave-request/src/**/*.{ts,tsx}',
  '../../packages/web-capability-device-repair/src/**/*.{ts,tsx}',
  '../../packages/web-capability-expense-claim/src/**/*.{ts,tsx}',
  '../../packages/web-capability-member-loyalty/src/**/*.{ts,tsx}',
  '../../packages/web-capability-approval/src/**/*.{ts,tsx}',
]

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/*.d.ts', '**/locales/**'],
  },
  {
    files: allowlist,
    plugins: {
      '@blockhub/i18n': blockhubI18n,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      '@blockhub/i18n/no-ui-literal': 'error',
    },
  },
)
