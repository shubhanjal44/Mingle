# Tej India - Quick Start Guide

Get up and running with Tej India in minutes!

## Prerequisites

Make sure you have installed:
- Node.js 18+ ([Download](https://nodejs.org/))
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop))
- Git ([Download](https://git-scm.com/))

## Quick Setup (5 minutes)

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd LiveData
```

### 2. Start Infrastructure
```bash
docker-compose up -d
```
This starts PostgreSQL, Redis, and pgAdmin.

### 3. Setup Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
Backend running at: **http://localhost:5000**

### 4. Setup Frontend (New Terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend running at: **http://localhost:3000**

## 🎉 You're Done!

Visit **http://localhost:3000** to see the app.

## Next Steps

1. **Create an account** on the homepage
2. **Add your skills** to your profile
3. **Find skill swaps** with other users
4. **Start learning and teaching!**

## Admin Tools

- **pgAdmin**: http://localhost:5050
  - Email: admin@tejindia.com
  - Password: admin123

- **API Health Check**: http://localhost:5000/health

- **Prisma Studio** (Database UI):
  ```bash
  cd backend
  npx prisma studio
  ```

## Common Issues

### Port Already in Use?
```bash
# Stop Docker containers
docker-compose down

# Check what's using the port
lsof -i :5000  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # PostgreSQL
```

### Database Connection Error?
```bash
# Reset database
cd backend
npx prisma migrate reset
```

### Need to Start Fresh?
```bash
# Stop everything
docker-compose down -v

# Remove node_modules
rm -rf backend/node_modules frontend/node_modules

# Start over from Step 2
```

## Development Workflow

```bash
# Start Docker services
docker-compose up -d

# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Database UI (optional)
cd backend && npx prisma studio
```

## Stop Everything

```bash
# Stop Docker containers
docker-compose down

# Or to remove volumes too
docker-compose down -v
```

---

**Need help?** Check the [full README](README.md) or [documentation](docs/)
