# frozen_string_literal: true

class CreateCheckoutSchema < ActiveRecord::Migration[8.0]
  def change
    create_table :products, id: false do |t|
      t.string :id, primary_key: true
      t.string :name, null: false
      t.text :description, null: false
      t.string :image_url, null: false
      t.integer :price_in_cents, null: false
      t.string :currency, null: false, default: 'COP'
      t.integer :stock, null: false, default: 0
      t.timestamps
    end

    create_table :customers, id: false do |t|
      t.string :id, primary_key: true
      t.string :full_name, null: false
      t.string :email, null: false
      t.string :phone, null: false
      t.timestamps
    end

    create_table :deliveries, id: false do |t|
      t.string :id, primary_key: true
      t.string :customer_id, null: false
      t.string :address, null: false
      t.string :city, null: false
      t.string :region, null: false
      t.timestamps
    end
    add_foreign_key :deliveries, :customers

    create_table :transactions, id: false do |t|
      t.string :id, primary_key: true
      t.string :product_id, null: false
      t.string :customer_id, null: false
      t.string :delivery_id, null: false
      t.string :card_token, null: false
      t.integer :installments, null: false
      t.string :status, null: false
      t.string :reference, null: false
      t.string :gateway_id
      t.integer :product_amount_in_cents, null: false
      t.integer :base_fee_in_cents, null: false
      t.integer :shipping_fee_in_cents, null: false
      t.integer :total_in_cents, null: false
      t.string :currency, null: false
      t.timestamps
    end
    add_index :transactions, :reference, unique: true
    add_foreign_key :transactions, :products
    add_foreign_key :transactions, :customers
    add_foreign_key :transactions, :deliveries
  end
end
