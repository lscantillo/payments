import { useEffect } from 'react'
import { Link } from 'react-router'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { formatCop } from '../../shared/money'
import { ShopHeader } from './ShopHeader'
import { fetchCatalog } from './productSlice'

export function CatalogPage() {
  const dispatch = useAppDispatch()
  const products = useAppSelector((state) => state.product.catalog)
  const status = useAppSelector((state) => state.product.catalogStatus)
  const error = useAppSelector((state) => state.product.catalogError)

  useEffect(() => {
    void dispatch(fetchCatalog())
  }, [dispatch])

  return (
    <div className="store">
      <ShopHeader />
      <section className="hero">
        <p className="eyebrow">Colección de taller</p>
        <h1>Piezas para la mesa, hechas a mano.</h1>
        <p className="description">
          Cuatro formas de gres esmaltadas en el horno. Elige una pieza y paga con tarjeta desde su ficha.
        </p>
      </section>

      {status === 'idle' || status === 'loading' ? (
        <p className="status-line" role="status">
          Cargando catálogo…
        </p>
      ) : null}

      {status === 'error' ? (
        <div className="status-block">
          <p role="alert">{error ?? 'No se pudo cargar el catálogo.'}</p>
          <button type="button" onClick={() => void dispatch(fetchCatalog())}>
            Reintentar
          </button>
        </div>
      ) : null}

      {status === 'ready' ? (
        <ul className="catalog">
          {products.map((product) => {
            const soldOut = product.stock <= 0
            return (
              <li key={product.id}>
                <article className="catalog-card">
                  <img
                    src={product.imageUrl}
                    alt=""
                    width={640}
                    height={480}
                    sizes="(max-width: 768px) 100vw, 480px"
                  />
                  <div className="catalog-copy">
                    <h2>{product.name}</h2>
                    <p className="description">{product.description}</p>
                    <p className="price">{formatCop(product.priceInCents)}</p>
                    <p className={soldOut ? 'stock stock-out' : 'stock'}>
                      {soldOut ? 'Agotado' : `${product.stock} unidades disponibles`}
                    </p>
                    <Link className="button" to={`/products/${product.id}`}>
                      Ver detalle
                    </Link>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : null}
      <p className="colophon">Atelier · gres de taller · cada pieza se paga en su ficha</p>
    </div>
  )
}
