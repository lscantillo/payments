# frozen_string_literal: true

require_relative 'config/boot'

App::Http.wire(App.container)
run App::Http
