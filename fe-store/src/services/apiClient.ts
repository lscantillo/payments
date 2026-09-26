import { env } from '../config/env'
import type { CreateTransactionInput, Product, Quote, Transaction } from '../domain/types'
import { ApiError } from './apiError'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `No se pudo completar la solicitud (${response.status}).`
    try {
      const body = (await response.json()) as { message?: string }
      if (typeof body.message === 'string' && body.message.length > 0) message = body.message
    } catch {
      message = `No se pudo completar la solicitud (${response.status}).`
    }
    throw new ApiError(message, response.status)
  }

  return (await response.json()) as T
}

export function getProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products')
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${encodeURIComponent(id)}`)
}

export function createQuote(productId: string): Promise<Quote> {
  return request<Quote>('/api/checkout/quote', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })
}

export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return request<Transaction>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getTransaction(id: string): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${encodeURIComponent(id)}`)
}
