/** 新版本部署后清除旧 token，避免 Admin/Home 登录态与缓存 JS 不一致 */
export function syncBuildVersion(tokenKey: string, versionKey: string): void {
  const version = typeof __APP_BUILD_VERSION__ === 'string' ? __APP_BUILD_VERSION__ : ''
  if (!version) return
  try {
    const prev = localStorage.getItem(versionKey)
    if (prev && prev !== version) {
      localStorage.removeItem(tokenKey)
    }
    localStorage.setItem(versionKey, version)
  } catch {
    /* private mode */
  }
}
