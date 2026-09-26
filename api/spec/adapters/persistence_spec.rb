# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'persistence repositories' do
  let(:products) { Persistence::ProductRepository.new }
  let(:transactions) { Persistence::TransactionRepository.new }

  before { seed_catalog! }

  it 'stores a checkout and settles it once' do
    expect(products.list.map(&:id)).to include('prod-2')
    customer = Persistence::CustomerRepository.new.create(full_name: 'Ada', email: 'ada@example.com', phone: '3001234567')
    delivery = Persistence::DeliveryRepository.new.create(customer_id: customer.id, address: 'Calle 10', city: 'Bogota', region: 'Cundinamarca')
    quote = Application::BuildQuote.new(products:).call('prod-1').value
    created = transactions.create(
      product_id: 'prod-1', customer_id: customer.id, delivery_id: delivery.id,
      card_token: 'tok_approved', installments: 1, reference: 'REF-db', quote:
    )
    attached = transactions.attach_gateway(created.id, 'gw_db')
    expect(attached.gateway_id).to eq('gw_db')

    _, changed = transactions.mark_if_pending(created.id, 'APPROVED')
    products.decrement_stock('prod-1')
    _, second = transactions.mark_if_pending(created.id, 'APPROVED')
    expect(changed).to be(true)
    expect(second).to be(false)
    expect(products.find('prod-1').stock).to eq(4)
    products.decrement_stock('missing')
  end
end
