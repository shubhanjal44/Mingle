#!/bin/sh
set -e

echo "🚀 Starting tej-india Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until npx prisma db push --skip-generate 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma Client (in case it's not generated)
echo "🔨 Generating Prisma Client..."
npx prisma generate

# Start the application
echo "🎉 Starting application..."
exec node dist/server.js
