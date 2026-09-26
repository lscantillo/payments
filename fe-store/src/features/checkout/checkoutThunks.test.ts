import { http, HttpResponse } from 'msw'
import { createAppStore } from '../../app/store'
import { env } from '../../config/env'
import { sampleQuote } from '../../mocks/handlers'
import { server } from '../../test/setup'
import { readyForSummary } from './checkoutSlice'
import { loadQuote, pollTransaction, submitPayment } from './checkoutThunks'
import { fetchProduct } from '../product/productSlice'

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

describe('checkout thunks', () => {
  it('rejects a payment when the token is missing and a poll without a transaction', async () => {
    const { store } = createAppStore()
    await store.dispatch(submitPayment())
    expect(store.getState().checkout.step).toBe('summary')
    await store.dispatch(pollTransaction())
    expect(store.getState().checkout.error).toMatch(/No hay/)
  })

  it('approves a payment and updates stock', async () => {
    const { store } = createAppStore()
    await store.dispatch(fetchProduct('prod-1'))
    store.dispatch(readyForSummary(summary))
    await store.dispatch(submitPayment())
    expect(store.getState().checkout.transaction?.status).toBe('APPROVED')
    expect(store.getState().checkout.token).toBeNull()
    expect(store.getState().product.product?.stock).toBe(4)
    expect(JSON.stringify(store.getState())).not.toContain('4242424242424242')
  })

  it('records a declined payment without changing stock', async () => {
    const { store } = createAppStore()
    await store.dispatch(fetchProduct('prod-1'))
    store.dispatch(readyForSummary({ ...summary, token: 'tok_declined' }))
    await store.dispatch(submitPayment())
    expect(store.getState().checkout.transaction?.status).toBe('DECLINED')
    expect(store.getState().product.product?.stock).toBe(5)
  })

  it('stores a quote error', async () => {
    server.use(
      http.post(`${env.apiBaseUrl}/api/checkout/quote`, () =>
        HttpResponse.json({ message: 'Tarifa no disponible' }, { status: 503 }),
      ),
    )
    const { store } = createAppStore()
    await store.dispatch(loadQuote('prod-1'))
    expect(store.getState().checkout.error).toBe('Tarifa no disponible')
  })
})
