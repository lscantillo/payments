import { sampleQuote } from '../../mocks/handlers'
import { transactionCreated } from './checkoutActions'
import {
  cancelCheckout,
  checkoutReducer,
  editPayment,
  openPayment,
  patchCustomer,
  readyForSummary,
} from './checkoutSlice'
import { pollTransaction, submitPayment } from './checkoutThunks'

const summary = {
  customer: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '3001234567' },
  delivery: { address: 'Calle 10', city: 'Bogota', region: 'Cundinamarca' },
  quote: sampleQuote,
  token: 'tok_approved',
  cardMeta: {
    brand: 'visa' as const,
    last4: '4242',
    holder: 'Ada Lovelace',
    expMonth: '12',
    expYear: '30',
  },
}

describe('checkout slice', () => {
  it('moves through payment, summary and a cleared session', () => {
    const opened = checkoutReducer(undefined, openPayment())
    const named = checkoutReducer(opened, patchCustomer({ fullName: 'Ada Lovelace' }))
    const ready = checkoutReducer(named, readyForSummary(summary))
    expect(ready.step).toBe('summary')
    expect(ready.token).toBe('tok_approved')
    const editing = checkoutReducer(ready, editPayment())
    expect(editing.step).toBe('payment')
    expect(editing.token).toBeNull()
    expect(editing.customer.fullName).toBe('Ada Lovelace')
    expect(checkoutReducer(editing, cancelCheckout()).step).toBe('product')
  })

  it('keeps the summary when submit fails before a transaction exists', () => {
    const ready = checkoutReducer(undefined, readyForSummary(summary))
    const processing = checkoutReducer(ready, submitPayment.pending('req'))
    expect(processing.step).toBe('processing')
    const failed = checkoutReducer(
      processing,
      submitPayment.rejected(null, 'req', undefined, 'No se pudo procesar el pago.'),
    )
    expect(failed.step).toBe('summary')
    expect(failed.error).toMatch(/procesar/)
  })

  it('marks an existing transaction as failed and finishes a poll', () => {
    const withTransaction = checkoutReducer(
      checkoutReducer(undefined, readyForSummary(summary)),
      transactionCreated({
        id: 'tx-1',
        status: 'PENDING',
        reference: 'REF-tx-1',
        ...sampleQuote,
      }),
    )
    const failed = checkoutReducer(
      withTransaction,
      submitPayment.rejected(null, 'req', undefined, 'Corte de red'),
    )
    expect(failed.step).toBe('result')
    expect(failed.transaction?.status).toBe('ERROR')

    const polling = checkoutReducer(
      withTransaction,
      pollTransaction.rejected(null, 'req', undefined, 'No se pudo consultar el pago.'),
    )
    expect(polling.step).toBe('result')
    expect(polling.transaction?.status).toBe('ERROR')
  })
})
