import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  CardMeta,
  CheckoutStep,
  CustomerInput,
  DeliveryInput,
  Quote,
  Transaction,
} from '../../domain/types'
import { transactionCreated } from './checkoutActions'
import { loadQuote, pollTransaction, submitPayment } from './checkoutThunks'

export interface CheckoutState {
  step: CheckoutStep
  customer: CustomerInput
  delivery: DeliveryInput
  quote: Quote | null
  cardMeta: CardMeta | null
  token: string | null
  transaction: Transaction | null
  error: string | null
  isSubmitting: boolean
}

export const emptyCustomer = (): CustomerInput => ({ fullName: '', email: '', phone: '' })
export const emptyDelivery = (): DeliveryInput => ({ address: '', city: '', region: '' })

function createInitialState(): CheckoutState {
  return {
    step: 'product',
    customer: emptyCustomer(),
    delivery: emptyDelivery(),
    quote: null,
    cardMeta: null,
    token: null,
    transaction: null,
    error: null,
    isSubmitting: false,
  }
}

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: createInitialState(),
  reducers: {
    openPayment(state) {
      state.step = 'payment'
      state.error = null
    },
    cancelCheckout() {
      return createInitialState()
    },
    editPayment(state) {
      state.step = 'payment'
      state.token = null
      state.cardMeta = null
      state.error = null
    },
    patchCustomer(state, action: PayloadAction<Partial<CustomerInput>>) {
      state.customer = { ...state.customer, ...action.payload }
    },
    patchDelivery(state, action: PayloadAction<Partial<DeliveryInput>>) {
      state.delivery = { ...state.delivery, ...action.payload }
    },
    readyForSummary(
      state,
      action: PayloadAction<{
        customer: CustomerInput
        delivery: DeliveryInput
        quote: Quote
        cardMeta: CardMeta
        token: string
      }>,
    ) {
      state.customer = action.payload.customer
      state.delivery = action.payload.delivery
      state.quote = action.payload.quote
      state.cardMeta = action.payload.cardMeta
      state.token = action.payload.token
      state.step = 'summary'
      state.error = null
    },
    resetCheckout() {
      return createInitialState()
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadQuote.fulfilled, (state, action) => {
        state.quote = action.payload
      })
      .addCase(loadQuote.rejected, (state, action) => {
        state.error = action.payload ?? 'No se pudo calcular la tarifa.'
      })
      .addCase(transactionCreated, (state, action) => {
        state.transaction = action.payload
      })
      .addCase(submitPayment.pending, (state) => {
        state.step = 'processing'
        state.isSubmitting = true
        state.error = null
      })
      .addCase(submitPayment.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.transaction = action.payload
        state.step = 'result'
        state.token = null
      })
      .addCase(submitPayment.rejected, (state, action) => {
        state.isSubmitting = false
        state.error = action.payload ?? 'No se pudo procesar el pago.'
        if (state.transaction) {
          state.transaction.status = 'ERROR'
          state.step = 'result'
          state.token = null
        } else {
          state.step = 'summary'
        }
      })
      .addCase(pollTransaction.pending, (state) => {
        state.isSubmitting = true
        state.error = null
        if (state.transaction) state.step = 'processing'
      })
      .addCase(pollTransaction.fulfilled, (state, action) => {
        state.isSubmitting = false
        state.transaction = action.payload
        state.step = 'result'
      })
      .addCase(pollTransaction.rejected, (state, action) => {
        state.isSubmitting = false
        state.error = action.payload ?? 'No se pudo consultar el pago.'
        state.step = 'result'
        if (state.transaction) state.transaction.status = 'ERROR'
      })
  },
})

export const {
  openPayment,
  cancelCheckout,
  editPayment,
  patchCustomer,
  patchDelivery,
  readyForSummary,
  resetCheckout,
} = checkoutSlice.actions

export const checkoutReducer = checkoutSlice.reducer
