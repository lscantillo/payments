import { http, HttpResponse } from 'msw'
import { env } from '../config/env'
import type { CreateTransactionInput, Product, Quote, TransactionStatus } from '../domain/types'

const BASE_FEE_IN_CENTS = 150_000
const SHIPPING_FEE_IN_CENTS = 900_000

export function quoteFor(priceInCents: number): Quote {
  return {
    productAmountInCents: priceInCents,
    baseFeeInCents: BASE_FEE_IN_CENTS,
    shippingFeeInCents: SHIPPING_FEE_IN_CENTS,
    totalInCents: priceInCents + BASE_FEE_IN_CENTS + SHIPPING_FEE_IN_CENTS,
    currency: 'COP',
    checkoutToken: 'checkout-token',
  }
}

export const catalog: Product[] = [
  {
    id: 'prod-1',
    name: 'Taza de cerámica Aurora',
    description: 'Gres esmaltado a mano, apto para uso diario. Cada pieza varía un poco en el borde.',
    imageUrl: '/products/aurora.svg',
    priceInCents: 8_900_000,
    currency: 'COP',
    stock: 5,
  },
  {
    id: 'prod-2',
    name: 'Plato hondo Siena',
    description: 'Plato hondo de gres rojo con borde irregular y esmalte mate. Sirve para pasta o ensalada.',
    imageUrl: '/products/siena.svg',
    priceInCents: 12_400_000,
    currency: 'COP',
    stock: 3,
  },
  {
    id: 'prod-3',
    name: 'Jarra Litoral',
    description: 'Jarra de un litro con asa gruesa. El vidriado verde cambia de tono con la luz.',
    imageUrl: '/products/litoral.svg',
    priceInCents: 15_600_000,
    currency: 'COP',
    stock: 2,
  },
  {
    id: 'prod-4',
    name: 'Bowl Nube',
    description: 'Bowl bajo para el desayuno. Interior blanco y exterior del color de la arena.',
    imageUrl: '/products/nube.svg',
    priceInCents: 7_200_000,
    currency: 'COP',
    stock: 8,
  },
]

export const sampleProduct = catalog[0]
export const sampleQuote = quoteFor(sampleProduct.priceInCents)

function findProduct(id: string): Product | undefined {
  return catalog.find((product) => product.id === id)
}

export function createHandlers() {
  const stocks = new Map(catalog.map((product) => [product.id, product.stock]))
  let sequence = 0
  const transactions = new Map<string, { token: string; polls: number; productId: string }>()

  function withStock(product: Product): Product {
    return { ...product, stock: stocks.get(product.id) ?? product.stock }
  }

  return [
    http.get(`${env.apiBaseUrl}/api/products`, () =>
      HttpResponse.json(catalog.map(withStock)),
    ),
    http.get(`${env.apiBaseUrl}/api/products/:id`, ({ params }) => {
      const product = findProduct(String(params.id))
      if (!product) return HttpResponse.json({ message: 'Producto no encontrado.' }, { status: 404 })
      return HttpResponse.json(withStock(product))
    }),
    http.post(`${env.apiBaseUrl}/api/checkout/quote`, async ({ request }) => {
      const body = (await request.json()) as { productId?: string }
      const product = body.productId ? findProduct(body.productId) : undefined
      if (!product) {
        return HttpResponse.json({ message: 'Producto requerido.' }, { status: 400 })
      }
      return HttpResponse.json(quoteFor(product.priceInCents))
    }),
    http.post(`${env.gatewayApiUrl}/tokens/cards`, async ({ request }) => {
      const body = (await request.json()) as { number?: string }
      if (body.number === '4111111111111111') {
        return HttpResponse.json({ data: { id: 'tok_declined' } }, { status: 201 })
      }
      return HttpResponse.json({ data: { id: 'tok_approved' } }, { status: 201 })
    }),
    http.post(`${env.apiBaseUrl}/api/transactions`, async ({ request }) => {
      if (request.headers.get('Authorization') !== 'Bearer checkout-token') {
        return HttpResponse.json({ message: 'La cotización expiró. Vuelve a confirmar el pago.' }, { status: 401 })
      }
      const body = (await request.json()) as CreateTransactionInput
      const product = findProduct(body.productId)
      if (!product) {
        return HttpResponse.json({ message: 'Producto requerido.' }, { status: 400 })
      }
      sequence += 1
      const id = `tx-${sequence}`
      transactions.set(id, { token: body.cardToken, polls: 0, productId: product.id })
      return HttpResponse.json(
        { id, status: 'PENDING', reference: `REF-${id}`, ...quoteFor(product.priceInCents) },
        { status: 201 },
      )
    }),
    http.get(`${env.apiBaseUrl}/api/transactions/:id`, ({ params }) => {
      const id = String(params.id)
      const current = transactions.get(id)
      if (!current) return HttpResponse.json({ message: 'No encontrada' }, { status: 404 })
      const product = findProduct(current.productId)
      const quote = quoteFor(product?.priceInCents ?? sampleProduct.priceInCents)
      current.polls += 1
      if (current.polls < 2) {
        return HttpResponse.json({ id, status: 'PENDING' satisfies TransactionStatus, reference: `REF-${id}`, ...quote })
      }
      const status: TransactionStatus = current.token === 'tok_declined' ? 'DECLINED' : 'APPROVED'
      if (status === 'APPROVED' && product) {
        stocks.set(product.id, Math.max(0, (stocks.get(product.id) ?? product.stock) - 1))
      }
      return HttpResponse.json({
        id,
        status,
        reference: `REF-${id}`,
        ...quote,
        stock: stocks.get(current.productId),
      })
    }),
  ]
}
