# Tej India - Maintenance Procedures

**Version**: 1.0
**Last Updated**: January 2025
**Owner**: DevOps & Engineering Teams

---

## Table of Contents

1. [Overview](#overview)
2. [Daily Maintenance](#daily-maintenance)
3. [Weekly Maintenance](#weekly-maintenance)
4. [Monthly Maintenance](#monthly-maintenance)
5. [Database Maintenance](#database-maintenance)
6. [Backup & Recovery](#backup--recovery)
7. [Security Maintenance](#security-maintenance)
8. [Deployment Procedures](#deployment-procedures)
9. [Emergency Procedures](#emergency-procedures)
10. [Maintenance Calendar](#maintenance-calendar)

---

## Overview

### Purpose
This document outlines routine maintenance procedures to ensure platform reliability, security, performance, and data integrity.

### Principles
- **Preventive**: Regular maintenance prevents issues
- **Documented**: All procedures are documented
- **Tested**: Procedures are tested before execution
- **Scheduled**: Maintenance during low-traffic periods
- **Communicated**: Users notified of planned downtime

### Maintenance Windows
- **Standard**: Sundays 2:00 AM - 4:00 AM IST
- **Emergency**: As needed (with user notification)
- **Zero-downtime**: For most deployments

---

## Daily Maintenance

### 1. System Health Check (Every Morning)
**Time**: 9:00 AM IST
**Duration**: 15 minutes
**Responsible**: On-call Engineer

**Checklist**:
```bash
# 1. Check service status
docker-compose -f docker-compose.prod.yml ps

# 2. Check application logs
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
docker-compose -f docker-compose.prod.yml logs --tail=100 frontend

# 3. Check error rates (last 24 hours)
# via Sentry dashboard

# 4. Check server resources
df -h              # Disk usage
free -h            # Memory usage
top                # CPU usage

# 5. Check database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# 6. Check Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 7. Verify backups completed
ls -lth /opt/skillswap/backups/ | head -5

# 8. Check SSL certificate expiry
openssl s_client -connect skillswap.in:443 -servername skillswap.in </dev/null 2>/dev/null | openssl x509 -noout -dates
```

**Action if Issues Found**:
- Critical issues: Immediate escalation
- Warnings: Log and monitor
- Document findings in daily log

---

### 2. Log Review
**Time**: Throughout the day
**Duration**: Ongoing
**Responsible**: DevOps Team

**Review**:
```bash
# Check for errors
grep -i "error" /opt/skillswap/logs/combined.log | tail -50

# Check for warnings
grep -i "warn" /opt/skillswap/logs/combined.log | tail -50

# Check failed logins (potential security issue)
grep "login failed" /opt/skillswap/logs/combined.log | wc -l

# Check slow queries
grep "slow query" /opt/skillswap/logs/combined.log
```

**Investigate**:
- Unusual error patterns
- Security-related events
- Performance degradation
- Failed integrations

---

### 3. Performance Check
**Time**: 11:00 AM & 5:00 PM IST
**Duration**: 10 minutes

**Metrics to Review**:
- API response times (target: <500ms p95)
- Error rates (target: <0.1%)
- Active users count
- Database query performance
- Cache hit ratios

**Tools**:
- Grafana dashboards
- Application monitoring (New Relic/DataDog)
- Google Analytics real-time

---

## Weekly Maintenance

### 1. Full System Audit (Every Sunday)
**Time**: 2:00 AM IST
**Duration**: 2 hours
**Responsible**: DevOps Lead

**Procedure**:

#### 1.1 Database Maintenance
```bash
# Vacuum and analyze
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "VACUUM ANALYZE;"

# Check database size
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c \
  "SELECT pg_size_pretty(pg_database_size('skillswap_db'));"

# Identify bloated tables
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c \
  "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
   LIMIT 10;"
```

#### 1.2 Redis Maintenance
```bash
# Check memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# Check fragmentation
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO stats | grep fragmentation

# Flush expired keys (if needed)
# Only in development/staging
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB
```

#### 1.3 Disk Cleanup
```bash
# Remove old logs (>30 days)
find /opt/skillswap/logs -name "*.log" -mtime +30 -delete

# Remove old Docker images
docker image prune -af --filter "until=168h"  # 7 days

# Remove old backups (>90 days)
find /opt/skillswap/backups -name "*.sql.gz" -mtime +90 -delete

# Check disk usage
df -h
```

#### 1.4 Dependency Updates
```bash
# Check for security updates
cd /opt/skillswap/backend
npm audit

cd /opt/skillswap/frontend
npm audit

# Update non-breaking dependencies
npm update

# Run tests after updates
npm test
```

---

### 2. Security Review
**Time**: Every Sunday 3:00 PM IST
**Duration**: 1 hour
**Responsible**: Security Lead

**Checklist**:
- [ ] Review failed login attempts
- [ ] Review user reports/flags
- [ ] Check for SQL injection attempts
- [ ] Review access logs for anomalies
- [ ] Verify SSL certificates valid
- [ ] Check for DDoS patterns
- [ ] Review API rate limit hits
- [ ] Verify backup encryption

---

### 3. Performance Optimization
**Time**: Every Sunday 4:00 PM IST
**Duration**: 1 hour

**Tasks**:
```bash
# 1. Identify slow queries
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c \
  "SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;"

# 2. Check cache performance
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO stats

# 3. Analyze API performance
# Review Grafana dashboards for slowest endpoints

# 4. Review and optimize if needed
# Add indexes, optimize queries, adjust caching
```

---

## Monthly Maintenance

### 1. Comprehensive Security Audit
**Time**: First Sunday of month, 10:00 AM IST
**Duration**: 3 hours

**Procedure**:
```bash
# 1. Run security scanner
npm audit --production
npm audit fix

# 2. Check for vulnerable dependencies
docker scan skillswap-backend:latest
docker scan skillswap-frontend:latest

# 3. Review IAM policies (AWS/Cloud)
# Verify least privilege access

# 4. Review user permissions
# Check for inactive admin accounts

# 5. SSL certificate health
certbot certificates

# 6. Firewall rules review
sudo ufw status verbose

# 7. Review application secrets
# Rotate any compromised keys
```

---

### 2. Database Deep Maintenance
**Time**: Second Sunday of month, 2:00 AM IST
**Duration**: 3 hours

**Full Procedure**:
```bash
# 1. Create full backup
./backend/scripts/backup.sh create

# 2. Analyze all tables
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "ANALYZE;"

# 3. Reindex (if fragmentation > 20%)
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "REINDEX DATABASE skillswap_db;"

# 4. Check for missing indexes
# Review slow query log
# Add indexes as needed

# 5. Update statistics
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "VACUUM FULL ANALYZE;"

# 6. Verify backup integrity
./backend/scripts/backup.sh verify latest
```

---

### 3. Capacity Planning
**Time**: Last Sunday of month, 3:00 PM IST
**Duration**: 2 hours

**Review**:
- User growth trends
- Database size growth
- Storage utilization trends
- Bandwidth usage trends
- Server resource trends
- Cost analysis

**Forecast**:
- Projected users (next 3 months)
- Required infrastructure
- Budget planning
- Scaling recommendations

---

## Database Maintenance

### Routine Operations

#### Daily
```bash
# Quick health check
pg_isready -h localhost -p 5432
```

#### Weekly
```bash
# Vacuum (non-blocking)
VACUUM ANALYZE;

# Check bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

#### Monthly
```bash
# Full vacuum (requires downtime)
VACUUM FULL ANALYZE;

# Reindex
REINDEX DATABASE skillswap_db;
```

---

### Performance Tuning

```sql
-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Identify unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE '%pkey%';

-- Identify slow queries
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Backup & Recovery

### Backup Strategy

#### Automated Daily Backups
```bash
# Cron job (runs at 2 AM daily)
0 2 * * * cd /opt/TejIndia&& ./backend/scripts/backup.sh create
```

#### Backup Types
1. **Full Database Backup** (Daily)
   - Complete pg_dump
   - Compressed with gzip
   - Stored locally and in S3

2. **Incremental Backups** (Every 6 hours)
   - WAL archiving
   - Point-in-time recovery capability

3. **File Backups** (Daily)
   - User uploaded files
   - Configuration files
   - Stored in S3

#### Backup Retention
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year
- Yearly backups: 7 years (compliance)

---

### Recovery Procedures

#### Restore from Backup
```bash
# 1. Stop application
docker-compose -f docker-compose.prod.yml stop backend frontend

# 2. List available backups
./backend/scripts/backup.sh list

# 3. Restore from specific backup
./backend/scripts/backup.sh restore backups/skillswap_backup_20250116.sql.gz

# 4. Verify restoration
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db -c "SELECT COUNT(*) FROM users;"

# 5. Start application
docker-compose -f docker-compose.prod.yml up -d
```

#### Point-in-Time Recovery
```bash
# 1. Stop PostgreSQL
docker-compose -f docker-compose.prod.yml stop postgres

# 2. Restore base backup
pg_restore -d skillswap_db backup.dump

# 3. Configure recovery
cat > recovery.conf <<EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2025-01-16 14:30:00'
EOF

# 4. Start PostgreSQL (recovery mode)
docker-compose -f docker-compose.prod.yml up -d postgres

# 5. Monitor recovery
docker-compose -f docker-compose.prod.yml logs -f postgres

# 6. Promote to production
pg_ctl promote
```

---

## Security Maintenance

### SSL Certificate Management

#### Auto-Renewal (Let's Encrypt)
```bash
# Certbot auto-renewal (runs twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "systemctl reload nginx"

# Manual renewal
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

#### Certificate Monitoring
```bash
# Check expiry
echo | openssl s_client -servername skillswap.in -connect skillswap.in:443 2>/dev/null | openssl x509 -noout -dates

# Alert if < 30 days
EXPIRY=$(echo | openssl s_client -servername skillswap.in -connect skillswap.in:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
# Parse and alert if needed
```

---

### Secret Rotation

#### Quarterly Secret Rotation
```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
NEW_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# 2. Update .env file
vim .env
# Update JWT_SECRET and JWT_REFRESH_SECRET

# 3. Restart application
docker-compose -f docker-compose.prod.yml restart backend

# 4. Invalidate old sessions (users will need to re-login)
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# 5. Verify new secrets work
curl -X POST https://api.skillswap.in/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Deployment Procedures

### Standard Deployment (Zero Downtime)

```bash
# 1. Pull latest code
cd /opt/skillswap
git pull origin main

# 2. Run tests
cd backend && npm test
cd ../frontend && npm test

# 3. Build Docker images
docker-compose -f docker-compose.prod.yml build

# 4. Run database migrations
docker-compose -f docker-compose.prod.yml run --rm backend \
  npx prisma migrate deploy

# 5. Deploy with rolling update
docker-compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# 6. Health check
sleep 10
curl -f https://api.skillswap.in/health || exit 1

# 7. Monitor logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100 backend

# 8. Clean up
docker image prune -f
```

### Hotfix Deployment

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Apply fix and test

# 3. Fast-track deployment
git push origin hotfix/critical-bug

# 4. Deploy immediately
cd /opt/skillswap
git pull origin hotfix/critical-bug
docker-compose -f docker-compose.prod.yml up -d --build backend

# 5. Verify fix
curl -f https://api.skillswap.in/health

# 6. Notify team
# Post in Slack #engineering channel
```

---

## Emergency Procedures

### Service Down

**Immediate Actions**:
```bash
# 1. Check if services are running
docker-compose -f docker-compose.prod.yml ps

# 2. Check logs
docker-compose -f docker-compose.prod.yml logs --tail=200 backend

# 3. Restart services
docker-compose -f docker-compose.prod.yml restart

# 4. If restart fails, rebuild
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# 5. Update status page
# Notify users via email/social media
```

---

### Database Corruption

**Procedure**:
```bash
# 1. Stop application immediately
docker-compose -f docker-compose.prod.yml stop

# 2. Assess corruption
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U TejIndia-d skillswap_db

# Try to query tables

# 3. If severe, restore from backup
./backend/scripts/backup.sh restore latest

# 4. Verify restoration
# Run integrity checks

# 5. Restart application
docker-compose -f docker-compose.prod.yml up -d

# 6. Post-mortem
# Document what happened and prevention measures
```

---

### Security Breach

**Immediate Response**:
```bash
# 1. Isolate affected systems
sudo ufw deny from MALICIOUS_IP

# 2. Change all secrets immediately
# Generate new JWT secrets
# Update database passwords
# Rotate API keys

# 3. Invalidate all sessions
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL

# 4. Force password reset for all users
# Update users table
UPDATE users SET password_reset_required = true;

# 5. Audit logs
grep -r "MALICIOUS_IP" /opt/skillswap/logs/

# 6. Notify affected users
# Send email notification

# 7. Report to authorities if needed

# 8. Full security audit
# Engage security consultant if serious
```

---

## Maintenance Calendar

### Daily
- [x] 09:00 AM - System health check
- [x] 11:00 AM - Performance check
- [x] 05:00 PM - Performance check
- [x] Throughout - Log review

### Weekly
- [x] Sunday 02:00 AM - Full system audit
- [x] Sunday 03:00 PM - Security review
- [x] Sunday 04:00 PM - Performance optimization

### Monthly
- [x] 1st Sunday - Security audit
- [x] 2nd Sunday - Database deep maintenance
- [x] Last Sunday - Capacity planning

### Quarterly
- [x] Secret rotation
- [x] Dependency major updates
- [x] Security penetration testing
- [x] Disaster recovery drill

### Annually
- [x] Full infrastructure review
- [x] Technology stack evaluation
- [x] Compliance audit
- [x] Team training updates

---

## Checklist Templates

### Pre-Deployment Checklist
```
- [ ] Code reviewed and approved
- [ ] Tests passing (unit, integration, E2E)
- [ ] Database migrations tested
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Monitoring configured for new features
- [ ] Documentation updated
- [ ] Stakeholders notified
```

### Post-Deployment Checklist
```
- [ ] Health check passed
- [ ] No errors in logs (first 10 min)
- [ ] Key features tested manually
- [ ] Performance metrics normal
- [ ] User feedback monitored
- [ ] Team notified of completion
- [ ] Deployment documented
```

### Monthly Security Checklist
```
- [ ] Dependency audit completed
- [ ] Vulnerability scan completed
- [ ] SSL certificates valid (>30 days)
- [ ] Access logs reviewed
- [ ] User permissions audited
- [ ] Backup integrity verified
- [ ] Incident reports reviewed
- [ ] Security patches applied
```

---

## Conclusion

Regular, disciplined maintenance is essential for:
- **Reliability**: Prevent downtime
- **Performance**: Maintain speed
- **Security**: Protect data
- **Scalability**: Support growth

**Remember**: Prevention is better than cure. Regular maintenance prevents emergencies.

---

**Last Updated**: January 2025
**Next Review**: Quarterly
**Owner**: DevOps Team

---

**For questions or issues, contact**: devops@skillswap.in
