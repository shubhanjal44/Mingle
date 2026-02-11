# Tej India - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying Tej India to production.

## Prerequisites

- Domain name (e.g., skillswap.in)
- Server with Ubuntu 22.04 LTS
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database
- Redis instance
- Node.js 18+

## Deployment Options

### Option 1: Manual VPS Deployment (DigitalOcean, AWS EC2, etc.)

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/skillswap
cd /var/www/skillswap

# Clone repository
git clone <repository-url> .

# Set permissions
sudo chown -R $USER:$USER /var/www/skillswap
```

#### Step 3: Environment Configuration

```bash
# Backend environment
cd /var/www/skillswap/backend
cp .env.example .env
nano .env
```

Update `.env`:
```env
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://skillswap_user:STRONG_PASSWORD@localhost:5432/skillswap_prod
REDIS_URL=redis://localhost:6379

JWT_SECRET=GENERATE_STRONG_SECRET_HERE
JWT_REFRESH_SECRET=GENERATE_ANOTHER_STRONG_SECRET

CORS_ORIGIN=https://skillswap.in
FRONTEND_URL=https://skillswap.in

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@skillswap.in

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
# Frontend environment
cd /var/www/skillswap/frontend
cp .env.example .env
nano .env
```

Update `.env`:
```env
VITE_API_URL=https://api.skillswap.in/api/v1
VITE_SOCKET_URL=https://api.skillswap.in
VITE_ENV=production
```

#### Step 4: Database Setup

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
cd /var/www/skillswap/backend
npm install
npx prisma generate
npx prisma migrate deploy

# Seed initial data (optional for production)
# npx prisma db seed
```

#### Step 5: Build Applications

```bash
# Build backend
cd /var/www/skillswap/backend
npm install --production
npm run build

# Build frontend
cd /var/www/skillswap/frontend
npm install
npm run build
```

#### Step 6: Setup PM2 (Process Manager)

```bash
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem file
cd /var/www/skillswap
nano ecosystem.config.js
```

Add configuration:
```javascript
module.exports = {
  apps: [
    {
      name: 'skillswap-backend',
      cwd: '/var/www/skillswap/backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '/var/log/pm2/skillswap-backend-error.log',
      out_file: '/var/log/pm2/skillswap-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Set PM2 to start on boot
pm2 startup
pm2 save
```

#### Step 7: Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/skillswap.in
```

Add configuration:
```nginx
# Frontend (skillswap.in)
server {
    listen 80;
    server_name skillswap.in www.skillswap.in;

    root /var/www/skillswap/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Backend API (api.skillswap.in)
server {
    listen 80;
    server_name api.skillswap.in;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/skillswap.in /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 8: SSL Certificate (HTTPS)

```bash
# Get SSL certificate
sudo certbot --nginx -d skillswap.in -d www.skillswap.in -d api.skillswap.in

# Auto-renewal (runs automatically)
sudo certbot renew --dry-run
```

#### Step 9: Firewall Setup

```bash
# Configure UFW
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

#### Step 10: Monitoring & Logs

```bash
# View PM2 logs
pm2 logs skillswap-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor processes
pm2 monit
```

---

### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
cd /var/www/skillswap
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f backend
```

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "3000:80"

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: skillswap_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: skillswap_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

### Option 3: Cloud Platform Deployment

#### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Railway / Render (Full Stack)

1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically on push

---

## Post-Deployment Checklist

- [ ] Database backup strategy configured
- [ ] SSL certificate installed and auto-renewal setup
- [ ] Monitoring tools configured (PM2, New Relic, etc.)
- [ ] Error tracking setup (Sentry, LogRocket)
- [ ] CDN configured for static assets (Cloudflare)
- [ ] Email service configured (SendGrid)
- [ ] SMS service configured (Twilio)
- [ ] Analytics setup (Google Analytics, Mixpanel)
- [ ] Domain DNS configured correctly
- [ ] Rate limiting tested
- [ ] Load testing completed
- [ ] Security audit performed

---

## Maintenance

### Database Backups

```bash
# Create backup script
nano /home/skillswap/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/skillswap/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec skillswap_postgres pg_dump -U skillswap_user skillswap_prod > $BACKUP_DIR/db_$DATE.sql

# Backup Redis
docker exec skillswap_redis redis-cli SAVE
docker cp skillswap_redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Delete backups older than 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /home/skillswap/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /home/skillswap/backup.sh
```

### Update Deployment

```bash
cd /var/www/skillswap

# Pull latest code
git pull origin main

# Backend update
cd backend
npm install --production
npx prisma migrate deploy
npm run build
pm2 restart skillswap-backend

# Frontend update
cd ../frontend
npm install
npm run build
```

---

## Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs skillswap-backend

# Check database connection
cd /var/www/skillswap/backend
npx prisma db push
```

### Frontend 404 errors
```bash
# Ensure Nginx try_files is correct
sudo nginx -t
sudo systemctl restart nginx
```

### Database connection issues
```bash
# Check PostgreSQL
docker ps | grep postgres
docker logs skillswap_postgres

# Test connection
psql -h localhost -U skillswap_user -d skillswap_prod
```

---

## Performance Optimization

1. **Enable CDN**: Use Cloudflare for static assets
2. **Database Indexing**: Ensure Prisma indexes are created
3. **Redis Caching**: Cache frequently accessed data
4. **Load Balancing**: Use Nginx or AWS ALB for multiple instances
5. **Image Optimization**: Use Cloudinary transformations
6. **Gzip Compression**: Enabled in Nginx config
7. **Database Connection Pooling**: Configured in Prisma

---

## Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **Regular Updates**: Keep dependencies updated
3. **Rate Limiting**: Prevent abuse
4. **CORS**: Restrict allowed origins
5. **Input Validation**: Zod validation on all inputs
6. **SQL Injection**: Prisma prevents this automatically
7. **XSS Protection**: Helmet middleware
8. **HTTPS Only**: Enforce SSL
9. **Audit Logging**: Track all critical actions

---

**Your Tej India platform is now live! 🚀**
