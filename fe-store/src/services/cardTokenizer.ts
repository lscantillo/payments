import { env } from '../config/env'
import type { CardInput } from '../domain/types'
import { ApiError } from './apiError'

interface TokenResponse {
  id?: string
  data?: { id?: string }
  message?: string
}

export async function tokenizeCard(card: CardInput): Promise<string> {
  const response = await fetch(`${env.gatewayApiUrl}/tokens/cards`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.gatewayPublicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: card.number,
      cvc: card.cvc,
      exp_month: card.expMonth,
      exp_year: card.expYear,
      card_holder: card.holder,
    }),
  })

  let body: TokenResponse
  try {
    body = (await response.json()) as TokenResponse
  } catch {
    body = {}
  }

  if (!response.ok) {
    const message =
      body.message ?? 'No se pudo tokenizar la tarjeta. Revisa los datos e inténtalo de nuevo.'
    throw new ApiError(message, response.status)
  }

  const token = body.data?.id ?? body.id
  if (!token) {
    throw new ApiError('La pasarela no devolvió un token de tarjeta.', response.status)
  }
  return token
}
