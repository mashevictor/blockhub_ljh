import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlCacheVersionPlugin, readAppVersion } from '../scripts/vite-plugin-html-cache.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const appVersion = readAppVersion(path.join(dir, 'package.json'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '')
  // 本地开发默认走演示服务器（Windows 常无 PostgreSQL）；有完整本地环境可在 .env.local 设 VITE_API_PROXY=http://127.0.0.1:8001
  const devDefaultProxy = 'http://101.32.209.251'
  const apiProxyTarget =
    env.VITE_API_PROXY || process.env.VITE_API_PROXY || (mode === 'development' ? devDefaultProxy : 'http://127.0.0.1:8001')
  // eslint-disable-next-line no-console
  console.log(`[admin] API proxy -> ${apiProxyTarget}`)

  return {
    base: '/admin/',
    plugins: [react(), htmlCacheVersionPlugin({ appName: 'admin', appVersion })],
    publicDir: path.resolve(__dirname, '../home/public'),
    resolve: {
      alias: { '@shared': path.resolve(__dirname, '../shared') },
    },
    server: {
      port: 5174,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
      },
    },
  }
})
