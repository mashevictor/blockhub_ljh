import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlCacheVersionPlugin, readAppVersion } from '../scripts/vite-plugin-html-cache.mjs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const appVersion = readAppVersion(path.join(dir, 'package.json'))

/** /industry 汇总页已下线；dev 时避免 public/industry/ 静态目录抢占路由 */
function industryHubRedirectPlugin(): Plugin {
  return {
    name: 'industry-hub-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (url === '/industry' || url === '/industry/') {
          res.statusCode = 302
          res.setHeader('Location', '/#product')
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, '')
  const devDefaultProxy = 'http://127.0.0.1:8001'
  const apiProxyTarget =
    env.VITE_API_PROXY || process.env.VITE_API_PROXY || (mode === 'development' ? devDefaultProxy : 'http://127.0.0.1:8001')
  // eslint-disable-next-line no-console
  console.log(`[home] API proxy -> ${apiProxyTarget}`)

  return {
    plugins: [react(), htmlCacheVersionPlugin({ appName: 'home', appVersion }), industryHubRedirectPlugin()],
    resolve: {
      alias: [
        { find: '@shared', replacement: path.resolve(__dirname, '../shared') },
        // 子路径必须精确匹配，且排在 @blockhub/web-core 之前，避免拼成 DeveloperBlueprintPanel.tsx/xxx
        {
          find: /^@blockhub\/web-core\/gtgt$/,
          replacement: path.resolve(__dirname, '../packages/web-core/src/GtgtStepComposer.tsx'),
        },
        {
          find: /^@blockhub\/web-core\/resolveFormSteps$/,
          replacement: path.resolve(__dirname, '../packages/web-core/src/resolveFormSteps.ts'),
        },
        {
          find: /^@blockhub\/web-core$/,
          replacement: path.resolve(
            __dirname,
            '../packages/web-core/src/DeveloperBlueprintPanel.tsx',
          ),
        },
        {
          find: '@capship/composer/styles.css',
          replacement: path.resolve(__dirname, '../packages/capship-composer/src/styles.css'),
        },
        {
          find: '@capship/composer',
          replacement: path.resolve(__dirname, '../packages/capship-composer/src'),
        },
      ],
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
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': { target: apiProxyTarget, changeOrigin: true },
        // 本地联调 Runtime（设备报修等）：home:5173/r/* → runtime-web:5175
        '/r': {
          target: 'http://127.0.0.1:5175',
          changeOrigin: true,
          // runtime-web base 已是 /r/，原样转发
        },
      },
    },
  }
})
