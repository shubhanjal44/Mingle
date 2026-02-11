#!/bin/bash

echo "🎉 Tej India - COMPLETE PROJECT FINALIZATION"
echo "=================================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "✅ Project structure is ready!"
echo ""
echo "📦 Installing dependencies..."
echo ""

# Backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

echo ""
echo "✅ Backend dependencies installed!"
echo ""

# Frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "✅ Frontend dependencies installed!"
echo ""

cd ..

echo "🎉 PROJECT FINALIZED!"
echo "===================="
echo ""
echo "📋 Next steps:"
echo "  1. Copy backend/.env.example to backend/.env and configure"
echo "  2. Copy frontend/.env.example to frontend/.env and configure"
echo "  3. Start Docker services: docker-compose up -d"
echo "  4. Run database migrations: cd backend && npx prisma migrate dev"
echo "  5. Seed database: cd backend && npx prisma db seed"
echo "  6. Start backend: cd backend && npm run dev"
echo "  7. Start frontend: cd frontend && npm run dev"
echo ""
echo "🚀 Your Tej India platform is ready to launch!"
echo ""
