# frozen_string_literal: true

module Application
  class CheckoutInput
    PAN = /\A\d{13,19}\z/
    EMAIL = /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/
    FORBIDDEN = %w[number cvc cvv pan].freeze

    Parsed = Data.define(:product_id, :card_token, :installments, :customer, :delivery)

    def self.parse(payload)
      return Domain::Result.err(Domain::Error.invalid('El cuerpo debe ser JSON.')) unless payload.is_a?(Hash)
      return Domain::Result.err(Domain::Error.invalid('No envíes el número de tarjeta ni el CVV.')) if forbidden?(payload)

      product_id = payload['productId'].to_s.strip
      token = payload['cardToken'].to_s.strip
      installments = Integer(payload['installments'], exception: false)
      customer = payload['customer']
      delivery = payload['delivery']

      if product_id.empty? || token.empty? || !customer.is_a?(Hash) || !delivery.is_a?(Hash)
        return Domain::Result.err(Domain::Error.invalid('Faltan datos para confirmar el pago.'))
      end
      if token.match?(PAN)
        return Domain::Result.err(Domain::Error.invalid('El token de la tarjeta es inválido.'))
      end
      unless installments == 1
        return Domain::Result.err(Domain::Error.invalid('Solo se admite una cuota.'))
      end

      customer_input = read_customer(customer)
      delivery_input = read_delivery(delivery)
      return customer_input if customer_input.failure?
      return delivery_input if delivery_input.failure?

      Domain::Result.ok(Parsed.new(
                          product_id:,
                          card_token: token,
                          installments:,
                          customer: customer_input.value,
                          delivery: delivery_input.value
                        ))
    end

    def self.forbidden?(payload)
      keys = payload.keys.map(&:to_s)
      nested = [payload['customer'], payload['delivery']].grep(Hash).flat_map { |item| item.keys.map(&:to_s) }
      (keys + nested).intersect?(FORBIDDEN)
    end

    def self.read_customer(customer)
      full_name = customer['fullName'].to_s.strip
      email = customer['email'].to_s.strip
      phone = customer['phone'].to_s.strip
      if full_name.empty? || !email.match?(EMAIL) || phone.gsub(/\D/, '').length < 7
        return Domain::Result.err(Domain::Error.invalid('Revisa el nombre, el correo y el teléfono.'))
      end

      Domain::Result.ok({ full_name:, email:, phone: })
    end

    def self.read_delivery(delivery)
      address = delivery['address'].to_s.strip
      city = delivery['city'].to_s.strip
      region = delivery['region'].to_s.strip
      if [address, city, region].any?(&:empty?)
        return Domain::Result.err(Domain::Error.invalid('Revisa la dirección de entrega.'))
      end

      Domain::Result.ok({ address:, city:, region: })
    end
  end
end
