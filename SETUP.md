# Tej India - Complete Setup Guide

This guide will help you set up the Tej India project locally for development.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **npm** (v9.0.0 or higher) - Comes with Node.js
- **Docker** & **Docker Compose** - [Download](https://www.docker.com/products/docker-desktop)
- **Git** - [Download](https://git-scm.com/downloads)

Verify installations:
```bash
node --version  # Should be v18+
npm --version   # Should be v9+
docker --version
docker-compose --version
git --version
```

---

## 🚀 Quick Start (5 Minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/cipherprofessor/LiveData.git
cd LiveData
```

### 2. Start Docker Services

```bash
# Start PostgreSQL, Redis, and pgAdmin
docker-compose up -d

# Verify services are running
docker-compose ps
```

You should see:
- `skillswap_postgres` - Running on port 5432
- `skillswap_redis` - Running on port 6379
- `skillswap_pgadmin` - Running on port 5050

### 3. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env file with your configuration (see below)

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API server will start on **http://localhost:5000**

### 5. Test the API

Visit http://localhost:5000/health in your browser. You should see:
```json
{
  "status": "OK",
  "timestamp": "2025-11-15T...",
  "uptime": 1.234,
  "environment": "development"
}
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://skillswap:skillswap123@localhost:5432/skillswap_db"

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-minimum-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-too-minimum-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email Configuration (Development)
# Using ethereal.email for development - emails appear in logs
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=auto-generated-on-first-run
SMTP_PASSWORD=auto-generated-on-first-run
FROM_EMAIL="Tej India <noreply@skillswap.in>"

# Email Configuration (Production) - Uncomment and configure for production
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=your-sendgrid-api-key
# FROM_EMAIL="Tej India <noreply@skillswap.in>"

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Socket.IO
SOCKET_CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Redis (for future caching)
REDIS_URL=redis://localhost:6379

# Cloudinary (for image uploads - optional for now)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Twilio (for SMS - optional for now)
# TWILIO_ACCOUNT_SID=your-account-sid
# TWILIO_AUTH_TOKEN=your-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-phone
```

---

## 🗄️ Database Setup

### Using Docker (Recommended)

The `docker-compose.yml` file includes PostgreSQL, Redis, and pgAdmin.

**Access pgAdmin:**
1. Visit http://localhost:5050
2. Login:
   - Email: `admin@skillswap.in`
   - Password: `admin123`
3. Add Server:
   - Name: TejIndiaDB
   - Host: `postgres` (container name)
   - Port: `5432`
   - Database: `skillswap_db`
   - Username: `skillswap`
   - Password: `skillswap123`

### Database Migrations

```bash
# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npm run prisma:studio
```

### Seed Data

The seed script creates:
- **10 skill categories**
- **60+ skills** across all categories
- **5 badges** for gamification

```bash
npm run prisma:seed
```

---

## 📡 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user |
| POST | `/verify-email` | Verify email with OTP |
| POST | `/resend-otp` | Resend OTP |
| POST | `/login` | Login with credentials |
| POST | `/refresh` | Refresh access token |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password |
| POST | `/logout` | Logout (auth required) |
| GET | `/me` | Get current user (auth required) |

### Users (`/api/v1/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get own profile (auth required) |
| PUT | `/profile` | Update profile (auth required) |
| GET | `/:id` | Get public user profile |
| GET | `/search` | Search users |

### Skills (`/api/v1/skills`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List skill categories |
| GET | `/` | List skills with filters |
| GET | `/user` | Get own skills (auth required) |
| POST | `/user` | Add skill (auth required) |
| PUT | `/user/:id` | Update skill (auth required) |
| DELETE | `/user/:id` | Remove skill (auth required) |
| GET | `/user/:userId` | Get user's public skills |

### Matches (`/api/v1/matches`) **NEW!**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Find skill swap matches (auth required) |
| GET | `/recommendations/:skillId` | Get teachers for a skill (auth required) |
| GET | `/stats` | Get match statistics (auth required) |
| GET | `/compatible-skills` | Get skills with available matches (auth required) |

---

## 🧪 Testing the API

### Using cURL

#### 1. Register a User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123",
    "name": "John Doe",
    "phone": "+919876543210"
  }'
```

#### 2. Verify Email
```bash
# Check your console logs for the OTP (in development mode)
curl -X POST http://localhost:5000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'
```

#### 3. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

Save the `accessToken` from the response.

#### 4. Get Profile
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 5. Add a Skill
```bash
# First, get skill categories
curl http://localhost:5000/api/v1/skills/categories

# Get skills in a category
curl http://localhost:5000/api/v1/skills?category=CATEGORY_ID

# Add a skill you want to TEACH
curl -X POST http://localhost:5000/api/v1/skills/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "SKILL_ID",
    "skillType": "TEACH",
    "proficiencyLevel": "INTERMEDIATE",
    "yearsOfExperience": 3,
    "description": "I have 3 years of experience teaching Python"
  }'

# Add a skill you want to LEARN
curl -X POST http://localhost:5000/api/v1/skills/user \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "ANOTHER_SKILL_ID",
    "skillType": "LEARN",
    "proficiencyLevel": "BEGINNER"
  }'
```

#### 6. Find Matches **NEW!**
```bash
curl http://localhost:5000/api/v1/matches \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

1. Import the API endpoints or create a new collection
2. Set up environment variables:
   - `BASE_URL`: http://localhost:5000/api/v1
   - `ACCESS_TOKEN`: (set after login)
3. Use `{{BASE_URL}}` and `{{ACCESS_TOKEN}}` in requests

---

## 🏗️ Project Structure

```
LiveData/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── skill.controller.ts
│   │   │   └── match.controller.ts ✨ NEW
│   │   ├── services/         # Business logic
│   │   │   ├── email.service.ts
│   │   │   ├── otp.service.ts
│   │   │   └── matching.service.ts ✨ NEW
│   │   ├── middleware/       # Express middleware
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── skill.routes.ts
│   │   │   └── match.routes.ts ✨ NEW
│   │   ├── config/          # Configuration
│   │   │   ├── database.ts
│   │   │   └── cors.ts
│   │   ├── utils/           # Utilities
│   │   │   └── logger.ts
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   ├── package.json
│   └── .env.example
├── frontend/                # React app (coming soon)
├── docker-compose.yml       # Docker services
├── README.md
├── PROGRESS.md             # Development tracker ✨ NEW
├── SETUP.md                # This file ✨ NEW
├── FEATURE_PLAN.md
└── TECH_STACK.md
```

---

## 🔧 Development Scripts

### Backend Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm run build            # Compile TypeScript
npm start                # Run production build

# Database
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 PID  # macOS/Linux
taskkill /PID PID /F  # Windows
```

### Docker Container Issues

```bash
# View logs
docker-compose logs postgres
docker-compose logs redis

# Restart services
docker-compose restart

# Stop and remove all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Database Connection Issues

1. Ensure Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check DATABASE_URL in `.env` matches docker-compose.yml

3. Test connection:
   ```bash
   npm run prisma:studio
   ```

### Prisma Client Generation Issues

```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Regenerate Prisma Client
npm run prisma:generate
```

### Email Not Sending (Development)

In development mode, emails are sent to ethereal.email. Check the console logs for the preview URL:

```
📧 Email sent: https://ethereal.email/message/xxxxx
```

Click the URL to view the email in your browser.

---

## 🚀 Next Steps

1. **Complete Your Profile:**
   - Add avatar (coming soon with Cloudinary integration)
   - Add bio and location
   - Update profile completion to 100%

2. **Add Skills:**
   - Add at least 1 skill you can TEACH
   - Add at least 1 skill you want to LEARN
   - Update proficiency levels and experience

3. **Find Matches:**
   - Use `/api/v1/matches` to find compatible users
   - View match scores and reasons
   - Get recommendations for specific skills

4. **Test Matching Algorithm:**
   - Create multiple test users
   - Add complementary skills
   - Test location-based matching
   - Verify match scoring

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Docker Docs](https://docs.docker.com/)

---

## 💡 Development Tips

1. **Use Prisma Studio** for database visualization:
   ```bash
   npm run prisma:studio
   ```

2. **Check API logs** for debugging:
   - Request/response logs via Morgan
   - Application logs via Winston
   - Email preview URLs in console

3. **Use pgAdmin** for advanced database queries:
   - http://localhost:5050

4. **Monitor Docker services**:
   ```bash
   docker-compose logs -f
   ```

5. **Test API endpoints** with:
   - cURL (command line)
   - Postman (GUI)
   - REST Client (VS Code extension)

---

## 🤝 Need Help?

- Check [PROGRESS.md](./PROGRESS.md) for feature status
- Review [FEATURE_PLAN.md](./FEATURE_PLAN.md) for roadmap
- Read [TECH_STACK.md](./TECH_STACK.md) for architecture details
- Open an issue on GitHub

---

**Happy Coding! 🚀**

---

*Last Updated: 2025-11-15*
*Version: Week 3-4 (Matching Algorithm Implementation)*
