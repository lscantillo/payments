import { http, HttpResponse } from 'msw'
import { env } from '../config/env'
import { server } from '../test/setup'
import { createQuote, createTransaction, getProduct, getProducts, getTransaction } from './apiClient'
import { ApiError } from './apiError'
import { sampleProduct, sampleQuote } from '../mocks/handlers'

describe('apiClient', () => {
  it('loads a product and creates a quote', async () => {
    await expect(getProducts()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'prod-1' })]))
    await expect(getProduct('prod-1')).resolves.toMatchObject({ id: 'prod-1', name: sampleProduct.name })
    await expect(createQuote('prod-1')).resolves.toEqual(sampleQuote)
  })

  it('surfaces JSON and non-JSON errors', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/products/:id`, () =>
        HttpResponse.json({ message: 'Agotado el catálogo' }, { status: 404 }),
      ),
    )
    await expect(getProduct('missing')).rejects.toBeInstanceOf(ApiError)
    await expect(getProduct('missing')).rejects.toThrow('Agotado el catálogo')

    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, () =>
        new HttpResponse('nope', { status: 500 }),
      ),
    )
    await expect(getTransaction('tx-1')).rejects.toThrow(/500/)
  })

  it('posts a transaction without card secrets', async () => {
    let body: Record<string, unknown> = {}
    let authorization: string | null = null
    server.use(
      http.post(`${env.apiBaseUrl}/api/transactions`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({
          id: 'tx-9',
          status: 'PENDING',
          reference: 'REF-tx-9',
          ...sampleQuote,
        })
      }),
    )
    const transaction = await createTransaction(
      {
        productId: 'prod-1',
        cardToken: 'tok_approved',
        installments: 1,
        customer: { fullName: 'Ada', email: 'ada@example.com', phone: '3001234567' },
        delivery: { address: 'Calle 10', city: 'Bogota', region: 'Cundinamarca' },
      },
      'checkout-token',
    )
    expect(transaction.id).toBe('tx-9')
    expect(authorization).toBe('Bearer checkout-token')
    expect(body).not.toHaveProperty('number')
    expect(body).not.toHaveProperty('cvc')
    expect(body).not.toHaveProperty('checkoutToken')
    expect(body.cardToken).toBe('tok_approved')
  })
})
