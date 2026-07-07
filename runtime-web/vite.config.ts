import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

export default defineConfig({
  base: '/r/',
  plugins: [react()],
  resolve: {
    alias: {
      '@blockhub/web-core': path.join(root, 'packages/web-core/src'),
      '@blockhub/web-capability-chat': path.join(root, 'packages/web-capability-chat/src'),
      '@blockhub/web-capability-approval': path.join(root, 'packages/web-capability-approval/src'),
      '@blockhub/web-capability-voice': path.join(root, 'packages/web-capability-voice/src'),
      '@blockhub/web-capability-kb': path.join(root, 'packages/web-capability-kb/src'),
      '@blockhub/web-capability-dashboard': path.join(root, 'packages/web-capability-dashboard/src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
})
