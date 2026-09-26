import { formatCop } from './money'

describe('formatCop', () => {
  it('formats pesos from cents', () => {
    expect(formatCop(8_900_000).replace(/\u00a0/g, ' ')).toBe('$ 89.000')
    expect(formatCop(150_050).replace(/\u00a0/g, ' ')).toContain('1.500')
  })
})
