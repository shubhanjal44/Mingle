# Tej India - Setup Guide

**Complete setup instructions for running Tej India locally**

---

## 🚀 Quick Setup (Automated)

### One-Command Setup

```bash
bash setup.sh
```

This automated script will:
- ✅ Check all prerequisites
- ✅ Create environment files
- ✅ Install all dependencies (backend + frontend)
- ✅ Start Docker containers (PostgreSQL, Redis, pgAdmin)
- ✅ Run database migrations
- ✅ Seed the database with initial data
- ✅ Verify everything is ready

**Time:** ~5-10 minutes (depending on internet speed)

---

## 📋 Prerequisites

Before running setup, ensure you have:

### Required:
1. **Node.js 18+** - [Download](https://nodejs.org/)
2. **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
3. **npm** (comes with Node.js)

### Optional:
- **Git** - For cloning the repository
- **VS Code** - Recommended IDE

---

## 🔧 Manual Setup (Step by Step)

If you prefer to set up manually or the automated script fails:

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd LiveData
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Start Docker containers
cd ..
docker compose up -d

# Wait 10 seconds for PostgreSQL to start
sleep 10

# Run migrations
cd backend
npx prisma migrate dev

# Seed database
npx prisma db seed
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend
cd ../frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 🐳 Docker Services

The `docker-compose.yml` file starts these services:

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Main database |
| **Redis** | 6379 | Cache & sessions |
| **pgAdmin** | 5050 | Database GUI |

### pgAdmin Access:
- URL: http://localhost:5050
- Email: `admin@skillswap.in`
- Password: `admin123`

### Database Connection (for pgAdmin):
- Host: `postgres` (or `localhost` from your machine)
- Port: `5432`
- Database: `skillswap_dev`
- Username: `skillswap`
- Password: `skillswap123`

---

## ⚙️ Environment Configuration

### Backend (.env)

**✅ Minimum Required (App works with just these!):**

```env
# Database
DATABASE_URL=postgresql://skillswap:skillswap123@localhost:5432/skillswap_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-min-32-chars

# CORS
CORS_ORIGIN=http://localhost:3000

**⚙️ Optional Services (Can skip - see OPTIONAL_FEATURES.md):**
```env
# Email - OPTIONAL (OTPs show in console without this)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# Payments, SMS, Images - All OPTIONAL
# See OPTIONAL_FEATURES.md for details
```

📝 **Note:** Email is NOT required! OTPs show in console logs during development.
SOCKET_CORS_ORIGIN=http://localhost:3000

**⚙️ Optional Services (Can skip - see OPTIONAL_FEATURES.md):**
```env
# Email - OPTIONAL (OTPs show in console without this)
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# Payments, SMS, Images - All OPTIONAL
# See OPTIONAL_FEATURES.md for details
```

📝 **Note:** Email is NOT required! OTPs show in console logs during development.
```

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api/v1
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🗄️ Database Setup

### View Database

```bash
cd backend
npx prisma studio
# Opens browser at http://localhost:5555
```

### Reset Database

```bash
cd backend
npx prisma migrate reset
# This will delete all data and re-run migrations
```

### Create New Migration

```bash
cd backend
npx prisma migrate dev --name description_of_changes
```

---

## 🎯 Verify Installation

### Check Backend

```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "2025-11-16T...",
  "uptime": 123.45,
  "environment": "development"
}
```

### Check Frontend

Visit: http://localhost:3000

You should see the Tej India homepage.

### Check Database

```bash
cd backend
npx prisma studio
```

You should see:
- 10 skill categories
- 60+ skills
- 8 badges
- Sample data

---

## 🛠️ Common Issues & Solutions

### Issue: Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Option 1: Kill the process
lsof -ti:5000 | xargs kill -9

# Option 2: Change port in backend/.env
PORT=5001
```

### Issue: Docker Not Starting

**Error:** `Cannot connect to Docker daemon`

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start
3. Run `docker ps` to verify

### Issue: Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check if PostgreSQL is running
docker compose ps

# If not running, start it
docker compose up -d postgres

# Wait and try again
sleep 10
```

### Issue: Permission Denied

**Error:** `EACCES: permission denied`

**Solution:**
```bash
# Fix npm permissions
sudo chown -R $USER ~/.npm
sudo chown -R $USER node_modules
```

### Issue: Module Not Found

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
cd backend
npm install
npx prisma generate
```

---

## 📊 What Gets Installed

### Backend Dependencies (751 packages)
- Express.js - Web framework
- Prisma - Database ORM
- Socket.IO - Real-time features
- JWT - Authentication
- Redis - Caching
- bcryptjs - Password hashing
- Zod - Validation
- And more...

### Frontend Dependencies (324 packages)
- React 18 - UI library
- Vite - Build tool
- Tailwind CSS - Styling
- React Router - Routing
- Zustand - State management
- Axios - HTTP client
- React Hook Form - Forms
- And more...

---

## 🚦 Starting/Stopping Services

### Start Everything

```bash
# Start Docker containers
bash start-all.sh

# Then in separate terminals:
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Stop Everything

```bash
# Stop Docker containers
bash stop-all.sh

# Stop backend/frontend with Ctrl+C in their terminals
```

---

## 📱 Testing the Application

### 1. Create Account

1. Visit http://localhost:3000/register
2. Fill in details
3. Verify email (dev mode: check console logs for OTP)
4. Complete profile

### 2. Add Skills

1. Navigate to Skills page
2. Add skills you can teach
3. Add skills you want to learn

### 3. Find Matches

1. Go to Matches page
2. Browse AI-matched users
3. View profiles

### 4. Create Swap

1. Click on a match
2. Send swap request
3. Wait for acceptance (or create second account to test)

---

## 🔍 Useful Commands

### Database
```bash
# View database GUI
npx prisma studio

# Run migrations
npx prisma migrate dev

# Reset and reseed
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Docker
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart a service
docker compose restart postgres

# Remove all data
docker compose down -v
```

### Development
```bash
# Backend
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Lint code

# Frontend
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests
```

---

## 📚 Next Steps

After setup is complete:

1. **Read Documentation**
   - `README.md` - Project overview
   - `IMPLEMENTATION_STATUS.md` - Feature documentation
   - `TESTING_REPORT.md` - Testing guide
   - `docs/API.md` - API reference

2. **Explore the Code**
   - `backend/src/` - Backend code
   - `frontend/src/` - Frontend code
   - `backend/prisma/schema.prisma` - Database schema

3. **Start Development**
   - Create test accounts
   - Try all features
   - Review code structure
   - Start building!

---

## 🆘 Need Help?

### Documentation
- Check `IMPLEMENTATION_STATUS.md` for feature details
- Check `TESTING_REPORT.md` for testing info
- Check `docs/` folder for specific guides

### Common Resources
- Express.js: https://expressjs.com/
- Prisma: https://www.prisma.io/docs
- React: https://react.dev/
- Vite: https://vitejs.dev/
- Tailwind: https://tailwindcss.com/

### Troubleshooting
1. Check logs: `docker compose logs`
2. Check backend console
3. Check frontend console
4. Check browser DevTools

---

## ✅ Setup Checklist

After running setup, verify:

- [ ] Node.js 18+ installed
- [ ] Docker Desktop running
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Docker containers running (postgres, redis, pgadmin)
- [ ] Database migrations complete
- [ ] Database seeded with data
- [ ] Backend starts on http://localhost:5000
- [ ] Frontend starts on http://localhost:3000
- [ ] Can access homepage
- [ ] Can register an account

---

**Setup Time Estimate:**
- Automated setup: ~5-10 minutes
- Manual setup: ~15-20 minutes
- First time (with downloads): ~20-30 minutes

---

**Built with ❤️ for India's youth | सीखो और सिखाओ 🇮🇳**
