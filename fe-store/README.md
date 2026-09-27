# fe-store

SPA de checkout: producto, datos de tarjeta y entrega, resumen de tarifas y estado final del pago. React, TypeScript y Redux Toolkit (Flux).

## Requisitos

- Node.js 24 o superior
- API de checkout en `VITE_API_BASE_URL` (el backend todavía puede no estar levantado; los mocks locales cubren el flujo)

## Instalación

```bash
cd fe-store
cp .env.example .env
npm install
npx msw init public/ --save
```

## Variables

| Variable | Uso |
| :--- | :--- |
| `VITE_API_BASE_URL` | Origen de la API propia |
| `VITE_PRODUCT_ID` | Reservado. La tienda lista el catálogo y cada ficha usa el id de la ruta |
| `VITE_GATEWAY_API_URL` | Base de la pasarela sandbox, por ejemplo `https://api-sandbox.co.uat.wompi.dev/v1` |
| `VITE_GATEWAY_PUBLIC_KEY` | Llave pública de sandbox. La llave privada no vive en el frontend |
| `VITE_USE_MOCKS` | `true` intercepta API y pasarela en el navegador para desarrollar sin backend |

El número de tarjeta y el CVV se tokenizan en el navegador con la llave pública. No entran a Redux, a `localStorage` ni al cuerpo que se envía a la API propia. El backend recibe `cardToken`, el cliente y la entrega.

## Scripts

```bash
npm run dev
npm run build
npm test
npm run test:coverage
```

## Flujo

1. La portada carga `GET /api/products` y enlaza cada pieza a `/products/:id`. La ficha carga `GET /api/products/:id`. Sin stock, `Pay with credit card` queda deshabilitado.
2. El modal valida Luhn, marca (Visa / Mastercard), CVV, vencimiento y datos de entrega.
3. Al continuar, el navegador pide un token a la pasarela y la API devuelve el quote: monto del producto, tarifa base, tarifa de envío y total.
4. Confirmar envía `POST /api/transactions` con el token y una cuota. La pantalla consulta `GET /api/transactions/:id` hasta Aprobada, Rechazada, Fallida o un pendiente que se puede reconsultar.
5. Volver al producto limpia la sesión y vuelve a pedir el stock.

Un refresh conserva el paso, la entrega, el quote, los últimos 4 dígitos y la transacción. La tarjeta hay que volver a escribirla.

## Cobertura

Jest, React Testing Library y MSW. Umbral global superior al 80%.

| Métrica | Resultado |
| :--- | :--- |
| Statements | 93.69% |
| Branches | 82.63% |
| Functions | 93.75% |
| Lines | 95.39% |

33 pruebas pasando (`npm run test:coverage`).
