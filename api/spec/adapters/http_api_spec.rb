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

    get '/api/products/missing'
    expect(last_response.status).to eq(404)
  end

  it 'approves a payment without storing the card number' do
    json_post '/api/transactions', order
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
    json_post '/api/transactions', order.merge(cardToken: 'tok_declined')
    expect(json_body['status']).to eq('DECLINED')
    expect(json_body['stock']).to eq(5)
    expect(Persistence::ProductRecord.find('prod-1').stock).to eq(5)
  end

  it 'rejects a card number and an invalid body' do
    json_post '/api/transactions', order.merge(cardToken: '4242424242424242')
    expect(last_response.status).to eq(422)
    expect(Persistence::TransactionRecord.count).to eq(0)

    post '/api/transactions', '{', { 'CONTENT_TYPE' => 'application/json' }
    expect(last_response.status).to eq(422)

    json_post '/api/checkout/quote', {}
    expect(last_response.status).to eq(404)

    post '/api/checkout/quote', '', { 'CONTENT_TYPE' => 'application/json' }
    expect(last_response.status).to eq(404)

    json_post '/api/transactions', order.merge(productId: 'missing')
    expect(last_response.status).to eq(404)
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
