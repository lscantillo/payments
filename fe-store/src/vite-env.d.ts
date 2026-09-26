interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PRODUCT_ID?: string
  readonly VITE_GATEWAY_API_URL?: string
  readonly VITE_GATEWAY_PUBLIC_KEY?: string
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
