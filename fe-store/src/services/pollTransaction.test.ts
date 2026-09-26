import { http, HttpResponse } from 'msw'
import { env } from '../config/env'
import { sampleQuote } from '../mocks/handlers'
import { server } from '../test/setup'
import { pollConfig, pollUntilSettled } from './pollTransaction'

describe('pollUntilSettled', () => {
  it('returns as soon as the transaction leaves pending', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, () =>
        HttpResponse.json({
          id: 'tx-1',
          status: 'APPROVED',
          reference: 'REF-tx-1',
          stock: 4,
          ...sampleQuote,
        }),
      ),
    )
    await expect(pollUntilSettled('tx-1')).resolves.toMatchObject({ status: 'APPROVED', stock: 4 })
  })

  it('stops on timeout while the payment is still pending', async () => {
    pollConfig.timeoutMs = 2000
    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, () =>
        HttpResponse.json({
          id: 'tx-1',
          status: 'PENDING',
          reference: 'REF-tx-1',
          ...sampleQuote,
        }),
      ),
    )
    await expect(pollUntilSettled('tx-1')).resolves.toMatchObject({ status: 'PENDING' })
  })
})
