import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Product } from '../../domain/types'
import { getProduct, getProducts } from '../../services/apiClient'
import { toErrorMessage } from '../../services/apiError'

export interface ProductState {
  product: Product | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  catalog: Product[]
  catalogStatus: 'idle' | 'loading' | 'ready' | 'error'
  catalogError: string | null
}

const initialState: ProductState = {
  product: null,
  status: 'idle',
  error: null,
  catalog: [],
  catalogStatus: 'idle',
  catalogError: null,
}

export const fetchCatalog = createAsyncThunk<Product[], void, { rejectValue: string }>(
  'product/fetchCatalog',
  async (_, { rejectWithValue }) => {
    try {
      return await getProducts()
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, 'No se pudo cargar el catálogo.'))
    }
  },
)

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
      .addCase(fetchCatalog.pending, (state) => {
        state.catalogStatus = 'loading'
        state.catalogError = null
      })
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.catalogStatus = 'ready'
        state.catalog = action.payload
        state.catalogError = null
      })
      .addCase(fetchCatalog.rejected, (state, action) => {
        state.catalogStatus = 'error'
        state.catalogError = action.payload ?? 'No se pudo cargar el catálogo.'
      })
  },
})

export const { setStock } = productSlice.actions
export const productReducer = productSlice.reducer
