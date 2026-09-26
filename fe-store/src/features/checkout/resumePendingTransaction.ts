import type { AppStore } from '../../app/store'
import { pollTransaction } from './checkoutThunks'

export function resumePendingTransaction(store: AppStore): void {
  const { step, transaction } = store.getState().checkout
  const pending = transaction?.status === 'PENDING'
  if (step === 'processing' || (step === 'result' && pending)) {
    void store.dispatch(pollTransaction())
  }
}
