# frozen_string_literal: true

module Domain
  module Ports
    # ProductRepository: find(id), list, decrement_stock(id)
    # CustomerRepository: create(full_name:, email:, phone:)
    # DeliveryRepository: create(customer_id:, address:, city:, region:)
    # TransactionRepository: create(attrs), find(id), attach_gateway(id, gateway_id), mark_if_pending(id, status)
    # PaymentGateway: charge(...), fetch(gateway_id)
    # Database: transaction { }
  end
end
