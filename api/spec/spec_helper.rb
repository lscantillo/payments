# frozen_string_literal: true

ENV['RACK_ENV'] = 'test'
ENV['GATEWAY_MODE'] = 'fake'
ENV['DATABASE_URL'] = 'postgres:///checkout_test'
ENV['ALLOWED_ORIGINS'] = 'http://localhost:5173'

require 'pg'

admin = PG.connect(dbname: 'postgres')
unless admin.exec_params('SELECT 1 FROM pg_database WHERE datname = $1', ['checkout_test']).any?
  admin.exec('CREATE DATABASE checkout_test')
end
admin.close

require 'simplecov'
SimpleCov.start do
  enable_coverage :branch
  add_filter '/spec/'
  add_filter '/db/'
  add_filter '/config/'
  minimum_coverage line: 80
  minimum_coverage branch: 80
end

require_relative '../config/boot'
require 'rack/test'

schema = ActiveRecord::Base.connection_pool.schema_migration
ActiveRecord::MigrationContext.new(File.join(App::ROOT, 'db/migrate'), schema).migrate

module RequestHelpers
  def app = App::Http

  def json_post(path, body)
    post path, JSON.generate(body), { 'CONTENT_TYPE' => 'application/json' }
  end

  def json_body
    JSON.parse(last_response.body)
  end

  def seed_catalog!
    load File.join(App::ROOT, 'db/seeds.rb')
  end
end

RSpec.configure do |config|
  config.include Rack::Test::Methods
  config.include RequestHelpers
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end
  config.before do
    Persistence::TransactionRecord.delete_all
    Persistence::DeliveryRecord.delete_all
    Persistence::CustomerRecord.delete_all
    Persistence::ProductRecord.delete_all
  end
end

App::Http.wire(App.container)
