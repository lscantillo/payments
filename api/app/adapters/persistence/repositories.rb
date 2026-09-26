# frozen_string_literal: true

module Persistence
  class ProductRepository
    def list
      ProductRecord.order(:id).map { |record| to_product(record) }
    end

    def find(id)
      record = ProductRecord.find_by(id:)
      record && to_product(record)
    end

    def decrement_stock(id)
      ProductRecord.where(id:).where('stock > 0').update_all('stock = stock - 1, updated_at = CURRENT_TIMESTAMP')
    end

    def to_product(record)
      Domain::Product.new(
        id: record.id,
        name: record.name,
        description: record.description,
        image_url: record.image_url,
        price_in_cents: record.price_in_cents,
        currency: record.currency,
        stock: record.stock
      )
    end
  end

  class CustomerRepository
    def create(full_name:, email:, phone:)
      record = CustomerRecord.create!(id: SecureRandom.uuid, full_name:, email:, phone:)
      Domain::Customer.new(id: record.id, full_name:, email:, phone:)
    end
  end

  class DeliveryRepository
    def create(customer_id:, address:, city:, region:)
      record = DeliveryRecord.create!(id: SecureRandom.uuid, customer_id:, address:, city:, region:)
      Domain::Delivery.new(id: record.id, customer_id:, address:, city:, region:)
    end
  end

  class TransactionRepository
    def create(product_id:, customer_id:, delivery_id:, card_token:, installments:, reference:, quote:)
      record = TransactionRecord.create!(
        id: SecureRandom.uuid,
        product_id:,
        customer_id:,
        delivery_id:,
        card_token:,
        installments:,
        status: 'PENDING',
        reference:,
        gateway_id: nil,
        product_amount_in_cents: quote.product_amount_in_cents,
        base_fee_in_cents: quote.base_fee_in_cents,
        shipping_fee_in_cents: quote.shipping_fee_in_cents,
        total_in_cents: quote.total_in_cents,
        currency: quote.currency
      )
      to_transaction(record)
    end

    def find(id)
      record = TransactionRecord.find_by(id:)
      record && to_transaction(record)
    end

    def attach_gateway(id, gateway_id)
      record = TransactionRecord.find(id)
      record.update!(gateway_id:)
      to_transaction(record)
    end

    def mark_if_pending(id, status)
      changed = TransactionRecord.where(id:, status: 'PENDING').update_all(
        ['status = ?, updated_at = CURRENT_TIMESTAMP', status]
      ) == 1
      [to_transaction(TransactionRecord.find(id)), changed]
    end

    def to_transaction(record)
      Domain::Transaction.new(
        id: record.id,
        product_id: record.product_id,
        customer_id: record.customer_id,
        delivery_id: record.delivery_id,
        card_token: record.card_token,
        installments: record.installments,
        status: record.status,
        reference: record.reference,
        product_amount_in_cents: record.product_amount_in_cents,
        base_fee_in_cents: record.base_fee_in_cents,
        shipping_fee_in_cents: record.shipping_fee_in_cents,
        total_in_cents: record.total_in_cents,
        currency: record.currency,
        gateway_id: record.gateway_id
      )
    end
  end
end
