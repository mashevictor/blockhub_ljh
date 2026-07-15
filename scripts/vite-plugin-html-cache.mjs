import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function buildVersionLabel(appVersion = '1.0.0') {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${date}-${time}-v${appVersion}`
}

export function readAppVersion(packageJsonPath) {
  const raw = readFileSync(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(raw)
  return pkg.version ?? '1.0.0'
}

/** @param {{ appVersion?: string, appName: 'home' | 'admin' | 'runtime' }} options */
export function htmlCacheVersionPlugin(options) {
  const appVersion = options.appVersion ?? '1.0.0'
  const version = buildVersionLabel(appVersion)
  const builtAt = new Date().toISOString()

  return {
    name: 'blockhub-html-cache-version',
    transformIndexHtml(html) {
      return html
        .replace(/__BUILD_VERSION__/g, version)
        .replace(/__BUILD_TIME__/g, builtAt)
        .replace(/__APP_NAME__/g, options.appName)
    },
    config() {
      return {
        define: {
          __APP_BUILD_VERSION__: JSON.stringify(version),
          __APP_BUILD_TIME__: JSON.stringify(builtAt),
        },
      }
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir ?? 'dist'
      const payload = { app: options.appName, version, builtAt }
      writeFileSync(path.join(outDir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
      writeFileSync(path.join(outDir, 'version.txt'), `${version}\n`, 'utf-8')
    },
  }
}
