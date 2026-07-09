import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlCacheVersionPlugin, readAppVersion } from '../scripts/vite-plugin-html-cache.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const appVersion = readAppVersion(path.join(dir, 'package.json'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '')
  const devDefaultProxy = 'http://127.0.0.1:8001'
  const apiProxyTarget =
    env.VITE_API_PROXY || process.env.VITE_API_PROXY || (mode === 'development' ? devDefaultProxy : 'http://127.0.0.1:8001')
  // eslint-disable-next-line no-console
  console.log(`[home] API proxy -> ${apiProxyTarget}`)

  return {
    plugins: [react(), htmlCacheVersionPlugin({ appName: 'home', appVersion })],
    resolve: {
      alias: { '@shared': path.resolve(__dirname, '../shared') },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            http: ['axios'],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
      },
    },
  }
})
