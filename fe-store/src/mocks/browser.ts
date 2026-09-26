import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'

export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...createHandlers())
  await worker.start({ onUnhandledRequest: 'bypass' })
}
