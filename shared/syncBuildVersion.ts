/** 记录当前 HTML 构建版本。

部署后靠 index.html 的 /version.json + `_bhv` 强制刷新即可拿到新 JS。
不再因版本变化清除登录 token，避免「已登录 → 生成应用 → /r/」被踢回登录页。
*/
export function syncBuildVersion(_tokenKey: string, versionKey: string): void {
  const version = typeof __APP_BUILD_VERSION__ === 'string' ? __APP_BUILD_VERSION__ : ''
  if (!version) return
  try {
    localStorage.setItem(versionKey, version)
  } catch {
    /* private mode */
  }
}
