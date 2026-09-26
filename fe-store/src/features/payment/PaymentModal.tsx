import { useCallback, useState, type FormEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import type { FieldErrors } from './validation'
import {
  detectBrand,
  digitsOnly,
  formatCardNumber,
  hasErrors,
  padMonth,
  validateCard,
  validateDelivery,
} from './validation'
import { tokenizeCard } from '../../services/cardTokenizer'
import { toErrorMessage } from '../../services/apiError'
import { loadQuote } from '../checkout/checkoutThunks'
import { cancelCheckout, patchCustomer, patchDelivery, readyForSummary } from '../checkout/checkoutSlice'
import { TextField } from '../../shared/ui/TextField'
import { useDialog } from '../../shared/ui/useDialog'

export function PaymentModal() {
  const dispatch = useAppDispatch()
  const customer = useAppSelector((state) => state.checkout.customer)
  const delivery = useAppSelector((state) => state.checkout.delivery)
  const quoteError = useAppSelector((state) => state.checkout.error)
  const productId = useAppSelector((state) => state.product.product?.id)
  const [number, setNumber] = useState('')
  const [cvc, setCvc] = useState('')
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')
  const [holder, setHolder] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const close = useCallback(() => {
    dispatch(cancelCheckout())
  }, [dispatch])
  const dialogRef = useDialog(close)
  const brand = detectBrand(number)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const card = { number, cvc, expMonth, expYear, holder }
    const nextErrors = {
      ...validateCard(card),
      ...validateDelivery(customer, delivery),
    }
    setErrors(nextErrors)
    setFormError(null)
    if (hasErrors(nextErrors)) return
    if (!productId) {
      setFormError('No hay un producto para pagar.')
      return
    }

    setBusy(true)
    try {
      const [token, quote] = await Promise.all([
        tokenizeCard(card),
        dispatch(loadQuote(productId)).unwrap(),
      ])
      dispatch(
        readyForSummary({
          customer,
          delivery,
          quote,
          token,
          cardMeta: {
            brand,
            last4: number.slice(-4),
            holder: holder.trim(),
            expMonth,
            expYear,
          },
        }),
      )
    } catch (error) {
      setFormError(toErrorMessage(error, 'No se pudo preparar el pago.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        ref={dialogRef}
      >
        <header className="dialog-header">
          <h2 id="payment-title">Pago y entrega</h2>
          <button type="button" className="text-button" onClick={close}>
            Cancelar
          </button>
        </header>
        <form className="stack" onSubmit={(event) => void onSubmit(event)} noValidate>
          <fieldset>
            <legend>Tarjeta</legend>
            <div className={`card-preview brand-${brand}`} aria-hidden="true">
              <span>{brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : 'Tarjeta'}</span>
              <strong>{formatCardNumber(number) || '•••• •••• •••• ••••'}</strong>
            </div>
            <p className="brand-live" role="status">
              {brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : 'Marca no reconocida'}
            </p>
            <TextField
              id="card-number"
              label="Número de tarjeta"
              inputMode="numeric"
              autoComplete="cc-number"
              value={formatCardNumber(number)}
              error={errors.number}
              onChange={(event) => setNumber(digitsOnly(event.target.value, 16))}
            />
            <TextField
              id="card-holder"
              label="Titular"
              autoComplete="cc-name"
              value={holder}
              error={errors.holder}
              onChange={(event) => setHolder(event.target.value)}
            />
            <div className="card-row">
              <TextField
                id="card-month"
                label="Mes"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                placeholder="MM"
                value={expMonth}
                error={errors.expMonth}
                onChange={(event) => setExpMonth(digitsOnly(event.target.value, 2))}
                onBlur={() => setExpMonth((current) => padMonth(current))}
              />
              <TextField
                id="card-year"
                label="Año"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                placeholder="AA"
                value={expYear}
                error={errors.expYear}
                onChange={(event) => setExpYear(digitsOnly(event.target.value, 2))}
              />
              <TextField
                id="card-cvc"
                label="CVV"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                error={errors.cvc}
                onChange={(event) => setCvc(digitsOnly(event.target.value, 3))}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Entrega</legend>
            <TextField
              id="delivery-name"
              label="Nombre"
              autoComplete="name"
              value={customer.fullName}
              error={errors.fullName}
              onChange={(event) => dispatch(patchCustomer({ fullName: event.target.value }))}
            />
            <TextField
              id="delivery-email"
              label="Correo"
              type="email"
              autoComplete="email"
              value={customer.email}
              error={errors.email}
              onChange={(event) => dispatch(patchCustomer({ email: event.target.value }))}
            />
            <TextField
              id="delivery-phone"
              label="Teléfono"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={customer.phone}
              error={errors.phone}
              onChange={(event) => dispatch(patchCustomer({ phone: event.target.value }))}
            />
            <TextField
              id="delivery-address"
              label="Dirección"
              autoComplete="street-address"
              value={delivery.address}
              error={errors.address}
              onChange={(event) => dispatch(patchDelivery({ address: event.target.value }))}
            />
            <div className="card-row two">
              <TextField
                id="delivery-city"
                label="Ciudad"
                autoComplete="address-level2"
                value={delivery.city}
                error={errors.city}
                onChange={(event) => dispatch(patchDelivery({ city: event.target.value }))}
              />
              <TextField
                id="delivery-region"
                label="Departamento"
                autoComplete="address-level1"
                value={delivery.region}
                error={errors.region}
                onChange={(event) => dispatch(patchDelivery({ region: event.target.value }))}
              />
            </div>
          </fieldset>
          {formError || quoteError ? (
            <p role="alert" className="form-error">
              {formError ?? quoteError}
            </p>
          ) : null}
          <button type="submit" disabled={busy}>
            {busy ? 'Validando…' : 'Continuar al resumen'}
          </button>
        </form>
      </div>
    </div>
  )
}
