import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist'
import { checkoutStorage } from './persistStorage'
import { checkoutReducer, type CheckoutState } from '../features/checkout/checkoutSlice'
import { pollTransaction, submitPayment } from '../features/checkout/checkoutThunks'
import { productReducer, setStock, type ProductState } from '../features/product/productSlice'

const checkoutPersistConfig = {
  key: 'checkout',
  storage: checkoutStorage,
  whitelist: ['step', 'customer', 'delivery', 'quote', 'cardMeta', 'token', 'transaction'],
}

type StoreState = {
  product: ProductState
  checkout: CheckoutState
}

export function createAppStore() {
  const listenerMiddleware = createListenerMiddleware<StoreState>()
  listenerMiddleware.startListening({
    matcher: (action): action is ReturnType<typeof submitPayment.fulfilled> | ReturnType<typeof pollTransaction.fulfilled> =>
      submitPayment.fulfilled.match(action) || pollTransaction.fulfilled.match(action),
    effect: (action, api) => {
      if (action.payload.status === 'APPROVED' && typeof action.payload.stock === 'number') {
        api.dispatch(setStock(action.payload.stock))
      }
    },
  })

  const store = configureStore({
    reducer: {
      product: productReducer,
      checkout: persistReducer(checkoutPersistConfig, checkoutReducer) as unknown as typeof checkoutReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).prepend(listenerMiddleware.middleware),
  })

  const persistor = persistStore(store)
  return { store, persistor }
}

export type AppStore = ReturnType<typeof createAppStore>['store']
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
