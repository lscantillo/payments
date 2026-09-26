# frozen_string_literal: true

class MemoryDatabase
  def transaction
    yield
  end
end

class MemoryProducts
  def initialize(rows)
    @rows = rows
  end

  def list = @rows.values
  def find(id) = @rows[id]

  def decrement_stock(id)
    product = @rows[id]
    return unless product && product.stock.positive?

    @rows[id] = product.with(stock: product.stock - 1)
  end
end

class MemoryCustomers
  def create(full_name:, email:, phone:)
    Domain::Customer.new(id: SecureRandom.uuid, full_name:, email:, phone:)
  end
end

class MemoryDeliveries
  def create(customer_id:, address:, city:, region:)
    Domain::Delivery.new(id: SecureRandom.uuid, customer_id:, address:, city:, region:)
  end
end

class MemoryTransactions
  def initialize
    @rows = {}
  end

  def create(product_id:, customer_id:, delivery_id:, card_token:, installments:, reference:, quote:)
    transaction = Domain::Transaction.new(
      id: SecureRandom.uuid,
      product_id:,
      customer_id:,
      delivery_id:,
      card_token:,
      installments:,
      status: 'PENDING',
      reference:,
      product_amount_in_cents: quote.product_amount_in_cents,
      base_fee_in_cents: quote.base_fee_in_cents,
      shipping_fee_in_cents: quote.shipping_fee_in_cents,
      total_in_cents: quote.total_in_cents,
      currency: quote.currency,
      gateway_id: nil
    )
    @rows[transaction.id] = transaction
    transaction
  end

  def find(id) = @rows[id]

  def attach_gateway(id, gateway_id)
    @rows[id] = @rows[id].with(gateway_id:)
  end

  def mark_if_pending(id, status)
    current = @rows[id]
    return [current, false] unless current.pending?

    @rows[id] = current.with(status:)
    [@rows[id], true]
  end
end

class ScriptedGateway
  def initialize(charge:, fetch: nil)
    @charge = charge
    @fetch = fetch || charge
  end

  def charge(**)
    @charge
  end

  def fetch(_id)
    @fetch
  end
end
