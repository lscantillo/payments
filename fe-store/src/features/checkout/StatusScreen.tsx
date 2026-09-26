import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { env } from '../../config/env'
import { resetCheckout } from './checkoutSlice'
import { pollTransaction } from './checkoutThunks'
import { fetchProduct } from '../product/productSlice'
import { MoneyBreakdown } from '../../shared/ui/MoneyBreakdown'

const COPY = {
  APPROVED: {
    title: 'Aprobada',
    body: 'Tu pago fue aprobado. El producto quedó asignado a despacho.',
  },
  DECLINED: {
    title: 'Rechazada',
    body: 'El pago fue rechazado. No se descontó el stock.',
  },
  ERROR: {
    title: 'Fallida',
    body: 'No pudimos completar el pago. Inténtalo de nuevo.',
  },
  PENDING: {
    title: 'Pendiente',
    body: 'El pago sigue pendiente. Puedes consultar el estado otra vez.',
  },
} as const

export function StatusScreen() {
  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.checkout.step)
  const transaction = useAppSelector((state) => state.checkout.transaction)
  const error = useAppSelector((state) => state.checkout.error)

  function backToProduct() {
    dispatch(resetCheckout())
    void dispatch(fetchProduct(env.productId))
  }

  if (step === 'processing') {
    return (
      <div className="overlay">
        <section className="dialog status-card" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <h2>Procesando tu pago…</h2>
          <p>Esto puede tardar unos segundos. No cierres la página.</p>
        </section>
      </div>
    )
  }

  const status = transaction?.status ?? 'ERROR'
  const copy = COPY[status]

  return (
    <div className="overlay">
      <section className={`dialog status-card status-${status.toLowerCase()}`} aria-live="polite">
        <p className="eyebrow">Estado del pago</p>
        <h2>{copy.title}</h2>
        <p>{error && status === 'ERROR' ? error : copy.body}</p>
        {transaction?.reference ? <p className="reference">Referencia {transaction.reference}</p> : null}
        {transaction ? <MoneyBreakdown quote={transaction} /> : null}
        {status === 'PENDING' && transaction ? (
          <button type="button" onClick={() => void dispatch(pollTransaction())}>
            Consultar de nuevo
          </button>
        ) : null}
        <button type="button" onClick={backToProduct}>
          Volver al producto
        </button>
      </section>
    </div>
  )
}
