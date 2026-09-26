import { Navigate, Route, Routes, useMatch } from 'react-router'
import { useAppSelector } from './app/hooks'
import { PaymentModal } from './features/payment/PaymentModal'
import { StatusScreen } from './features/checkout/StatusScreen'
import { SummaryBackdrop } from './features/checkout/SummaryBackdrop'
import { CatalogPage } from './features/product/CatalogPage'
import { ProductPage } from './features/product/ProductPage'

export default function App() {
  const step = useAppSelector((state) => state.checkout.step)
  const onProduct = useMatch('/products/:productId')

  return (
    <main className="shell" data-step={step}>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:productId" element={<ProductPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {onProduct && step === 'payment' ? <PaymentModal /> : null}
      {onProduct && step === 'summary' ? <SummaryBackdrop /> : null}
      {onProduct && (step === 'processing' || step === 'result') ? <StatusScreen /> : null}
    </main>
  )
}
