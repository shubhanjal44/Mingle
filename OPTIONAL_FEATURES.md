# Optional Features Configuration Guide

**Tej India - Optional Services Setup**

This guide explains optional features that enhance the platform but are NOT required for core functionality.

---

## 🎯 Core vs Optional Features

### ✅ **Core Features (No Setup Required)**
These work out of the box:
- User registration & authentication
- User profiles
- Skills management
- AI matching algorithm
- Skill swaps (create, manage, complete)
- Real-time chat (Socket.IO)
- Reviews & ratings
- Gamification (coins, XP, badges, leaderboards)
- Events system
- User connections
- Admin dashboard
- In-app notifications

### 🔧 **Optional Features (Require External Services)**
These need additional setup:
- Email notifications (SendGrid/SMTP)
- SMS OTP (Twilio)
- Payment processing (Razorpay)
- Image uploads (Cloudinary)

---

## 📧 Email Notifications (OPTIONAL)

### What It Enables
- Welcome emails
- Email OTP verification
- Password reset emails
- Notification emails
- Digest emails

### What Works Without Email
- ✅ Users can register (OTP shown in console logs during development)
- ✅ Password reset works (OTP shown in console logs)
- ✅ All in-app notifications work
- ✅ Chat notifications work in-app

### How to Enable

**Option 1: Gmail SMTP (Free, for testing)**

1. Enable 2-factor authentication on your Gmail account
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Add to `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

**Option 2: SendGrid (Recommended for production)**

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key
3. Add to `backend/.env`:

```env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@skillswap.in
```

**Option 3: Other SMTP Services**

Any SMTP service works (Mailgun, Amazon SES, etc.):

```env
SMTP_HOST=smtp.your-service.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@yourdomain.com
```

### Testing Email (Development Mode)

Without email configured, OTPs are logged to console:

```bash
# In backend terminal, you'll see:
📧 EMAIL (DEV MODE): OTP for user@example.com: 123456
```

Simply use the OTP from console logs!

---

## 📱 SMS OTP via Twilio (OPTIONAL)

### What It Enables
- SMS-based OTP verification
- Phone number verification
- SMS notifications

### What Works Without SMS
- ✅ Email OTP works (or console logs in dev mode)
- ✅ All other features work normally

### How to Enable

1. Sign up at https://www.twilio.com (free trial)
2. Get credentials from Twilio Console
3. Add to `backend/.env`:

```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 💳 Payment Processing via Razorpay (OPTIONAL)

### What It Enables
- Premium subscription payments
- SkillCoin purchases
- Payment history
- Invoices

### What Works Without Payments
- ✅ All free features work
- ✅ Users get free SkillCoins
- ✅ Basic subscription tier available
- ✅ All skill swaps work

### How to Enable

1. Sign up at https://razorpay.com
2. Get API keys from Dashboard
3. Add to `backend/.env`:

```env
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
```

4. Configure webhooks:
   - Webhook URL: `https://yourdomain.com/api/v1/webhooks/razorpay`
   - Events: payment.captured, payment.failed, subscription.charged

---

## 🖼️ Image Uploads via Cloudinary (OPTIONAL)

### What It Enables
- Profile picture uploads
- Event image uploads
- Skill verification images
- Chat image sharing

### What Works Without Cloudinary
- ✅ Default avatars work
- ✅ All other features work
- ✅ Images stored locally (not recommended for production)

### How to Enable

1. Sign up at https://cloudinary.com (free tier available)
2. Get credentials from Dashboard
3. Add to `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## 🚀 Recommended Setup by Stage

### Development (Local Testing)
```env
# Minimum required - everything else commented out
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Optional: Uncomment for testing email features
# SMTP_HOST=smtp.gmail.com
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
```

**Result:** ✅ All core features work, OTPs in console

### Staging (Pre-Production)
```env
# Core required
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Recommended
SENDGRID_API_KEY=...  # For email
CLOUDINARY_CLOUD_NAME=...  # For images

# Optional
RAZORPAY_KEY_ID=...  # For payment testing
```

**Result:** ✅ All features work, ready for user testing

### Production
```env
# All services configured
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
RAZORPAY_KEY_ID=...
CLOUDINARY_CLOUD_NAME=...
```

**Result:** ✅ Full platform with all features

---

## 🔍 How to Check What's Configured

### Backend Startup Logs

When you start the backend, you'll see:

```bash
✅ Database: Connected
✅ Redis: Connected
ℹ️  Email: Not configured (using console logs)
ℹ️  SMS: Not configured
ℹ️  Payments: Not configured
ℹ️  Image Upload: Using local storage

🚀 Server running on http://localhost:5000
```

This tells you exactly which services are active!

---

## 📋 Feature Availability Matrix

| Feature | No Optional Services | With Email | With All Services |
|---------|---------------------|------------|-------------------|
| User Registration | ✅ (console OTP) | ✅ (email OTP) | ✅ (email/SMS OTP) |
| Password Reset | ✅ (console OTP) | ✅ (email OTP) | ✅ (email/SMS OTP) |
| Profile Pictures | ✅ (default avatar) | ✅ (default avatar) | ✅ (uploads) |
| Skill Swaps | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Gamification | ✅ | ✅ | ✅ |
| Email Notifications | ❌ | ✅ | ✅ |
| SMS Notifications | ❌ | ❌ | ✅ |
| Premium Subscriptions | ❌ | ❌ | ✅ |
| Payment Processing | ❌ | ❌ | ✅ |

---

## 💡 Best Practices

### Development
```bash
# Start simple - no optional services needed!
# Use console logs for OTPs
# Use default avatars
# Focus on building features
```

### Before Production
```bash
# Enable email (minimum requirement)
# Configure image uploads (better UX)
# Set up payments if monetizing
# Test everything with real services
```

### Cost Optimization
```bash
# Free tiers available:
# - SendGrid: 100 emails/day
# - Cloudinary: 25 GB storage, 25 GB bandwidth
# - Razorpay: No setup fee, pay per transaction
# - Twilio: Free trial credits

# Start with free tiers, scale as needed
```

---

## 🆘 Troubleshooting

### "Email not sending"
- ✅ Check: Is SMTP configuration in .env?
- ✅ Check: Are credentials correct?
- ✅ Check: Is service configured to allow access?
- ✅ For development: Use console logs instead!

### "Payment failed"
- ✅ Check: Razorpay test mode vs live mode
- ✅ Check: Webhook URL is accessible
- ✅ Check: API keys are correct
- ✅ For testing: Use Razorpay test cards

### "Image upload failed"
- ✅ Check: Cloudinary credentials in .env
- ✅ Check: File size within limits
- ✅ Check: File type is allowed
- ✅ For development: Local storage works fine

---

## 📊 Service Costs (Approximate)

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| **SendGrid** | 100 emails/day | From $15/month (40K emails) |
| **Twilio** | Trial credits | Pay as you go (~$0.0075/SMS) |
| **Razorpay** | Free setup | 2% per transaction |
| **Cloudinary** | 25GB storage | From $89/month |

**Total for small startup:** Can start with $0/month (free tiers)!

---

## ✅ Quick Start Without Optional Services

```bash
# 1. Clone and setup
git clone <repo>
bash setup.sh

# 2. Keep email commented in .env
# (Already done by default!)

# 3. Start development
cd backend && npm run dev
cd frontend && npm run dev

# 4. Use OTP from console logs
# Check backend terminal for OTPs!
```

**You're ready to develop without any external services!** 🚀

---

## 📚 Related Documentation

- **Setup Guide:** `SETUP_GUIDE.md`
- **Implementation Status:** `IMPLEMENTATION_STATUS.md`
- **API Documentation:** `docs/API.md`
- **Environment Variables:** `.env.example`

---

**Built with ❤️ for India's youth | सीखो और सिखाओ 🇮🇳**

*Start simple, scale as you grow!*
