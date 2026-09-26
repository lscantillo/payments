import type { Transaction } from '../domain/types'
import { getTransaction } from './apiClient'

export const POLL_INTERVAL_MS = 2000
export const POLL_TIMEOUT_MS = 30_000

export const pollConfig = {
  intervalMs: POLL_INTERVAL_MS,
  timeoutMs: POLL_TIMEOUT_MS,
  now: (): number => Date.now(),
  sleep: (ms: number): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    }),
}

export function resetPollConfig(): void {
  pollConfig.intervalMs = POLL_INTERVAL_MS
  pollConfig.timeoutMs = POLL_TIMEOUT_MS
  pollConfig.now = () => Date.now()
  pollConfig.sleep = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
}

export async function pollUntilSettled(id: string): Promise<Transaction> {
  const started = pollConfig.now()
  let current = await getTransaction(id)
  while (current.status === 'PENDING' && pollConfig.now() - started < pollConfig.timeoutMs) {
    await pollConfig.sleep(pollConfig.intervalMs)
    current = await getTransaction(id)
  }
  return current
}
