# frozen_string_literal: true

module Application
  class GetTransaction
    def initialize(transactions:, products:, gateway:, sync:)
      @transactions = transactions
      @products = products
      @gateway = gateway
      @sync = sync
    end

    def call(id)
      transaction = @transactions.find(id)
      return Domain::Result.err(Domain::Error.not_found('Transacción no encontrada.')) unless transaction

      transaction = refresh(transaction)
      stock = transaction.terminal? ? @products.find(transaction.product_id)&.stock : nil
      Domain::Result.ok({ transaction:, stock: })
    end

    private

    def refresh(transaction)
      return transaction unless transaction.pending? && transaction.gateway_id

      remote = @gateway.fetch(transaction.gateway_id)
      return transaction if remote.failure?

      @sync.call(transaction, remote.value.status).value
    end
  end
end
