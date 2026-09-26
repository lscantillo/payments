import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Product } from '../../domain/types'
import { getProduct } from '../../services/apiClient'
import { toErrorMessage } from '../../services/apiError'

export interface ProductState {
  product: Product | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
}

const initialState: ProductState = {
  product: null,
  status: 'idle',
  error: null,
}

export const fetchProduct = createAsyncThunk<Product, string, { rejectValue: string }>(
  'product/fetch',
  async (id, { rejectWithValue }) => {
    try {
      return await getProduct(id)
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, 'No se pudo cargar el producto.'))
    }
  },
)

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setStock(state, action: PayloadAction<number>) {
      if (state.product) state.product.stock = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProduct.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.status = 'ready'
        state.product = action.payload
        state.error = null
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'No se pudo cargar el producto.'
      })
  },
})

export const { setStock } = productSlice.actions
export const productReducer = productSlice.reducer
