# Tej India - Security Guide

Comprehensive security configuration and best practices for production deployment.

## Table of Contents

1. [Environment Security](#environment-security)
2. [Database Security](#database-security)
3. [API Security](#api-security)
4. [Application Security](#application-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Monitoring & Incident Response](#monitoring--incident-response)

---

## Environment Security

### Secrets Management

**Never commit secrets to version control!**

```bash
# Add to .gitignore
.env
.env.*
*.pem
*.key
secrets/
```

### Production Environment Variables

```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Minimum requirements:
JWT_SECRET=minimum_32_characters_random_string
JWT_REFRESH_SECRET=different_from_jwt_secret
DB_PASSWORD=strong_unique_password_with_special_chars
REDIS_PASSWORD=another_strong_unique_password
```

### File Permissions

```bash
# Restrict .env file permissions
chmod 600 .env

# Restrict SSH keys
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Restrict scripts
chmod 700 backend/scripts/*.sh
```

---

## Database Security

### PostgreSQL Hardening

```sql
-- 1. Change default postgres password
ALTER USER postgres WITH PASSWORD 'strong_password';

-- 2. Create application-specific user with limited privileges
CREATE USER TejIndiaWITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE skillswap_db TO skillswap;
GRANT USAGE ON SCHEMA public TO skillswap;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO skillswap;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO skillswap;

-- 3. Revoke public schema permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 4. Enable SSL connections
-- In postgresql.conf:
-- ssl = on
-- ssl_cert_file = '/path/to/server.crt'
-- ssl_key_file = '/path/to/server.key'
```

### Connection Security

```bash
# PostgreSQL pg_hba.conf
# Only allow local connections and SSL connections from app server

local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
hostssl skillswap_db    TejIndia      <app-server-ip>/32      scram-sha-256
```

### Backup Encryption

```bash
# Encrypt backups with GPG
./backend/scripts/backup.sh create
gpg --symmetric --cipher-algo AES256 backups/latest-backup.sql.gz

# Decrypt when needed
gpg --decrypt backups/latest-backup.sql.gz.gpg | gunzip | psql
```

---

## Redis Security

### Configuration

```bash
# redis.conf security settings
requirepass your_strong_redis_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
bind 127.0.0.1 ::1
protected-mode yes
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### Network Isolation

```bash
# Firewall rules - only allow connections from localhost
sudo ufw allow from 127.0.0.1 to any port 6379
sudo ufw deny 6379
```

---

## API Security

### Rate Limiting

```typescript
// backend/src/middleware/advancedRateLimit.ts

// Authentication endpoints
authRateLimit: 5 requests per 15 minutes

// General API
generalRateLimit: 100 requests per 15 minutes

// Search
searchRateLimit: 30 requests per minute

// File uploads
uploadRateLimit: 10 uploads per hour
```

### JWT Configuration

```typescript
// JWT settings
JWT_EXPIRES_IN=15m        // Short-lived access tokens
JWT_REFRESH_EXPIRES_IN=7d // Refresh tokens

// Implementation
- Store refresh tokens in database
- Implement token rotation
- Blacklist revoked tokens
- Validate token signature
- Check token expiry
```

### CORS Configuration

```typescript
// backend/src/config/cors.ts
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://skillswap.in', 'https://www.skillswap.in']
    : ['http://localhost:3000'],
  credentials: true,
  maxAge: 86400, // 24 hours
};
```

### Helmet Security Headers

```typescript
// backend/src/server.ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## Application Security

### Input Validation

```typescript
// Use express-validator and zod for all inputs

// Example: User registration
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  name: z.string().min(2).max(100),
});

// Sanitize inputs
import { escape } from 'validator';
const sanitizedInput = escape(userInput);
```

### SQL Injection Prevention

```typescript
// ALWAYS use Prisma's parameterized queries
// Never use raw queries with user input

// Good:
const user = await prisma.user.findUnique({
  where: { email: userEmail }
});

// Bad:
await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userEmail}'`;
```

### XSS Prevention

```typescript
// Frontend: Sanitize HTML content
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirty);

// Backend: Set proper headers
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('X-Content-Type-Options', 'nosniff');
```

### CSRF Protection

```typescript
// Use SameSite cookies
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### File Upload Security

```typescript
// Multer configuration
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Scan uploads with antivirus
// Store in secure cloud storage (Cloudinary)
// Generate unique filenames
```

---

## Infrastructure Security

### Firewall Configuration (UFW)

```bash
# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change default port)
sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### SSH Hardening

```bash
# /etc/ssh/sshd_config
Port 2222                          # Change default port
PermitRootLogin no                 # Disable root login
PasswordAuthentication no          # Use key-based auth only
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

### Fail2Ban

```bash
# Install
sudo apt install fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = 2222
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true

# Start service
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Docker Security

```bash
# Run containers as non-root user
USER nodejs

# Use read-only root filesystem where possible
docker run --read-only

# Limit resources
docker run --memory="512m" --cpus="1.0"

# Scan images for vulnerabilities
docker scan skillswap-backend:latest

# Keep Docker updated
sudo apt update && sudo apt upgrade docker-ce
```

### SSL/TLS Configuration

```nginx
# nginx.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_stapling on;
ssl_stapling_verify on;

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## Monitoring & Incident Response

### Security Monitoring

```bash
# Check failed login attempts
sudo grep "Failed password" /var/log/auth.log

# Monitor system logs
sudo tail -f /var/log/syslog

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs -f | grep -i "error\|warning\|unauthorized"
```

### Automated Security Audits

```bash
# NPM security audit
npm audit

# Dependency vulnerability check
npm audit fix

# Docker image scanning
docker scan --dependency-tree skillswap-backend:latest

# System security audit
sudo lynis audit system
```

### Incident Response Plan

1. **Detection**
   - Monitor logs for suspicious activity
   - Set up alerts for critical events
   - Regular security audits

2. **Containment**
   - Isolate affected systems
   - Block suspicious IPs
   - Revoke compromised credentials

3. **Eradication**
   - Remove malicious code/access
   - Patch vulnerabilities
   - Update dependencies

4. **Recovery**
   - Restore from clean backups
   - Rebuild compromised systems
   - Update security measures

5. **Post-Incident**
   - Document the incident
   - Improve security measures
   - Train team on lessons learned

### Security Contacts

```bash
# Report security vulnerabilities to:
security@skillswap.in

# Include:
- Detailed description
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
```

---

## Security Checklist

### Pre-Deployment

- [ ] All secrets are stored securely (not in code)
- [ ] Strong passwords for all services
- [ ] Database user has minimal required permissions
- [ ] Redis password is set
- [ ] JWT secrets are strong and unique
- [ ] Environment variables are properly configured
- [ ] SSL certificates are installed
- [ ] Firewall rules are configured
- [ ] SSH is hardened
- [ ] Fail2Ban is configured

### Application

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitization, CSP headers)
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Authentication & authorization working
- [ ] Secure session management
- [ ] File upload restrictions
- [ ] Error handling (no sensitive info in errors)
- [ ] Logging enabled (exclude sensitive data)

### Infrastructure

- [ ] Regular security updates scheduled
- [ ] Backups are encrypted
- [ ] Backup restoration tested
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented
- [ ] Docker containers run as non-root
- [ ] Resources are limited
- [ ] Network segmentation
- [ ] Regular security audits scheduled

### Compliance

- [ ] GDPR compliance (if applicable)
- [ ] Data retention policies
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent implemented
- [ ] Data breach response plan

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

## License

MIT License - See LICENSE file for details
