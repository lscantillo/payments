# Checkout store

![Frontend coverage](https://img.shields.io/badge/frontend_coverage-95.39%25-brightgreen)
![Backend coverage](https://img.shields.io/badge/backend_coverage-100%25-brightgreen)

Mobile-first storefront for a small ceramics studio. The React SPA lives in `fe-store`. The Sinatra API lives in `api`. The browser can run against local mocks, or against the API on port 4567.

## Stack

- React 19, TypeScript, Vite
- Redux Toolkit for Flux state, with `redux-persist` for the checkout session
- React Router for the catalog (`/`) and each product (`/products/:id`)
- Plain CSS (Flexbox and CSS Grid) in `fe-store/src/styles/global.css`
- Jest, React Testing Library, and MSW

## Requirements

- Node.js 22 or newer
- Ruby 3.4.7, via mise (`api/.ruby-version`)
- PostgreSQL 18

## Run locally

```bash
cd fe-store
cp .env.example .env
npm install
npm run dev
```

The dev server prints a local URL. With `VITE_USE_MOCKS=true`, the catalog, quote, and payment calls stay in the browser. Set it to `false` to use the API below.

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Start the SPA |
| `npm run build` | Typecheck and production build |
| `npm test` | Jest |
| `npm run test:coverage` | Jest with the coverage report |

## Environment

Copy `fe-store/.env.example`. Never commit `.env`.

| Variable | Purpose |
| :--- | :--- |
| `VITE_API_BASE_URL` | Own API origin. Default `http://localhost:4567` |
| `VITE_PRODUCT_ID` | Reserved. The shop lists the catalog, and each detail page uses the id in the route |
| `VITE_GATEWAY_API_URL` | Sandbox gateway base, for example `https://api-sandbox.co.uat.wompi.dev/v1` |
| `VITE_GATEWAY_PUBLIC_KEY` | Sandbox public key. The private key and the integrity secret stay on the server |
| `VITE_USE_MOCKS` | `true` intercepts the API and the gateway so the UI runs without a backend |

## Shopper flow

1. `/` loads `GET /api/products` and shows each piece with price, stock, and a detail link.
2. `/products/:id` loads `GET /api/products/:id`. The button label is `Pay with credit card`. It stays disabled when stock is zero.
3. The payment modal checks the card with the Luhn algorithm, detects Visa or Mastercard, and validates the CVV, expiry, and delivery fields.
4. Continuing tokenizes the card in the browser and asks the API for a quote: product amount, mandatory base fee, shipping, and total.
5. Confirm sends `POST /api/transactions` with the token and one installment. The app polls `GET /api/transactions/:id` until the status is approved, declined, failed, or still pending.
6. Returning to the product clears the checkout session and reloads the stock.

A refresh keeps the step, delivery details, quote, last four digits, and transaction. The card number and CVV must be entered again.

## API contract

Amounts are integer cents. Currency is `COP`. JSON is camelCase.

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/checkout/quote` with `{ productId }`
- `POST /api/transactions` with `{ productId, cardToken, installments, customer, delivery }` returns `PENDING`
- `GET /api/transactions/:id` returns `PENDING`, `APPROVED`, `DECLINED`, or `ERROR`

## Card data

The card number and CVV live only in the payment modal. The browser exchanges them for a gateway token using the public key. Redux, `localStorage`, and the request to our API store `cardToken` and card metadata (brand, last four, holder, expiry). They never store the full number or the CVV.

## Tests

Jest, React Testing Library, and MSW. Global coverage stays above 80%.

| Metric | Result |
| :--- | :--- |
| Statements | 93.69% |
| Branches | 82.63% |
| Functions | 93.75% |
| Lines | 95.39% |

33 tests pass (`npm run test:coverage` inside `fe-store`).

## API

The Sinatra app is in `api`. Setup and the data model are in [`api/README.md`](api/README.md). With the API running, Swagger UI is at [http://localhost:4567/docs](http://localhost:4567/docs).

```bash
cd api
cp .env.example .env
bundle install
bundle exec rake db:create db:seed
bundle exec rackup -p 4567
```

Use cases return a Result. ActiveRecord is the PostgreSQL adapter and does not leak into the domain. RSpec coverage for this module is 100% of lines (383 / 383) and 93.26% of branches (83 / 89).

## VPS

Docker Compose runs PostgreSQL, the API, the storefront, and Caddy on one server. Database files stay in a Docker volume on that machine. Nothing here uses a managed database or object storage.

On the server, install Docker, clone this repository, and create `.env` from [`.env.example`](.env.example). Put the sandbox keys there. The private key and the integrity secret are read when the API starts. The public key is copied into the storefront build, so changing it requires `docker compose up -d --build`.

```bash
cp .env.example .env
docker compose up -d --build
```

`PUBLIC_HOST=:80` serves plain HTTP on port 80. Open `http://YOUR_SERVER_IP`. Swagger is at `/docs`. For HTTPS, point a domain at the server, set `PUBLIC_HOST` to that domain and `PUBLIC_ORIGIN` to `https://that-domain`, then run `docker compose up -d --build` again. Caddy requests the certificate. Leave ports 80 and 443 open.

`docker compose down` stops the containers and keeps the database volume. `docker compose down -v` deletes it.

## Layout

```
fe-store/src/app          store, hooks, persist storage
fe-store/src/config       environment
fe-store/src/domain       shared types
fe-store/src/features     catalog, product detail, payment, checkout
fe-store/src/services     HTTP client, tokenizer, polling
fe-store/src/shared       money formatting and form controls
fe-store/src/styles       global CSS
fe-store/src/mocks        MSW handlers used in the browser and in tests
api/app/domain            entities and Result
api/app/application       checkout use cases
api/app/adapters          Sinatra, ActiveRecord, sandbox gateway
```
