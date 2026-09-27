# frozen_string_literal: true

require 'jwt'

module Adapters
  class JwtCheckoutToken
    TTL_SECONDS = 600

    def initialize(secret:, ttl: TTL_SECONDS)
      @secret = secret
      @ttl = ttl
    end

    def issue(product_id:, total_in_cents:, currency:)
      now = Time.now.to_i
      JWT.encode(
        {
          'productId' => product_id,
          'totalInCents' => total_in_cents,
          'currency' => currency,
          'iat' => now,
          'exp' => now + @ttl
        },
        @secret,
        'HS256'
      )
    end

    def verify(token)
      payload, = JWT.decode(token.to_s, @secret, true, { algorithm: 'HS256' })
      Domain::Result.ok(
        Application::CheckoutGrant.new(
          product_id: payload['productId'].to_s,
          total_in_cents: payload['totalInCents'],
          currency: payload['currency'].to_s
        )
      )
    rescue JWT::ExpiredSignature
      Domain::Result.err(Domain::Error.unauthorized('La cotización expiró. Vuelve a confirmar el pago.'))
    rescue JWT::DecodeError
      Domain::Result.err(Domain::Error.unauthorized('No se pudo validar el pago.'))
    end
  end
end
