import '@testing-library/jest-dom'
import { setupServer } from 'msw/node'
import { createHandlers } from '../mocks/handlers'
import { pollConfig } from '../services/pollTransaction'

export const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

beforeEach(() => {
  localStorage.clear()
  let clock = 0
  pollConfig.intervalMs = 2000
  pollConfig.timeoutMs = 30_000
  pollConfig.now = () => clock
  pollConfig.sleep = async () => {
    clock += pollConfig.intervalMs
  }
  server.use(...createHandlers())
})

afterEach(() => server.resetHandlers())

afterAll(() => server.close())
