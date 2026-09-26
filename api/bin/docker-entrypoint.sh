#!/bin/sh
set -eu

attempts=0
until bundle exec ruby -e "require 'pg'; PG.connect(ENV.fetch('DATABASE_URL')).close"
do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 30 ]; then
    echo "PostgreSQL did not accept connections." >&2
    exit 1
  fi
  sleep 1
done

bundle exec rake db:seed
exec bundle exec rackup -o 0.0.0.0 -p 4567 config.ru
