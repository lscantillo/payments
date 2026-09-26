# frozen_string_literal: true

module Application
  class SyncPayment
    def initialize(transactions:, products:, database:)
      @transactions = transactions
      @products = products
      @database = database
    end

    def call(transaction, remote_status)
      return Domain::Result.ok(transaction) if !transaction.pending? || remote_status == 'PENDING'

      updated = transaction
      @database.transaction do
        updated, changed = @transactions.mark_if_pending(transaction.id, remote_status)
        @products.decrement_stock(updated.product_id) if changed && remote_status == 'APPROVED'
      end
      Domain::Result.ok(updated)
    end
  end
end
