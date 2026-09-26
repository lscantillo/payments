import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { editPayment } from './checkoutSlice'
import { submitPayment } from './checkoutThunks'
import { MoneyBreakdown } from '../../shared/ui/MoneyBreakdown'
import { useDialog } from '../../shared/ui/useDialog'

export function SummaryBackdrop() {
  const dispatch = useAppDispatch()
  const quote = useAppSelector((state) => state.checkout.quote)
  const cardMeta = useAppSelector((state) => state.checkout.cardMeta)
  const customer = useAppSelector((state) => state.checkout.customer)
  const delivery = useAppSelector((state) => state.checkout.delivery)
  const error = useAppSelector((state) => state.checkout.error)
  const isSubmitting = useAppSelector((state) => state.checkout.isSubmitting)
  const back = useCallback(() => {
    dispatch(editPayment())
  }, [dispatch])
  const dialogRef = useDialog(back)

  if (!quote || !cardMeta) return null

  const brandLabel = cardMeta.brand === 'mastercard' ? 'Mastercard' : 'Visa'

  return (
    <div className="overlay overlay-summary">
      <div
        className="dialog summary"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        ref={dialogRef}
      >
        <header className="dialog-header">
          <h2 id="summary-title">Resumen de pago</h2>
          <button type="button" className="text-button" onClick={back}>
            Editar
          </button>
        </header>
        <p className="summary-card">
          {brandLabel} •••• {cardMeta.last4}
          <span>
            {cardMeta.holder} · {cardMeta.expMonth}/{cardMeta.expYear}
          </span>
        </p>
        <p className="summary-delivery">
          {customer.fullName}
          <span>
            {delivery.address}, {delivery.city}, {delivery.region}
          </span>
          <span>{customer.email}</span>
        </p>
        <MoneyBreakdown quote={quote} />
        <p className="installments">1 cuota</p>
        {error ? (
          <p role="alert" className="form-error">
            {error}
          </p>
        ) : null}
        <button type="button" disabled={isSubmitting} onClick={() => void dispatch(submitPayment())}>
          Confirmar y pagar
        </button>
      </div>
    </div>
  )
}
