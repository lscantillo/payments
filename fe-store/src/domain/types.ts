export type Currency = 'COP'

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR'

export type CheckoutStep = 'product' | 'payment' | 'summary' | 'processing' | 'result'

export type CardBrand = 'visa' | 'mastercard' | 'unknown'

export interface Product {
  id: string
  name: string
  description: string
  imageUrl: string
  priceInCents: number
  currency: Currency
  stock: number
}

export interface Quote {
  productAmountInCents: number
  baseFeeInCents: number
  shippingFeeInCents: number
  totalInCents: number
  currency: Currency
}

export interface CustomerInput {
  fullName: string
  email: string
  phone: string
}

export interface DeliveryInput {
  address: string
  city: string
  region: string
}

export interface CardMeta {
  brand: CardBrand
  last4: string
  holder: string
  expMonth: string
  expYear: string
}

export interface CardInput {
  number: string
  cvc: string
  expMonth: string
  expYear: string
  holder: string
}

export interface Transaction extends Quote {
  id: string
  status: TransactionStatus
  reference: string
  stock?: number
}

export interface CreateTransactionInput {
  productId: string
  cardToken: string
  installments: number
  customer: CustomerInput
  delivery: DeliveryInput
}
