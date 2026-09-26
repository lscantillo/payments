# frozen_string_literal: true

module App
  Container = Data.define(:list_products, :get_product, :build_quote, :create_transaction, :get_transaction)

  def self.container(gateway: nil)
    database = Persistence::Database
    products = Persistence::ProductRepository.new
    customers = Persistence::CustomerRepository.new
    deliveries = Persistence::DeliveryRepository.new
    transactions = Persistence::TransactionRepository.new
    gateway ||= Gateways.build_from_env
    sync = Application::SyncPayment.new(transactions:, products:, database:)
    Container.new(
      list_products: Application::ListProducts.new(products:),
      get_product: Application::GetProduct.new(products:),
      build_quote: Application::BuildQuote.new(products:),
      create_transaction: Application::CreateTransaction.new(
        products:, customers:, deliveries:, transactions:, gateway:, sync:, database:
      ),
      get_transaction: Application::GetTransaction.new(transactions:, products:, gateway:, sync:)
    )
  end
end
