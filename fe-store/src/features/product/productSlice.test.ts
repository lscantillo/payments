import { fetchProduct, productReducer, setStock } from './productSlice'
import { sampleProduct } from '../../mocks/handlers'

describe('product slice', () => {
  it('tracks loading, success and stock', () => {
    const loading = productReducer(undefined, fetchProduct.pending('req', 'prod-1'))
    expect(loading.status).toBe('loading')
    const ready = productReducer(
      loading,
      fetchProduct.fulfilled(sampleProduct, 'req', 'prod-1'),
    )
    expect(ready.product?.name).toBe('Taza de cerámica Aurora')
    expect(productReducer(ready, setStock(2)).product?.stock).toBe(2)
  })

  it('stores a load error', () => {
    const failed = productReducer(
      undefined,
      fetchProduct.rejected(null, 'req', 'prod-1', 'No se pudo cargar el producto.'),
    )
    expect(failed.status).toBe('error')
    expect(failed.error).toMatch(/cargar/)
  })
})
