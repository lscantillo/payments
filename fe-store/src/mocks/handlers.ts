import { http, HttpResponse } from 'msw'
import { env } from '../config/env'
import type { CreateTransactionInput, Quote, TransactionStatus } from '../domain/types'

export const sampleQuote: Quote = {
  productAmountInCents: 8_900_000,
  baseFeeInCents: 150_000,
  shippingFeeInCents: 900_000,
  totalInCents: 9_950_000,
  currency: 'COP',
}

export const sampleProduct = {
  id: 'prod-1',
  name: 'Taza de cerámica Aurora',
  description: 'Gres esmaltado a mano, apto para uso diario. Cada pieza varía un poco en el borde.',
  imageUrl: '/product.svg',
  priceInCents: 8_900_000,
  currency: 'COP' as const,
  stock: 5,
}

function transactionBody(
  id: string,
  status: TransactionStatus,
  stock?: number,
): Record<string, unknown> {
  return {
    id,
    status,
    reference: `REF-${id}`,
    ...sampleQuote,
    ...(stock === undefined ? {} : { stock }),
  }
}

export function createHandlers() {
  let stock = sampleProduct.stock
  let sequence = 0
  const transactions = new Map<string, { token: string; polls: number }>()

  return [
    http.get(`${env.apiBaseUrl}/api/products/:id`, () =>
      HttpResponse.json({ ...sampleProduct, stock }),
    ),
    http.post(`${env.apiBaseUrl}/api/checkout/quote`, async ({ request }) => {
      const body = (await request.json()) as { productId?: string }
      if (!body.productId) {
        return HttpResponse.json({ message: 'Producto requerido.' }, { status: 400 })
      }
      return HttpResponse.json(sampleQuote)
    }),
    http.post(`${env.gatewayApiUrl}/tokens/cards`, async ({ request }) => {
      const body = (await request.json()) as { number?: string }
      if (body.number === '4111111111111111') {
        return HttpResponse.json({ data: { id: 'tok_declined' } }, { status: 201 })
      }
      return HttpResponse.json({ data: { id: 'tok_approved' } }, { status: 201 })
    }),
    http.post(`${env.apiBaseUrl}/api/transactions`, async ({ request }) => {
      const body = (await request.json()) as CreateTransactionInput
      sequence += 1
      const id = `tx-${sequence}`
      transactions.set(id, { token: body.cardToken, polls: 0 })
      return HttpResponse.json(transactionBody(id, 'PENDING'), { status: 201 })
    }),
    http.get(`${env.apiBaseUrl}/api/transactions/:id`, ({ params }) => {
      const id = String(params.id)
      const current = transactions.get(id)
      if (!current) return HttpResponse.json({ message: 'No encontrada' }, { status: 404 })
      current.polls += 1
      if (current.polls < 2) return HttpResponse.json(transactionBody(id, 'PENDING'))
      const status: TransactionStatus = current.token === 'tok_declined' ? 'DECLINED' : 'APPROVED'
      if (status === 'APPROVED') stock = Math.max(0, stock - 1)
      return HttpResponse.json(transactionBody(id, status, stock))
    }),
  ]
}
