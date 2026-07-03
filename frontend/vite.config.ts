import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlCacheVersionPlugin, readAppVersion } from '../scripts/vite-plugin-html-cache.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const appVersion = readAppVersion(path.join(dir, 'package.json'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '')
  const apiProxyTarget = env.VITE_API_PROXY || process.env.VITE_API_PROXY || 'http://127.0.0.1:8001'
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
