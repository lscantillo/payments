import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { env } from '../../config/env'
import { fetchProduct } from './productSlice'
import { openPayment } from '../checkout/checkoutSlice'
import { formatCop } from '../../shared/money'

export function ProductPage() {
  const dispatch = useAppDispatch()
  const product = useAppSelector((state) => state.product.product)
  const status = useAppSelector((state) => state.product.status)
  const error = useAppSelector((state) => state.product.error)
  const step = useAppSelector((state) => state.checkout.step)

  if (status === 'idle' || status === 'loading') {
    return (
      <p className="status-line" role="status">
        Cargando producto…
      </p>
    )
  }

  if (status === 'error' || !product) {
    return (
      <div className="status-block">
        <p role="alert">{error ?? 'No se pudo cargar el producto.'}</p>
        <button type="button" onClick={() => void dispatch(fetchProduct(env.productId))}>
          Reintentar
        </button>
      </div>
    )
  }

  const soldOut = product.stock <= 0

  return (
    <article className="product" aria-hidden={step !== 'product'}>
      <img
        className="product-image"
        src={product.imageUrl}
        alt={product.name}
        width={640}
        height={480}
        srcSet={`${product.imageUrl} 640w`}
        sizes="(max-width: 768px) 100vw, 640px"
      />
      <div className="product-copy">
        <p className="eyebrow">Edición limitada</p>
        <h1>{product.name}</h1>
        <p className="description">{product.description}</p>
        <p className="price">{formatCop(product.priceInCents)}</p>
        <p className={soldOut ? 'stock stock-out' : 'stock'}>
          {soldOut ? 'Agotado' : `${product.stock} unidades disponibles`}
        </p>
        <button type="button" disabled={soldOut} onClick={() => dispatch(openPayment())}>
          Pay with credit card
        </button>
      </div>
    </article>
  )
}
