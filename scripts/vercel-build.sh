#!/bin/bash
set -eo pipefail

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Migrations completed successfully"
