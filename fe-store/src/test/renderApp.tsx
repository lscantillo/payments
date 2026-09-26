import { render, type RenderResult } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { PersistGate } from 'redux-persist/integration/react'
import { createAppStore, type AppStore } from '../app/store'
import type { Persistor } from 'redux-persist'
import { resumePendingTransaction } from '../features/checkout/resumePendingTransaction'
import App from '../App'

export function renderApp(
  initialPath = '/products/prod-1',
): RenderResult & { store: AppStore; persistor: Persistor } {
  const { store, persistor } = createAppStore()
  const view = render(
    <Provider store={store}>
      <PersistGate
        loading={<p>Cargando sesión</p>}
        persistor={persistor}
        onBeforeLift={() => resumePendingTransaction(store)}
      >
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </PersistGate>
    </Provider>,
  )
  return { ...view, store, persistor }
}
