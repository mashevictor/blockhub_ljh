import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { htmlCacheVersionPlugin, readAppVersion } from '../scripts/vite-plugin-html-cache.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dir, '..')
const appVersion = readAppVersion(path.join(dir, 'package.json'))

// 自动发现 packages/web-capability-* 并生成 @blockhub/<pkg> 别名，
// 新增能力包无需再手动编辑本文件（解耦：注册一处即流通）。
const packagesDir = path.join(root, 'packages')
const capabilityAliases: Record<string, string> = {}
if (fs.existsSync(packagesDir)) {
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('web-capability-')) {
      capabilityAliases[`@blockhub/${entry.name}`] = path.join(
        packagesDir,
        entry.name,
        'src',
      )
    }
  }
}

export default defineConfig({
  base: '/r/',
  plugins: [react(), htmlCacheVersionPlugin({ appName: 'runtime', appVersion })],
  resolve: {
    alias: {
      '@shared': path.join(root, 'shared'),
      '@blockhub/i18n/react': path.join(root, 'packages/i18n/src/react.tsx'),
      '@blockhub/i18n': path.join(root, 'packages/i18n/src/index.ts'),
      '@blockhub/web-core': path.join(root, 'packages/web-core/src'),
      '@capship/composer': path.join(root, 'packages/capship-composer/src'),
      '@capship/composer/styles.css': path.join(root, 'packages/capship-composer/src/styles.css'),
      ...capabilityAliases,
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.endsWith('/react')) {
            return 'react-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
})
