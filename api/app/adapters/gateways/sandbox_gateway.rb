# frozen_string_literal: true

require 'net/http'
require 'digest'
require 'uri'

module Gateways
  class NetHttpClient
    def get(url, headers = {})
      request(Net::HTTP::Get.new(url), url, headers)
    end

    def post(url, body, headers = {})
      http_request = Net::HTTP::Post.new(url)
      http_request.body = JSON.generate(body)
      request(http_request, url, headers.merge('Content-Type' => 'application/json'))
    end

    private

    def request(http_request, url, headers)
      headers.each { |key, value| http_request[key] = value }
      response = Net::HTTP.start(url.hostname, url.port, use_ssl: url.scheme == 'https', open_timeout: 5, read_timeout: 15) do |http|
        http.request(http_request)
      end
      { status: response.code.to_i, body: parse(response.body) }
    end

    def parse(raw)
      JSON.parse(raw)
    rescue JSON::ParserError
      {}
    end
  end

  class SandboxGateway
    def initialize(base_url:, public_key:, private_key:, integrity_secret:, client: NetHttpClient.new)
      @base_url = base_url.end_with?('/') ? base_url : "#{base_url}/"
      @public_key = public_key
      @private_key = private_key
      @integrity_secret = integrity_secret
      @client = client
    end

    def self.signature(reference:, amount_in_cents:, currency:, secret:)
      Digest::SHA256.hexdigest("#{reference}#{amount_in_cents}#{currency}#{secret}")
    end

    def charge(amount_in_cents:, currency:, reference:, token:, installments:, email:)
      acceptance = acceptance_token
      return acceptance if acceptance.failure?

      signature = self.class.signature(reference:, amount_in_cents:, currency:, secret: @integrity_secret)
      response = @client.post(
        endpoint('transactions'),
        {
          acceptance_token: acceptance.value,
          amount_in_cents:,
          currency:,
          customer_email: email,
          reference:,
          signature:,
          payment_method_type: 'CARD',
          payment_method: { type: 'CARD', token:, installments: }
        },
        'Authorization' => "Bearer #{@private_key}"
      )
      read_charge(response)
    end

    def fetch(gateway_id)
      response = @client.get(endpoint("transactions/#{gateway_id}"), 'Authorization' => "Bearer #{@private_key}")
      read_charge(response)
    end

    private

    def acceptance_token
      response = @client.get(endpoint("merchants/#{@public_key}"), {})
      token = response.dig(:body, 'data', 'presigned_acceptance', 'acceptance_token') if response[:status] == 200
      return Domain::Result.ok(token) if token.is_a?(String) && !token.empty?

      Domain::Result.err(Domain::Error.unavailable('No se pudo preparar el pago.'))
    end

    def read_charge(response)
      data = response[:body].is_a?(Hash) ? response[:body]['data'] : nil
      if response[:status].between?(200, 299) && data.is_a?(Hash) && data['id']
        return Domain::Result.ok(Domain::Charge.new(gateway_id: data['id'], status: map_status(data['status'])))
      end

      Domain::Result.err(Domain::Error.unavailable('No se pudo crear el pago en la pasarela.'))
    end

    def map_status(status)
      case status
      when 'APPROVED', 'DECLINED', 'ERROR', 'PENDING' then status
      when 'VOIDED' then 'DECLINED'
      else 'PENDING'
      end
    end

    def endpoint(path)
      URI.join(@base_url, path)
    end
  end

  class FakeGateway
    def charge(token:, **)
      status = token == 'tok_declined' ? 'DECLINED' : 'APPROVED'
      Domain::Result.ok(Domain::Charge.new(gateway_id: "gw_#{token}", status:))
    end

    def fetch(gateway_id)
      status = gateway_id.include?('declined') ? 'DECLINED' : 'APPROVED'
      Domain::Result.ok(Domain::Charge.new(gateway_id:, status:))
    end
  end

  def self.build_from_env(client: NetHttpClient.new)
    if ENV['GATEWAY_MODE'] == 'fake' || ENV['GATEWAY_PRIVATE_KEY'].to_s.empty?
      return FakeGateway.new
    end

    SandboxGateway.new(
      base_url: ENV.fetch('GATEWAY_API_URL'),
      public_key: ENV.fetch('GATEWAY_PUBLIC_KEY'),
      private_key: ENV.fetch('GATEWAY_PRIVATE_KEY'),
      integrity_secret: ENV.fetch('GATEWAY_INTEGRITY_SECRET'),
      client:
    )
  end
end
