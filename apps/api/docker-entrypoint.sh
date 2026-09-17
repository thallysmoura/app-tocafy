#!/bin/sh
set -e

echo "Aplicando migrations..."
node_modules/.bin/prisma migrate deploy

exec "$@"
