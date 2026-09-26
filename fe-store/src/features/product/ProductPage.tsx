import { useEffect } from 'react'
import { useStore } from 'react-redux'
import { Link, useParams } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import type { RootState } from '../../app/store'
import { formatCop } from '../../shared/money'
import { openPayment, resetCheckout } from '../checkout/checkoutSlice'
import { ShopHeader } from './ShopHeader'
import { fetchProduct } from './productSlice'

export function ProductPage() {
  const { productId = '' } = useParams()
  const dispatch = useAppDispatch()
  const product = useAppSelector((state) => state.product.product)
  const status = useAppSelector((state) => state.product.status)
  const error = useAppSelector((state) => state.product.error)
  const step = useAppSelector((state) => state.checkout.step)
  const store = useStore<RootState>()
  const matches = product?.id === productId

  useEffect(() => {
    if (!productId) return
    const loadedId = store.getState().product.product?.id
    if (loadedId && loadedId !== productId) dispatch(resetCheckout())
    void dispatch(fetchProduct(productId))
  }, [dispatch, productId, store])

  if (!matches && status !== 'error') {
    return (
      <div className="store">
        <ShopHeader />
        <p className="status-line" role="status">
          Cargando producto…
        </p>
      </div>
    )
  }

  if (status === 'error' || !product || !matches) {
    return (
      <div className="store">
        <ShopHeader />
        <div className="status-block">
          <p role="alert">{error ?? 'No se pudo cargar el producto.'}</p>
          <button type="button" onClick={() => void dispatch(fetchProduct(productId))}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const soldOut = product.stock <= 0

  return (
    <div className="store">
      <ShopHeader />
      <Link className="back-link" to="/">
        Volver al catálogo
      </Link>
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
    </div>
  )
}
