# frozen_string_literal: true

module Application
  CheckoutGrant = Data.define(:product_id, :total_in_cents, :currency)
end
