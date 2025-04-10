#!/bin/bash

# Export database connection environment variables if not already set
export POSTGRES_USER=${POSTGRES_USER:-postgres}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
export POSTGRES_DB=${POSTGRES_DB:-metering_api}

set -e

host="$1"
port="$2"
shift 2
cmd="$@"

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "$POSTGRES_USER" -p "$port" -d "$POSTGRES_DB" -c '\q'; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 1
done

>&2 echo "Postgres is up - executing command"
exec $cmd 