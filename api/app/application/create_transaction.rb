# frozen_string_literal: true

module Application
  class CreateTransaction
    def initialize(products:, customers:, deliveries:, transactions:, gateway:, sync:, database:, reference: nil)
      @products = products
      @customers = customers
      @deliveries = deliveries
      @transactions = transactions
      @gateway = gateway
      @sync = sync
      @database = database
      @reference = reference
    end

    def call(payload, grant)
      CheckoutInput.parse(payload).and_then { |input| place(input, grant) }
    end

    private

    def place(input, grant)
      unless grant.product_id == input.product_id
        return Domain::Result.err(Domain::Error.unauthorized('La cotización no corresponde a este producto.'))
      end

      product = @products.find(input.product_id)
      return Domain::Result.err(Domain::Error.not_found('Producto no encontrado.')) unless product
      if product.stock <= 0
        return Domain::Result.err(Domain::Error.conflict('No hay unidades disponibles.'))
      end

      BuildQuote.new(products: @products).call(product.id).and_then do |quote|
        unless quote.total_in_cents == grant.total_in_cents && quote.currency == grant.currency
          return Domain::Result.err(Domain::Error.unauthorized('La cotización expiró. Vuelve a confirmar el pago.'))
        end

        transaction = persist(input, quote)
        charge(transaction, input)
      end
    end

    def persist(input, quote)
      created = nil
      @database.transaction do
        customer = @customers.create(**input.customer)
        delivery = @deliveries.create(customer_id: customer.id, **input.delivery)
        created = @transactions.create(
          product_id: input.product_id,
          customer_id: customer.id,
          delivery_id: delivery.id,
          card_token: input.card_token,
          installments: input.installments,
          reference: @reference || "REF-#{SecureRandom.hex(6)}",
          quote:
        )
      end
      created
    end

    def charge(transaction, input)
      remote = @gateway.charge(
        amount_in_cents: transaction.total_in_cents,
        currency: transaction.currency,
        reference: transaction.reference,
        token: input.card_token,
        installments: input.installments,
        email: input.customer[:email]
      )
      unless remote.success?
        @transactions.mark_if_pending(transaction.id, 'ERROR')
        return remote
      end

      stored = @transactions.attach_gateway(transaction.id, remote.value.gateway_id)
      @sync.call(stored, remote.value.status).and_then { |settled| Domain::Result.ok(present(settled)) }
    end

    def present(transaction)
      stock = transaction.terminal? ? @products.find(transaction.product_id)&.stock : nil
      { transaction:, stock: }
    end
  end
end
