# frozen_string_literal: true

require 'rack/cors'

module App
  class Http < Sinatra::Base
    helpers Sinatra::JSON

    use Rack::Cors do
      allow do
        origins(*ENV.fetch('ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map(&:strip))
        resource '/api/*', headers: :any, methods: %i[get post options]
      end
    end

    set :show_exceptions, false
    set :raise_errors, false
    set :host_authorization, { permitted_hosts: [] }

    before do
      headers['X-Content-Type-Options'] = 'nosniff'
      headers['X-Frame-Options'] = 'DENY'
      headers['Referrer-Policy'] = 'no-referrer'
      headers['Cache-Control'] = 'no-store'
    end

    def self.wire(container)
      set :container, container
    end

    get '/api/products' do
      respond(settings.container.list_products.call) { |products| products.map { |product| Serializers.product(product) } }
    end

    get '/api/products/:id' do
      respond(settings.container.get_product.call(params['id'])) { |product| Serializers.product(product) }
    end

    post '/api/checkout/quote' do
      body = json_body
      product_id = body.is_a?(Hash) ? body['productId'] : nil
      respond(settings.container.build_quote.call(product_id)) { |quote| Serializers.quote(quote) }
    end

    post '/api/transactions' do
      respond(settings.container.create_transaction.call(json_body), success: 201) do |payload|
        Serializers.transaction(payload)
      end
    end

    get '/api/transactions/:id' do
      respond(settings.container.get_transaction.call(params['id'])) { |payload| Serializers.transaction(payload) }
    end

    get '/docs' do
      send_file File.join(App::ROOT, 'public', 'docs.html'), type: :html
    end

    get '/openapi.yaml' do
      send_file File.join(App::ROOT, 'openapi.yaml'), type: 'application/yaml'
    end

    error JSON::ParserError do
      halt_error(Domain::Error.invalid('El cuerpo debe ser JSON.'))
    end

    error do
      content_type :json
      status 500
      JSON.generate({ message: 'No se pudo completar la solicitud.' })
    end

    private

    def json_body
      return @json_body if defined?(@json_body)

      input = request.body
      input.rewind if input.respond_to?(:rewind)
      raw = input.read
      @json_body = raw.nil? || raw.empty? ? {} : JSON.parse(raw)
    end

    def respond(result, success: 200)
      return halt_error(result.error) if result.failure?

      status success
      json yield(result.value)
    end

    def halt_error(error)
      content_type :json
      halt error.http_status, JSON.generate({ message: error.message })
    end
  end
end
