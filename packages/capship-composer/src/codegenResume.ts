/** 智能出页 job 本地续跑（刷新后恢复轮询） */

const PREFIX = 'capship.codegen.v1:'

export type CodegenResumeState = {
  jobId: string
  keys: string[]
  appId: string
  savedAt: number
}

export function codegenResumeKey(appId: string): string {
  return `${PREFIX}${appId || 'preview-local'}`
}

export function saveCodegenResume(state: CodegenResumeState): void {
  try {
    localStorage.setItem(codegenResumeKey(state.appId), JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export function loadCodegenResume(appId: string): CodegenResumeState | null {
  try {
    const raw = localStorage.getItem(codegenResumeKey(appId))
    if (!raw) return null
    const data = JSON.parse(raw) as CodegenResumeState
    if (!data?.jobId) return null
    // 超过 2 小时视为过期
    if (Date.now() - (data.savedAt || 0) > 2 * 60 * 60 * 1000) {
      clearCodegenResume(appId)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearCodegenResume(appId: string): void {
  try {
    localStorage.removeItem(codegenResumeKey(appId))
  } catch {
    /* ignore */
  }
}
