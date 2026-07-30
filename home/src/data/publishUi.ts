/** 生成 / 预约相关统一文案（中文 fallback；React UI 请用 i18n/publishLabels.ts + useT） */
export const GENERATE_APP_LABEL = '生成应用'
export const GENERATE_APP_LOADING = '生成中…'
export const BOOK_DEMO_LABEL = '提交预约'
export const BOOK_DEMO_LOADING = '提交中…'

export const GENERATE_ERROR_FALLBACK = '生成失败，请稍后再试'

/** 生成遮罩进度条 0→100% 时长（与 API 并行，不阻塞动画） */
export const PUBLISH_OVERLAY_PROGRESS_MS = 3000
/** 「读懂需求」步展示时长，之后切到「正在生成应用」 */
export const PUBLISH_ANALYZE_PHASE_MS = 600
