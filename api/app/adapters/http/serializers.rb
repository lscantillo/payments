# frozen_string_literal: true

module App
  module Serializers
    module_function

    def product(product)
      {
        id: product.id,
        name: product.name,
        description: product.description,
        imageUrl: product.image_url,
        priceInCents: product.price_in_cents,
        currency: product.currency,
        stock: product.stock
      }
    end

    def quote(quote)
      {
        productAmountInCents: quote.product_amount_in_cents,
        baseFeeInCents: quote.base_fee_in_cents,
        shippingFeeInCents: quote.shipping_fee_in_cents,
        totalInCents: quote.total_in_cents,
        currency: quote.currency
      }
    end

    def transaction(payload)
      transaction = payload[:transaction]
      body = {
        id: transaction.id,
        status: transaction.status,
        reference: transaction.reference
      }.merge(amounts(transaction))
      body[:stock] = payload[:stock] unless payload[:stock].nil?
      body
    end

    def amounts(transaction)
      {
        productAmountInCents: transaction.product_amount_in_cents,
        baseFeeInCents: transaction.base_fee_in_cents,
        shippingFeeInCents: transaction.shipping_fee_in_cents,
        totalInCents: transaction.total_in_cents,
        currency: transaction.currency
      }
    end
  end
end
