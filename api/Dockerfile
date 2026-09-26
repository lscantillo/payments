FROM ruby:3.4.7-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set --local without 'test' \
  && bundle install

COPY . .
RUN chmod +x bin/docker-entrypoint.sh

ENV RACK_ENV=production
EXPOSE 4567
ENTRYPOINT ["bin/docker-entrypoint.sh"]
