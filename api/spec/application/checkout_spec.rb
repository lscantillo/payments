# frozen_string_literal: true

require 'spec_helper'
require_relative '../support/memory'

RSpec.describe 'checkout use cases' do
  let(:product) do
    Domain::Product.new(
      id: 'prod-1', name: 'Taza', description: 'Gres', image_url: '/products/aurora.svg',
      price_in_cents: 8_900_000, currency: 'COP', stock: 5
    )
  end
  let(:products) { MemoryProducts.new('prod-1' => product) }
  let(:transactions) { MemoryTransactions.new }
  let(:database) { MemoryDatabase.new }
  let(:sync) { Application::SyncPayment.new(transactions:, products:, database:) }

  def payload(overrides = {})
    {
      'productId' => 'prod-1',
      'cardToken' => 'tok_approved',
      'installments' => 1,
      'customer' => { 'fullName' => 'Ada Lovelace', 'email' => 'ada@example.com', 'phone' => '3001234567' },
      'delivery' => { 'address' => 'Calle 10', 'city' => 'Bogota', 'region' => 'Cundinamarca' }
    }.merge(overrides)
  end

  def use_case(gateway)
    Application::CreateTransaction.new(
      products:, customers: MemoryCustomers.new, deliveries: MemoryDeliveries.new,
      transactions:, gateway:, sync:, database:
    )
  end

  def grant_for(product_id)
    quote = Application::BuildQuote.new(products:).call(product_id)
    Application::CheckoutGrant.new(
      product_id:,
      total_in_cents: quote.success? ? quote.value.total_in_cents : 0,
      currency: 'COP'
    )
  end

  def place(gateway, body = payload)
    use_case(gateway).call(body, grant_for(body['productId']))
  end

  it 'quotes the product, base fee and shipping' do
    quote = Application::BuildQuote.new(products:).call('prod-1').value
    expect(quote.total_in_cents).to eq(9_950_000)
    expect(Application::BuildQuote.new(products:).call('missing')).to be_failure
  end

  it 'rejects a raw card number and a missing delivery' do
    pan = Application::CheckoutInput.parse(payload('cardToken' => '4242424242424242'))
    expect(pan).to be_failure
    expect(pan.error.message).to match(/token/)

    leaked = Application::CheckoutInput.parse(payload.merge('cvc' => '123'))
    expect(leaked.error.message).to match(/CVV/)

    expect(Application::CheckoutInput.parse(payload.merge('installments' => 2))).to be_failure
    expect(Application::CheckoutInput.parse('nope')).to be_failure
    expect(Application::CheckoutInput.parse(payload.merge('productId' => ''))).to be_failure
    expect(Application::CheckoutInput.parse(payload.merge('customer' => { 'fullName' => '', 'email' => 'ada@example.com', 'phone' => '3001234567' }))).to be_failure
    expect(Application::CheckoutInput.parse(payload.merge('delivery' => { 'address' => 'Calle 10', 'city' => '', 'region' => 'Cundinamarca' }))).to be_failure
  end

  it 'approves a token and decrements stock once' do
    gateway = ScriptedGateway.new(charge: Domain::Result.ok(Domain::Charge.new(gateway_id: 'gw_1', status: 'APPROVED')))
    result = place(gateway)
    expect(result.value[:transaction].status).to eq('APPROVED')
    expect(result.value[:stock]).to eq(4)
    expect(result.value[:transaction].card_token).to eq('tok_approved')

    again = sync.call(result.value[:transaction], 'APPROVED')
    expect(again.value.status).to eq('APPROVED')
    expect(products.find('prod-1').stock).to eq(4)
  end

  it 'keeps stock when the gateway declines or is unavailable' do
    declined = ScriptedGateway.new(charge: Domain::Result.ok(Domain::Charge.new(gateway_id: 'gw_2', status: 'DECLINED')))
    result = place(declined, payload('cardToken' => 'tok_declined'))
    expect(result.value[:transaction].status).to eq('DECLINED')
    expect(products.find('prod-1').stock).to eq(5)

    down = ScriptedGateway.new(charge: Domain::Result.err(Domain::Error.unavailable('No se pudo crear el pago en la pasarela.')))
    failed = place(down)
    expect(failed).to be_failure
    expect(products.find('prod-1').stock).to eq(5)
  end

  it 'refreshes a pending payment on read' do
    gateway = ScriptedGateway.new(
      charge: Domain::Result.ok(Domain::Charge.new(gateway_id: 'gw_3', status: 'PENDING')),
      fetch: Domain::Result.ok(Domain::Charge.new(gateway_id: 'gw_3', status: 'APPROVED'))
    )
    created = place(gateway)
    expect(created.value[:transaction].status).to eq('PENDING')
    expect(created.value[:stock]).to be_nil

    reader = Application::GetTransaction.new(transactions:, products:, gateway:, sync:)
    loaded = reader.call(created.value[:transaction].id)
    expect(loaded.value[:transaction].status).to eq('APPROVED')
    expect(loaded.value[:stock]).to eq(4)
    expect(reader.call('missing')).to be_failure

    stalled = ScriptedGateway.new(
      charge: Domain::Result.ok(Domain::Charge.new(gateway_id: 'gw_4', status: 'PENDING')),
      fetch: Domain::Result.err(Domain::Error.unavailable('caído'))
    )
    pending = place(stalled)
    still = Application::GetTransaction.new(transactions:, products:, gateway: stalled, sync:).call(pending.value[:transaction].id)
    expect(still.value[:transaction].status).to eq('PENDING')
    expect(still.value[:stock]).to be_nil
  end

  it 'does not sell a product that is out of stock' do
    products.decrement_stock('prod-1') until products.find('prod-1').stock.zero?
    result = place(ScriptedGateway.new(charge: nil), payload('productId' => 'missing'))
    expect(result.error.http_status).to eq(404)

    result = place(ScriptedGateway.new(charge: nil))
    expect(result.error.http_status).to eq(409)
  end

  it 'rejects a checkout grant that does not match the product or the total' do
    mismatched = use_case(ScriptedGateway.new(charge: nil)).call(payload, grant_for('prod-1').with(product_id: 'prod-2'))
    expect(mismatched.error.http_status).to eq(401)

    stale = use_case(ScriptedGateway.new(charge: nil)).call(payload, grant_for('prod-1').with(total_in_cents: 1))
    expect(stale.error.http_status).to eq(401)
  end
end
