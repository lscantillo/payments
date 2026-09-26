import {
  detectBrand,
  digitsOnly,
  formatCardNumber,
  hasErrors,
  isValidExpiry,
  luhnCheck,
  padMonth,
  validateCard,
  validateDelivery,
} from './validation'

const now = new Date(2026, 8, 25)

describe('card and delivery validation', () => {
  it('checks Luhn, brand and formatting helpers', () => {
    expect(luhnCheck('4242424242424242')).toBe(true)
    expect(luhnCheck('4242424242424243')).toBe(false)
    expect(luhnCheck('')).toBe(false)
    expect(luhnCheck('abcd')).toBe(false)
    expect(detectBrand('4')).toBe('visa')
    expect(detectBrand('51')).toBe('mastercard')
    expect(detectBrand('2221')).toBe('mastercard')
    expect(detectBrand('2720')).toBe('mastercard')
    expect(detectBrand('222')).toBe('unknown')
    expect(detectBrand('9')).toBe('unknown')
    expect(digitsOnly('12a34', 3)).toBe('123')
    expect(formatCardNumber('424242')).toBe('4242 42')
    expect(padMonth('8')).toBe('08')
    expect(padMonth('12')).toBe('12')
  })

  it('accepts a current Visa and rejects expired or unknown cards', () => {
    expect(
      validateCard(
        {
          number: '4242424242424242',
          cvc: '123',
          expMonth: '09',
          expYear: '26',
          holder: 'José Pérez',
        },
        now,
      ),
    ).toEqual({})

    const expired = validateCard(
      {
        number: '5555555555554444',
        cvc: '12',
        expMonth: '08',
        expYear: '26',
        holder: 'Jo',
      },
      now,
    )
    expect(expired.expMonth).toMatch(/vencida/)
    expect(expired.cvc).toMatch(/3/)
    expect(expired.holder).toBeTruthy()

    const invalid = validateCard(
      {
        number: '4242424242424243',
        cvc: '1234',
        expMonth: '13',
        expYear: 'ab',
        holder: 'Ada 1',
      },
      now,
    )
    expect(invalid.number).toBeTruthy()
    expect(invalid.expMonth).toMatch(/01 y 12/)
    expect(invalid.expYear).toMatch(/dos dígitos/)
    expect(hasErrors(invalid)).toBe(true)
  })

  it('rejects a previous year even with a valid month', () => {
    expect(isValidExpiry('09', '25', now)).toBe(false)
    expect(isValidExpiry('09', '26', now)).toBe(true)
    expect(isValidExpiry('00', '26', now)).toBe(false)
  })

  it('validates delivery fields', () => {
    expect(
      validateDelivery(
        { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '+57 300 123 4567' },
        { address: 'Calle 10', city: 'Bogotá', region: 'Cundinamarca' },
      ),
    ).toEqual({})

    const errors = validateDelivery(
      { fullName: 'A', email: 'ada', phone: '123' },
      { address: 'abc', city: 'B', region: '' },
    )
    expect(errors.fullName).toBeTruthy()
    expect(errors.email).toBeTruthy()
    expect(errors.phone).toBeTruthy()
    expect(errors.address).toBeTruthy()
    expect(errors.city).toBeTruthy()
    expect(errors.region).toBeTruthy()
  })
})
