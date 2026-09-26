import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { env } from './config/env'
import { catalog, createHandlers, sampleProduct, sampleQuote } from './mocks/handlers'
import { pollConfig } from './services/pollTransaction'
import { server } from './test/setup'
import { renderApp } from './test/renderApp'

async function fillCard(user: ReturnType<typeof userEvent.setup>, number = '4242424242424242') {
  await user.type(screen.getByLabelText('Número de tarjeta'), number)
  await user.type(screen.getByLabelText('Titular'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Mes'), '12')
  await user.type(screen.getByLabelText('Año'), '30')
  await user.type(screen.getByLabelText('CVV'), '999')
}

async function fillDelivery(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('Correo'), 'ada@example.com')
  await user.type(screen.getByLabelText('Teléfono'), '3001234567')
  await user.type(screen.getByLabelText('Dirección'), 'Calle 10 20 30')
  await user.type(screen.getByLabelText('Ciudad'), 'Bogota')
  await user.type(screen.getByLabelText('Departamento'), 'Cundinamarca')
}

async function pay(user: ReturnType<typeof userEvent.setup>, number = '4242424242424242') {
  await user.click(await screen.findByRole('button', { name: 'Pay with credit card' }))
  await fillCard(user, number)
  await fillDelivery(user)
}

describe('checkout flow', () => {
  it('lists the collection and opens a product detail before payment', async () => {
    const user = userEvent.setup()
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Piezas para la mesa, hechas a mano.' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pay with credit card' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ver detalle' })).toHaveLength(catalog.length)

    await user.click(screen.getAllByRole('link', { name: 'Ver detalle' })[1])
    expect(await screen.findByRole('heading', { name: catalog[1].name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pay with credit card' })).toBeEnabled()
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Volver al catálogo' }))
    expect(await screen.findByRole('heading', { name: 'Piezas para la mesa, hechas a mano.' })).toBeInTheDocument()
  })

  it('approves a card payment and returns with updated stock', async () => {
    const user = userEvent.setup()
    const view = renderApp()
    expect(await screen.findByRole('heading', { name: sampleProduct.name })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: sampleProduct.name })).toHaveAttribute('width', '640')
    expect(screen.getByText('5 unidades disponibles')).toBeInTheDocument()

    await pay(user)
    expect(screen.getByRole('status')).toHaveTextContent('Visa')
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))

    expect(await screen.findByRole('heading', { name: 'Resumen de pago' })).toBeInTheDocument()
    expect(screen.getByText(/99\.500/)).toBeInTheDocument()
    expect(screen.getByText(/Monto del producto/)).toBeInTheDocument()
    expect(screen.getByText(/Tarifa base/)).toBeInTheDocument()
    expect(screen.getByText(/Tarifa de envío/)).toBeInTheDocument()
    await view.persistor.flush()
    const stored = localStorage.getItem('persist:checkout') ?? ''
    expect(stored).not.toContain('4242424242424242')
    expect(stored).not.toContain('999')
    expect(JSON.stringify(view.store.getState())).not.toContain('4242424242424242')

    await user.click(screen.getByRole('button', { name: 'Confirmar y pagar' }))
    expect(await screen.findByRole('heading', { name: 'Aprobada' })).toBeInTheDocument()
    expect(view.store.getState().product.product?.stock).toBe(4)

    await user.click(screen.getByRole('button', { name: 'Volver al producto' }))
    expect(await screen.findByText('4 unidades disponibles')).toBeInTheDocument()
  })

  it('shows a declined payment without changing stock', async () => {
    const user = userEvent.setup()
    renderApp()
    await pay(user, '4111111111111111')
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar y pagar' }))
    expect(await screen.findByRole('heading', { name: 'Rechazada' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver al producto' }))
    expect(await screen.findByText('5 unidades disponibles')).toBeInTheDocument()
  })

  it('blocks invalid data, a gateway rejection and a failed charge', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Pay with credit card' }))
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    expect(screen.getByText('Ingresa un número Visa o Mastercard válido.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Número de tarjeta'), '5555555555554444')
    expect(screen.getByRole('status')).toHaveTextContent('Mastercard')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pay with credit card' }))
    expect(screen.getByLabelText('Nombre')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    server.use(
      http.post(`${env.gatewayApiUrl}/tokens/cards`, () =>
        HttpResponse.json({ message: 'Tarjeta inválida' }, { status: 422 }),
      ),
    )
    await pay(user)
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Tarjeta inválida')
    expect(screen.getByRole('heading', { name: 'Pago y entrega' })).toBeInTheDocument()

    server.use(...createHandlers())
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    expect(await screen.findByRole('heading', { name: 'Resumen de pago' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Ada Lovelace')

    await fillCard(user)
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    server.use(
      http.post(`${env.apiBaseUrl}/api/transactions`, () =>
        HttpResponse.json({ message: 'No disponible' }, { status: 500 }),
      ),
    )
    await user.click(await screen.findByRole('button', { name: 'Confirmar y pagar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No disponible')
    expect(screen.getByRole('heading', { name: 'Resumen de pago' })).toBeInTheDocument()
  })

  it('keeps a pending payment and lets the shopper check again', async () => {
    pollConfig.timeoutMs = 2000
    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, ({ params }) =>
        HttpResponse.json({
          id: String(params.id),
          status: 'PENDING',
          reference: 'REF-pending',
          ...sampleQuote,
        }),
      ),
    )
    const user = userEvent.setup()
    renderApp()
    await pay(user)
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar y pagar' }))
    expect(await screen.findByRole('heading', { name: 'Pendiente' })).toBeInTheDocument()

    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, ({ params }) =>
        HttpResponse.json({
          id: String(params.id),
          status: 'ERROR',
          reference: 'REF-pending',
          ...sampleQuote,
        }),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Consultar de nuevo' }))
    expect(await screen.findByRole('heading', { name: 'Fallida' })).toBeInTheDocument()
  })

  it('restores delivery after a refresh and leaves the card empty', async () => {
    const user = userEvent.setup()
    const first = renderApp()
    await user.click(await screen.findByRole('button', { name: 'Pay with credit card' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ada Lovelace')
    await user.type(screen.getByLabelText('Número de tarjeta'), '4242424242424242')
    await first.persistor.flush()
    first.persistor.pause()
    first.unmount()

    renderApp()
    expect(await screen.findByLabelText('Nombre')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Número de tarjeta')).toHaveValue('')
  })

  it('disables payment when the product is sold out and recovers from a load error', async () => {
    server.use(
      http.get(`${env.apiBaseUrl}/api/products/:id`, () =>
        HttpResponse.json({ ...sampleProduct, stock: 0 }),
      ),
    )
    const user = userEvent.setup()
    const soldOut = renderApp()
    expect(await screen.findByText('Agotado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pay with credit card' })).toBeDisabled()
    soldOut.unmount()

    server.use(
      http.get(`${env.apiBaseUrl}/api/products/:id`, () =>
        HttpResponse.json({ message: 'Caído' }, { status: 500 }),
      ),
    )
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Caído')
    server.use(...createHandlers())
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: sampleProduct.name })).toBeInTheDocument()
  })

  it('resumes a pending payment after refresh', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const user = userEvent.setup()
    const first = renderApp()
    await pay(user)
    await user.click(screen.getByRole('button', { name: 'Continuar al resumen' }))
    server.use(
      http.get(`${env.apiBaseUrl}/api/transactions/:id`, async () => {
        await gate
        return HttpResponse.json({
          id: 'tx-resume',
          status: 'APPROVED',
          reference: 'REF-resume',
          stock: 4,
          ...sampleQuote,
        })
      }),
    )
    await user.click(await screen.findByRole('button', { name: 'Confirmar y pagar' }))
    await waitFor(() => expect(first.store.getState().checkout.transaction?.id).toBeTruthy())
    await first.persistor.flush()
    first.persistor.pause()
    first.unmount()

    renderApp()
    expect(await screen.findByRole('heading', { name: 'Procesando tu pago…' })).toBeInTheDocument()
    release?.()
    expect(await screen.findByRole('heading', { name: 'Aprobada' })).toBeInTheDocument()
  })

  it('traps focus inside the payment dialog', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(await screen.findByRole('button', { name: 'Pay with credit card' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Continuar al resumen' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })
})
