import type { CardBrand, CardInput, CustomerInput, DeliveryInput } from '../../domain/types'

export type FieldName =
  | 'number'
  | 'cvc'
  | 'expMonth'
  | 'expYear'
  | 'holder'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'region'

export type FieldErrors = Partial<Record<FieldName, string>>

const HOLDER_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max)
}

export function formatCardNumber(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function padMonth(value: string): string {
  if (/^[1-9]$/.test(value)) return `0${value}`
  return value
}

export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false
  let sum = 0
  let alternate = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let current = Number(digits[index])
    if (alternate) {
      current *= 2
      if (current > 9) current -= 9
    }
    sum += current
    alternate = !alternate
  }
  return sum > 0 && sum % 10 === 0
}

export function detectBrand(digits: string): CardBrand {
  if (digits.startsWith('4')) return 'visa'
  if (digits.length >= 2) {
    const prefix2 = Number(digits.slice(0, 2))
    if (prefix2 >= 51 && prefix2 <= 55) return 'mastercard'
  }
  if (digits.length >= 4) {
    const prefix4 = Number(digits.slice(0, 4))
    if (prefix4 >= 2221 && prefix4 <= 2720) return 'mastercard'
  }
  return 'unknown'
}

export function isValidExpiry(month: string, year: string, now = new Date()): boolean {
  if (!/^(0[1-9]|1[0-2])$/.test(month)) return false
  if (!/^\d{2}$/.test(year)) return false
  const expiresAt = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59, 999)
  return expiresAt >= now
}

export function validateCard(card: CardInput, now = new Date()): FieldErrors {
  const errors: FieldErrors = {}
  const brand = detectBrand(card.number)

  if (!/^\d{16}$/.test(card.number) || brand === 'unknown' || !luhnCheck(card.number)) {
    errors.number = 'Ingresa un número Visa o Mastercard válido.'
  }
  if (!/^\d{3}$/.test(card.cvc)) {
    errors.cvc = 'El CVV debe tener 3 dígitos.'
  }
  if (!/^(0[1-9]|1[0-2])$/.test(card.expMonth)) {
    errors.expMonth = 'Usa un mes entre 01 y 12.'
  }
  if (!/^\d{2}$/.test(card.expYear)) {
    errors.expYear = 'Usa el año en dos dígitos.'
  }
  if (!errors.expMonth && !errors.expYear && !isValidExpiry(card.expMonth, card.expYear, now)) {
    errors.expMonth = 'La tarjeta está vencida.'
  }
  const holder = card.holder.trim()
  if (holder.length < 3 || !HOLDER_PATTERN.test(holder)) {
    errors.holder = 'Ingresa el nombre del titular.'
  }
  return errors
}

export function validateDelivery(customer: CustomerInput, delivery: DeliveryInput): FieldErrors {
  const errors: FieldErrors = {}
  const fullName = customer.fullName.trim()
  if (fullName.length < 3 || !HOLDER_PATTERN.test(fullName)) {
    errors.fullName = 'Ingresa el nombre de quien recibe.'
  }
  if (!EMAIL_PATTERN.test(customer.email.trim())) {
    errors.email = 'Ingresa un correo válido.'
  }
  const phone = customer.phone.replace(/[\s()-]/g, '')
  if (!/^\+?\d{7,15}$/.test(phone)) {
    errors.phone = 'Ingresa un teléfono válido.'
  }
  if (delivery.address.trim().length < 5) {
    errors.address = 'Ingresa la dirección de entrega.'
  }
  if (delivery.city.trim().length < 2) {
    errors.city = 'Ingresa la ciudad.'
  }
  if (delivery.region.trim().length < 2) {
    errors.region = 'Ingresa el departamento.'
  }
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
