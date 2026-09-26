# frozen_string_literal: true

module Persistence
  module Database
    def self.establish!
      ActiveRecord::Base.establish_connection(ENV.fetch('DATABASE_URL'))
    end

    def self.transaction(&)
      ActiveRecord::Base.transaction(&)
    end
  end
end

Persistence::Database.establish! if ENV['DATABASE_URL']
