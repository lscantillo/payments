# frozen_string_literal: true

require 'dotenv'
Dotenv.load(File.expand_path('../.env', __dir__))
require 'json'
require 'active_record'
require 'sinatra/base'
require 'sinatra/json'

module App
  ROOT = File.expand_path('..', __dir__)
end

Dir[File.join(App::ROOT, 'app/domain/**/*.rb')].sort.each { |file| require file }
Dir[File.join(App::ROOT, 'app/application/**/*.rb')].sort.each { |file| require file }
require_relative 'database'
Dir[File.join(App::ROOT, 'app/adapters/**/*.rb')].sort.each { |file| require file }
require_relative '../app/container'
