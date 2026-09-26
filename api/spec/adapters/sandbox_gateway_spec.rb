# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Gateways::SandboxGateway do
  let(:client) { ScriptedClient.new }
  let(:gateway) do
    described_class.new(
      base_url: 'https://gateway.test/v1',
      public_key: 'pub_test',
      private_key: 'prv_test',
      integrity_secret: 'integrity',
      client:
    )
  end

  it 'signs the reference, amount and currency' do
    signature = described_class.signature(reference: 'REF-1', amount_in_cents: 9_950_000, currency: 'COP', secret: 'integrity')
    expect(signature).to eq(Digest::SHA256.hexdigest('REF-19950000COPintegrity'))
  end

  it 'charges a card token and reads the gateway status' do
    client.queue(
      { status: 200, body: { 'data' => { 'presigned_acceptance' => { 'acceptance_token' => 'accept' } } } },
      { status: 201, body: { 'data' => { 'id' => 'gw_9', 'status' => 'PENDING' } } }
    )
    result = gateway.charge(
      amount_in_cents: 9_950_000, currency: 'COP', reference: 'REF-1',
      token: 'tok_approved', installments: 1, email: 'ada@example.com'
    )
    expect(result.value.status).to eq('PENDING')
    expect(client.posts.first[:body][:payment_method]).to eq({ type: 'CARD', token: 'tok_approved', installments: 1 })
    expect(client.posts.first[:body]).not_to have_key(:number)
    expect(client.posts.first[:headers]['Authorization']).to eq('Bearer prv_test')

    client.queue({ status: 200, body: { 'data' => { 'id' => 'gw_9', 'status' => 'VOIDED' } } })
    expect(gateway.fetch('gw_9').value.status).to eq('DECLINED')
  end

  it 'keeps a trailing slash and treats an unknown status as pending' do
    slashed = described_class.new(
      base_url: 'https://gateway.test/v1/',
      public_key: 'pub_test', private_key: 'prv_test', integrity_secret: 'integrity', client:
    )
    client.queue({ status: 200, body: { 'data' => { 'id' => 'gw_x', 'status' => 'UNKNOWN' } } })
    expect(slashed.fetch('gw_x').value.status).to eq('PENDING')
    expect(Gateways::FakeGateway.new.fetch('gw_tok_declined').value.status).to eq('DECLINED')
    expect(Gateways::FakeGateway.new.fetch('gw_tok_approved').value.status).to eq('APPROVED')
  end

  it 'builds the sandbox gateway when the private key is configured' do
    keys = %w[GATEWAY_MODE GATEWAY_PRIVATE_KEY GATEWAY_PUBLIC_KEY GATEWAY_API_URL GATEWAY_INTEGRITY_SECRET]
    saved = keys.to_h { |key| [key, ENV[key]] }
    ENV['GATEWAY_MODE'] = 'sandbox'
    ENV['GATEWAY_PRIVATE_KEY'] = 'prv_test'
    ENV['GATEWAY_PUBLIC_KEY'] = 'pub_test'
    ENV['GATEWAY_API_URL'] = 'https://gateway.test/v1'
    ENV['GATEWAY_INTEGRITY_SECRET'] = 'integrity'
    expect(Gateways.build_from_env(client:)).to be_a(described_class)
  ensure
    saved.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  it 'fails closed when the gateway does not return a charge' do
    client.queue({ status: 500, body: {} })
    expect(gateway.charge(amount_in_cents: 1, currency: 'COP', reference: 'R', token: 't', installments: 1, email: 'a@b.co')).to be_failure

    client.queue({ status: 200, body: { 'data' => { 'presigned_acceptance' => { 'acceptance_token' => 'accept' } } } }, { status: 422, body: 'nope' })
    expect(gateway.charge(amount_in_cents: 1, currency: 'COP', reference: 'R', token: 't', installments: 1, email: 'a@b.co')).to be_failure
  end
end

RSpec.describe Gateways::NetHttpClient do
  it 'posts JSON and parses the response' do
    response = instance_double(Net::HTTPResponse, code: '201', body: '{"data":{"id":"gw"}}')
    http = instance_double(Net::HTTP)
    allow(http).to receive(:request) do |request|
      expect(request['Authorization']).to eq('Bearer prv_test')
      expect(request.body).to include('tok_approved')
      response
    end
    allow(Net::HTTP).to receive(:start).and_yield(http)

    result = described_class.new.post(URI('https://gateway.test/v1/transactions'), { token: 'tok_approved' }, 'Authorization' => 'Bearer prv_test')
    expect(result[:status]).to eq(201)
    expect(result[:body].dig('data', 'id')).to eq('gw')
  end

  it 'returns an empty body when the gateway response is not JSON' do
    response = instance_double(Net::HTTPResponse, code: '502', body: '<html>')
    http = instance_double(Net::HTTP, request: response)
    allow(Net::HTTP).to receive(:start).and_yield(http)
    result = described_class.new.get(URI('https://gateway.test/v1/merchants/pub'))
    expect(result[:body]).to eq({})
  end
end

class ScriptedClient
  attr_reader :posts

  def initialize
    @responses = []
    @posts = []
  end

  def queue(*responses)
    @responses.concat(responses)
  end

  def get(*)
    @responses.shift
  end

  def post(url, body, headers)
    @posts << { url:, body:, headers: }
    @responses.shift
  end
end
