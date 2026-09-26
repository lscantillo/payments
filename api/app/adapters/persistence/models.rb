# frozen_string_literal: true

module Persistence
  class ProductRecord < ActiveRecord::Base
    self.table_name = 'products'
  end

  class CustomerRecord < ActiveRecord::Base
    self.table_name = 'customers'
  end

  class DeliveryRecord < ActiveRecord::Base
    self.table_name = 'deliveries'
  end

  class TransactionRecord < ActiveRecord::Base
    self.table_name = 'transactions'
  end
end
