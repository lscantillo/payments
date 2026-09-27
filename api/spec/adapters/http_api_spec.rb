# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'HTTP API' do
  before { seed_catalog! }

  let(:order) do
    {
      productId: 'prod-1',
      cardToken: 'tok_approved',
      installments: 1,
      customer: { fullName: 'Ada Lovelace', email: 'ada@example.com', phone: '3001234567' },
      delivery: { address: 'Calle 10', city: 'Bogota', region: 'Cundinamarca' }
    }
  end

  def pay(body)
    json_post '/api/checkout/quote', { productId: body[:productId] }
    json_post '/api/transactions', body, 'HTTP_AUTHORIZATION' => "Bearer #{json_body['checkoutToken']}"
  end

  it 'serves Swagger UI and the OpenAPI document' do
    get '/docs'
    expect(last_response).to be_ok
    expect(last_response.body).to include('swagger-ui')
    expect(last_response.body).to include('/openapi.yaml')

    get '/openapi.yaml'
    expect(last_response).to be_ok
    expect(last_response.body).to include('openapi: 3.0.3')
  end

  it 'lists the catalog and quotes a product' do
    get '/api/products'
    expect(last_response).to be_ok
    expect(json_body.map { |product| product['id'] }).to include('prod-1', 'prod-4')

    get '/api/products/prod-1'
    expect(json_body['priceInCents']).to eq(8_900_000)
    expect(json_body['stock']).to eq(5)

    json_post '/api/checkout/quote', { productId: 'prod-1' }
    expect(json_body['totalInCents']).to eq(9_950_000)
    expect(json_body['baseFeeInCents']).to eq(150_000)
    expect(json_body['checkoutToken']).to match(/\A[\w-]+\.[\w-]+\.[\w-]+\z/)

    get '/api/products/missing'
    expect(last_response.status).to eq(404)
  end

  it 'approves a payment without storing the card number' do
    pay(order)
    expect(last_response.status).to eq(201)
    expect(json_body['status']).to eq('APPROVED')
    expect(json_body['stock']).to eq(4)
    expect(json_body).not_to have_key('cardToken')
    expect(last_response.body).not_to include('4242424242424242')
    stored = Persistence::TransactionRecord.find(json_body['id'])
    expect(stored.card_token).to eq('tok_approved')
    expect(stored.attributes.values.join).not_to include('cvc')

    get "/api/transactions/#{json_body['id']}"
    expect(json_body['status']).to eq('APPROVED')
  end

  it 'leaves stock unchanged when the token is declined' do
    pay(order.merge(cardToken: 'tok_declined'))
    expect(json_body['status']).to eq('DECLINED')
    expect(json_body['stock']).to eq(5)
    expect(Persistence::ProductRecord.find('prod-1').stock).to eq(5)
  end

  it 'rejects a card number and an invalid body' do
    pay(order.merge(cardToken: '4242424242424242'))
    expect(last_response.status).to eq(422)
    expect(Persistence::TransactionRecord.count).to eq(0)

    post '/api/transactions', '{', { 'CONTENT_TYPE' => 'application/json' }
    expect(last_response.status).to eq(422)

    json_post '/api/checkout/quote', {}
    expect(last_response.status).to eq(404)

    post '/api/checkout/quote', '', { 'CONTENT_TYPE' => 'application/json' }
    expect(last_response.status).to eq(404)

    json_post '/api/checkout/quote', { productId: 'prod-1' }
    quoted = json_body['checkoutToken']
    json_post '/api/transactions', order.merge(productId: 'prod-2'), 'HTTP_AUTHORIZATION' => "Bearer #{quoted}"
    expect(last_response.status).to eq(401)

    missing = Adapters::JwtCheckoutToken.new(secret: ENV.fetch('CHECKOUT_TOKEN_SECRET')).issue(
      product_id: 'missing', total_in_cents: 1, currency: 'COP'
    )
    json_post '/api/transactions', order.merge(productId: 'missing'), 'HTTP_AUTHORIZATION' => "Bearer #{missing}"
    expect(last_response.status).to eq(404)
  end

  it 'rejects a missing, expired, or altered checkout token' do
    json_post '/api/transactions', order
    expect(last_response.status).to eq(401)

    json_post '/api/checkout/quote', { productId: 'prod-1' }
    token = json_body['checkoutToken']
    json_post '/api/transactions', order, 'HTTP_AUTHORIZATION' => "Bearer #{token}x"
    expect(last_response.status).to eq(401)

    expired = JWT.encode(
      { 'productId' => 'prod-1', 'totalInCents' => 9_950_000, 'currency' => 'COP', 'exp' => Time.now.to_i - 5 },
      ENV.fetch('CHECKOUT_TOKEN_SECRET'),
      'HS256'
    )
    json_post '/api/transactions', order, 'HTTP_AUTHORIZATION' => "Bearer #{expired}"
    expect(last_response.status).to eq(401)
    expect(json_body['message']).to match(/expir/)

    stale = JWT.encode(
      { 'productId' => 'prod-1', 'totalInCents' => 1, 'currency' => 'COP', 'exp' => Time.now.to_i + 60 },
      ENV.fetch('CHECKOUT_TOKEN_SECRET'),
      'HS256'
    )
    json_post '/api/transactions', order, 'HTTP_AUTHORIZATION' => "Bearer #{stale}"
    expect(last_response.status).to eq(401)
  end

  it 'returns a generic error when a use case raises' do
    raising = Object.new
    def raising.call(*) = raise 'boom'
    App::Http.wire(App.container.with(list_products: raising))
    get '/api/products'
    expect(last_response.status).to eq(500)
    expect(json_body['message']).to match(/solicitud/)
  ensure
    App::Http.wire(App.container)
  end
end
