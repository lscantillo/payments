import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { PersistGate } from 'redux-persist/integration/react'
import { createAppStore } from './app/store'
import { env } from './config/env'
import { resumePendingTransaction } from './features/checkout/resumePendingTransaction'
import App from './App'
import './styles/global.css'

const { store, persistor } = createAppStore()

void (async () => {
  if (env.useMocks) {
    try {
      const { startMockWorker } = await import('./mocks/browser')
      await startMockWorker()
    } catch (error) {
      console.error(error)
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <PersistGate
          loading={<p className="status-line">Cargando sesión…</p>}
          persistor={persistor}
          onBeforeLift={() => resumePendingTransaction(store)}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </StrictMode>,
  )
})()
