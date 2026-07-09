import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

const root = path.resolve(__dirname, '..')

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
  plugins: [react()],
  resolve: {
    alias: {
      '@blockhub/web-core': path.join(root, 'packages/web-core/src'),
      ...capabilityAliases,
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
})
