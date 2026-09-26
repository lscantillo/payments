# frozen_string_literal: true

module Application
  class ListProducts
    def initialize(products:)
      @products = products
    end

    def call
      Domain::Result.ok(@products.list)
    end
  end

  class GetProduct
    def initialize(products:)
      @products = products
    end

    def call(id)
      product = @products.find(id)
      return Domain::Result.err(Domain::Error.not_found('Producto no encontrado.')) unless product

      Domain::Result.ok(product)
    end
  end

  class BuildQuote
    BASE_FEE_IN_CENTS = 150_000
    SHIPPING_FEE_IN_CENTS = 900_000

    def initialize(products:)
      @products = products
    end

    def call(product_id)
      product = @products.find(product_id.to_s)
      return Domain::Result.err(Domain::Error.not_found('Producto no encontrado.')) unless product

      amount = product.price_in_cents
      Domain::Result.ok(Domain::Quote.new(
                          product_amount_in_cents: amount,
                          base_fee_in_cents: BASE_FEE_IN_CENTS,
                          shipping_fee_in_cents: SHIPPING_FEE_IN_CENTS,
                          total_in_cents: amount + BASE_FEE_IN_CENTS + SHIPPING_FEE_IN_CENTS,
                          currency: 'COP'
                        ))
    end
  end
end
