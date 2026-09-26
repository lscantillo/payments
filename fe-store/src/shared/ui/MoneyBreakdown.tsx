import type { Quote } from '../../domain/types'
import { formatCop } from '../money'

export function MoneyBreakdown({ quote }: { quote: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Monto del producto</dt>
        <dd>{formatCop(quote.productAmountInCents)}</dd>
      </div>
      <div>
        <dt>Tarifa base</dt>
        <dd>{formatCop(quote.baseFeeInCents)}</dd>
      </div>
      <div>
        <dt>Tarifa de envío</dt>
        <dd>{formatCop(quote.shippingFeeInCents)}</dd>
      </div>
      <div className="totals-grand">
        <dt>Total</dt>
        <dd>{formatCop(quote.totalInCents)}</dd>
      </div>
    </dl>
  )
}
