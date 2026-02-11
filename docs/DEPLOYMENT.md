# Tej India - Deployment Guide

Complete guide for deploying Tej India platform from local development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Production Deployment](#production-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** >= 20.10.0
- **Docker Compose** >= 2.0.0
- **PostgreSQL** >= 15 (if running without Docker)
- **Redis** >= 7 (if running without Docker)
- **Git** >= 2.30.0

### Optional Tools

- **PM2** for process management
- **Nginx** for reverse proxy
- **Certbot** for SSL certificates
- **AWS CLI** for S3 backups

### System Requirements

**Minimum (Development)**:
- 2 CPU cores
- 4 GB RAM
- 20 GB disk space

**Recommended (Production)**:
- 4 CPU cores
- 8 GB RAM
- 100 GB disk space
- SSD storage

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/skillswap-india/skillswap.git
cd skillswap
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

### 3. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Database Setup

```bash
# Start PostgreSQL and Redis using Docker
docker-compose up -d postgres redis

# Run migrations
cd backend
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access Points**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/api/v1/docs

---

## Environment Configuration

### Environment Variables

See `.env.example` for all available variables. Key variables:

#### Database
```bash
DATABASE_URL=postgresql://skillswap:password@localhost:5432/skillswap_db
```

#### Redis
```bash
REDIS_URL=redis://:password@localhost:6379
```

#### JWT
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

#### External Services
```bash
# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Environment Files

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

---

## Database Setup

### Migrations

```bash
# Create a new migration
./backend/scripts/migrate.sh create "migration_name"

# Run pending migrations
./backend/scripts/migrate.sh deploy

# Check migration status
./backend/scripts/migrate.sh status

# Generate Prisma Client
./backend/scripts/migrate.sh generate
```

### Backups

```bash
# Create backup
./backend/scripts/backup.sh create

# List backups
./backend/scripts/backup.sh list

# Restore from backup
./backend/scripts/backup.sh restore backups/skillswap_backup_20250116.sql.gz

# Cleanup old backups
./backend/scripts/backup.sh cleanup
```

### Seeding

```bash
cd backend
npm run prisma:seed
```

---

## Docker Deployment

### Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Start with Development Tools

```bash
# Include PgAdmin and Redis Commander
docker-compose --profile tools up -d
```

**Access Points**:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- PgAdmin: http://localhost:8080
- Redis Commander: http://localhost:8081

### Production Docker Setup

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2

# View service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f [service_name]
```

---

## Production Deployment

### Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install required packages
sudo apt install -y git nginx certbot python3-certbot-nginx

# Create application directory
sudo mkdir -p /opt/skillswap
sudo chown $USER:$USER /opt/skillswap
```

### Application Deployment

```bash
# Clone repository
cd /opt/skillswap
git clone https://github.com/skillswap-india/skillswap.git .

# Create .env file
cp .env.example .env
nano .env  # Configure production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend \
  npx prisma migrate deploy

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/skillswap.in

# API Server
server {
    listen 80;
    server_name api.skillswap.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Frontend
server {
    listen 80;
    server_name skillswap.in www.skillswap.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/skillswap.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d skillswap.in -d www.skillswap.in -d api.skillswap.in
```

### SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d skillswap.in -d www.skillswap.in -d api.skillswap.in

# Auto-renewal (runs automatically, verify with)
sudo certbot renew --dry-run
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

1. **Backend CI** (`.github/workflows/backend-ci.yml`)
   - Runs on push/PR to main/develop
   - Linting, testing, building
   - Docker image build

2. **Frontend CI** (`.github/workflows/frontend-ci.yml`)
   - Runs on push/PR to main/develop
   - Linting, type checking, building
   - Bundle size analysis

3. **Production Deployment** (`.github/workflows/deploy-production.yml`)
   - Triggered on release or manual workflow
   - Builds and pushes Docker images
   - Deploys to production server
   - Runs smoke tests
   - Auto-rollback on failure

### Required GitHub Secrets

```bash
# Docker Registry
DOCKER_REGISTRY=ghcr.io
DOCKER_USERNAME=your_username
DOCKER_PASSWORD=your_personal_access_token

# Server SSH
SERVER_HOST=your-server-ip
SERVER_USER=deploy_user
SERVER_SSH_KEY=your_private_ssh_key
SERVER_PORT=22

# Application URLs
APP_URL=https://skillswap.in
API_URL=https://api.skillswap.in
VITE_API_URL=https://api.skillswap.in/api/v1
VITE_SOCKET_URL=https://api.skillswap.in

# Environment Variables (same as .env)
DB_USER=...
DB_PASSWORD=...
# ... all other env vars
```

### Manual Deployment

```bash
# Build images
docker build -t skillswap-backend:latest ./backend
docker build -t skillswap-frontend:latest ./frontend

# Tag for registry
docker tag skillswap-backend:latest ghcr.io/username/skillswap-backend:latest
docker tag skillswap-frontend:latest ghcr.io/username/skillswap-frontend:latest

# Push to registry
docker push ghcr.io/username/skillswap-backend:latest
docker push ghcr.io/username/skillswap-frontend:latest

# On server: pull and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl https://api.skillswap.in/health

# Frontend health
curl https://skillswap.in/health

# Performance metrics (admin only)
curl https://api.skillswap.in/api/v1/performance/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Logs

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u docker -f
```

### Database Maintenance

```bash
# Create backup
./backend/scripts/backup.sh create

# Optimize database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "SELECT pg_size_pretty(pg_database_size('skillswap_db'));"
```

### Updates

```bash
# Pull latest code
cd /opt/skillswap
git pull origin main

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend \
  npx prisma migrate deploy

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

### Automated Backups

Create cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /opt/TejIndia&& ./backend/scripts/backup.sh create >> /var/log/skillswap-backup.log 2>&1
```

---

## Troubleshooting

### Container Issues

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Inspect specific container
docker inspect skillswap-backend-prod

# Restart service
docker-compose -f docker-compose.prod.yml restart backend

# Remove and recreate
docker-compose -f docker-compose.prod.yml up -d --force-recreate backend
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "SELECT count(*) FROM pg_stat_activity;"
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# Connect to Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a your_password

# Check memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a your_password INFO memory
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=4
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## Rollback Procedure

```bash
# 1. Stop current deployment
docker-compose -f docker-compose.prod.yml down

# 2. Restore database from backup
LATEST_BACKUP=$(ls -t backups/pre-deploy-*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U TejIndiaskillswap_db

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Verify services
docker-compose -f docker-compose.prod.yml ps
curl https://api.skillswap.in/health
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique passwords
- [ ] Enable firewall (ufw)
- [ ] Configure fail2ban
- [ ] Enable SSL/TLS
- [ ] Keep software updated
- [ ] Regular security audits
- [ ] Monitor logs for suspicious activity
- [ ] Backup encryption
- [ ] Environment variable security
- [ ] Database access restrictions
- [ ] API rate limiting enabled
- [ ] CORS properly configured

---

## Support

For deployment issues:
1. Check the logs
2. Review troubleshooting section
3. Open GitHub issue
4. Contact DevOps team

---

## License

MIT License - See LICENSE file for details
