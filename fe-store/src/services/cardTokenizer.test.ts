import { http, HttpResponse } from 'msw'
import { env } from '../config/env'
import { server } from '../test/setup'
import { tokenizeCard } from './cardTokenizer'

const card = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '12',
  expYear: '30',
  holder: 'Ada Lovelace',
}

describe('tokenizeCard', () => {
  it('sends the card to the gateway and returns the token id', async () => {
    let authorization = ''
    let payload: Record<string, unknown> = {}
    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, async ({ request }) => {
        authorization = request.headers.get('Authorization') ?? ''
        payload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ data: { id: 'tok_approved' } }, { status: 201 })
      }),
    )

    await expect(tokenizeCard(card)).resolves.toBe('tok_approved')
    expect(authorization).toBe('Bearer pub_test_key')
    expect(payload).toMatchObject({
      number: card.number,
      cvc: card.cvc,
      exp_month: '12',
      exp_year: '30',
      card_holder: 'Ada Lovelace',
    })
  })

  it('accepts a top-level id and reports gateway errors', async () => {
    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, () =>
        HttpResponse.json({ id: 'tok_plain' }, { status: 201 }),
      ),
    )
    await expect(tokenizeCard(card)).resolves.toBe('tok_plain')

    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, () =>
        HttpResponse.json({ message: 'Tarjeta inválida' }, { status: 422 }),
      ),
    )
    await expect(tokenizeCard(card)).rejects.toThrow('Tarjeta inválida')

    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, () => new HttpResponse('nope', { status: 500 })),
    )
    await expect(tokenizeCard(card)).rejects.toThrow(/tokenizar/)

    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, () =>
        HttpResponse.json({ data: {} }, { status: 201 }),
      ),
    )
    await expect(tokenizeCard(card)).rejects.toThrow(/no devolvió un token/)
  })
})
