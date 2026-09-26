# frozen_string_literal: true

module Domain
  Error = Data.define(:code, :message, :http_status) do
    def self.not_found(message) = new(code: :not_found, message:, http_status: 404)
    def self.invalid(message) = new(code: :invalid, message:, http_status: 422)
    def self.conflict(message) = new(code: :conflict, message:, http_status: 409)
    def self.unavailable(message) = new(code: :unavailable, message:, http_status: 502)
  end

  Result = Data.define(:value, :error) do
    def success? = error.nil?
    def failure? = !success?

    def self.ok(value) = new(value:, error: nil)
    def self.err(error) = new(value: nil, error:)

    def and_then
      return self if failure?

      yield(value)
    end
  end
end
