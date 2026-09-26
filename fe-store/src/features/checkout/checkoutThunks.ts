import { createAsyncThunk } from '@reduxjs/toolkit'
import type { CheckoutState } from './checkoutSlice'
import type { ProductState } from '../product/productSlice'
import { createQuote, createTransaction } from '../../services/apiClient'
import { toErrorMessage } from '../../services/apiError'
import { pollUntilSettled } from '../../services/pollTransaction'
import type { Quote, Transaction } from '../../domain/types'
import { transactionCreated } from './checkoutActions'

interface ThunkState {
  product: ProductState
  checkout: CheckoutState
}

export const loadQuote = createAsyncThunk<Quote, string, { rejectValue: string }>(
  'checkout/loadQuote',
  async (productId, { rejectWithValue }) => {
    try {
      return await createQuote(productId)
    } catch (error) {
      return rejectWithValue(toErrorMessage(error, 'No se pudo calcular la tarifa.'))
    }
  },
)

export const submitPayment = createAsyncThunk<
  Transaction,
  void,
  { state: ThunkState; rejectValue: string }
>('checkout/submitPayment', async (_, { getState, dispatch, rejectWithValue }) => {
  const { checkout, product } = getState()
  const productId = product.product?.id
  if (!productId || !checkout.token) {
    return rejectWithValue('Faltan datos para confirmar el pago.')
  }

  try {
    const created = await createTransaction({
      productId,
      cardToken: checkout.token,
      installments: 1,
      customer: checkout.customer,
      delivery: checkout.delivery,
    })
    dispatch(transactionCreated(created))
    return await pollUntilSettled(created.id)
  } catch (error) {
    return rejectWithValue(toErrorMessage(error, 'No se pudo procesar el pago.'))
  }
})

export const pollTransaction = createAsyncThunk<
  Transaction,
  void,
  { state: ThunkState; rejectValue: string }
>('checkout/pollTransaction', async (_, { getState, rejectWithValue }) => {
  const id = getState().checkout.transaction?.id
  if (!id) return rejectWithValue('No hay una transacción para consultar.')
  try {
    return await pollUntilSettled(id)
  } catch (error) {
    return rejectWithValue(toErrorMessage(error, 'No se pudo consultar el pago.'))
  }
})
