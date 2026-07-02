/// <reference types="vite/client" />

declare const __APP_BUILD_VERSION__: string
declare const __APP_BUILD_TIME__: string

interface ImportMetaEnv {
  readonly VITE_ADMIN_URL: string
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
