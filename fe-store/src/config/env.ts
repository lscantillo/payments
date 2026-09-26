export interface AppEnv {
  apiBaseUrl: string
  productId: string
  gatewayApiUrl: string
  gatewayPublicKey: string
  useMocks: boolean
}

function read(name: keyof ImportMetaEnv, fallback = ''): string {
  const value = import.meta.env[name]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export const env: AppEnv = {
  apiBaseUrl: read('VITE_API_BASE_URL', 'http://localhost:4567'),
  productId: read('VITE_PRODUCT_ID', 'prod-1'),
  gatewayApiUrl: read('VITE_GATEWAY_API_URL', 'https://api-sandbox.co.uat.wompi.dev/v1'),
  gatewayPublicKey: read('VITE_GATEWAY_PUBLIC_KEY', ''),
  useMocks: read('VITE_USE_MOCKS') === 'true',
}
