# frozen_string_literal: true

module Domain
  Product = Data.define(:id, :name, :description, :image_url, :price_in_cents, :currency, :stock)
  Quote = Data.define(
    :product_amount_in_cents, :base_fee_in_cents, :shipping_fee_in_cents, :total_in_cents, :currency
  )
  Customer = Data.define(:id, :full_name, :email, :phone)
  Delivery = Data.define(:id, :customer_id, :address, :city, :region)
  Charge = Data.define(:gateway_id, :status)
  Transaction = Data.define(
    :id, :product_id, :customer_id, :delivery_id, :card_token, :installments,
    :status, :reference, :product_amount_in_cents, :base_fee_in_cents,
    :shipping_fee_in_cents, :total_in_cents, :currency, :gateway_id
  ) do
    def pending? = status == 'PENDING'
    def terminal? = !pending?
  end
end
