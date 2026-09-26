import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './app/hooks'
import { env } from './config/env'
import { fetchProduct } from './features/product/productSlice'
import { ProductPage } from './features/product/ProductPage'
import { PaymentModal } from './features/payment/PaymentModal'
import { SummaryBackdrop } from './features/checkout/SummaryBackdrop'
import { StatusScreen } from './features/checkout/StatusScreen'

export default function App() {
  const dispatch = useAppDispatch()
  const step = useAppSelector((state) => state.checkout.step)

  useEffect(() => {
    void dispatch(fetchProduct(env.productId))
  }, [dispatch])

  return (
    <main className="shell" data-step={step}>
      <ProductPage />
      {step === 'payment' ? <PaymentModal /> : null}
      {step === 'summary' ? <SummaryBackdrop /> : null}
      {step === 'processing' || step === 'result' ? <StatusScreen /> : null}
    </main>
  )
}
