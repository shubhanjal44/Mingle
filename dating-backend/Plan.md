🧠 PROJECT: Premium India Dating App (18–25, Mobile First)

Positioning:

Casual + Serious hybrid

Luxury premium tier

India-wide

Modern, safe, scalable

🏗 MASTER SYSTEM ARCHITECTURE
Backend

Express + TypeScript

Prisma v7

PostgreSQL (Supabase)

Redis (later)

JWT auth

Razorpay

Cloudinary (photos)

WebSocket (chat later)

Frontend (future)

React / React Native

Mobile-first

Swipe UI

Dark theme

🚀 COMPLETE BUILD PHASES
✅ PHASE 1 — Infrastructure (DONE / Almost Done)

✔ Project initialized
✔ Supabase connected
✔ Prisma schema
✔ tsx runtime
✔ Basic server running
✔ Auth basic implemented

Pending:

Prisma singleton setup

JWT middleware

Protected route

Proper error handler middleware

🔐 PHASE 2 — Authentication System (COMPLETE THIS FIRST)

You must have:

Register

Login

JWT middleware

Get current user

Password hashing

Error handling

Input validation (Zod)

Pending:

Refresh token (optional advanced)

Logout token invalidation (future)

Email verification (future)

Phone verification (future)

AI Agent Role:

Generate validation schemas

Suggest security improvements

Review auth flow

👤 PHASE 3 — Profile System (VERY IMPORTANT)

This is foundation of dating app.

Build:

Update profile endpoint

Add dating intent

Add gender preference

Add city

Add bio

Add DOB

Calculate age

Add prompts (3 required)

Add photos (minimum 2)

Profile completion score logic

Pending:

Cloudinary integration

Photo order system

ProfileScore auto calculation

AI Agent Role:

Generate profile scoring logic

Optimize DB queries

Validate profile completeness

Suggest UX improvements

💘 PHASE 4 — Discover & Swipe Engine (CORE FEATURE)

Build:

Discover API

Filter by:

Age range

Gender

Dating intent

Location

Exclude:

Already liked

Already matched

Blocked users

Ranking:

Boosted users

ActivityScore

ProfileScore

New users

Swipe System:

POST /swipe/right

POST /swipe/left

Transaction:

Create Like

Check reverse like

If exists → Create Match

Return match status

Pending:

Redis swipe limits

Advanced ranking algorithm

AI Agent Role:

Optimize matching queries

Suggest ranking formulas

Improve discover performance

Detect potential abuse

💬 PHASE 5 — Match & Chat

Build:

List matches API

Create conversation ID

Send message

Get messages (pagination)

Only allow matched users

Read receipt update

Pending:

WebSocket real-time

Online status

Typing indicator

AI Agent Role:

Suggest scalable chat structure

Optimize indexing

Suggest Redis usage

💎 PHASE 6 — Premium System

Build:

Subscription table logic

Middleware check for premium

Swipe limit enforcement

Boost table

Boost priority in discover

See who liked you API

Advanced filters

Pending:

Razorpay integration

Cron job for expiry

Subscription downgrade logic

AI Agent Role:

Design monetization rules

Optimize subscription flow

Simulate revenue scenarios

🛡 PHASE 7 — Safety & Moderation

Build:

Block user

Report user

Auto hide after X reports

Admin moderation endpoints

Rate limit swipes

Rate limit messages

Pending:

AI content moderation (future)

Shadow ban logic

Fraud detection logic

AI Agent Role:

Suggest anti-spam strategies

Improve safety logic

Detect suspicious patterns

📊 PHASE 8 — Analytics & Growth

Build:

ActivityScore update

Daily active users tracking

Match rate tracking

Swipe conversion tracking

Pending:

Streak system

Referral system

Boost discount campaigns

AI Agent Role:

Analyze user behavior

Suggest growth experiments

Improve retention mechanics

🧠 FULL PENDING CHECKLIST
Backend Pending

Prisma singleton

JWT middleware

Users module

Profile update API

Prompt API

Photo upload

Discover API

Swipe API

Match API

Chat API

Subscription middleware

Block API

Report API

Redis integration

Error handler middleware

Logging middleware

🔥 ORDER YOU SHOULD BUILD (IMPORTANT)

DO NOT JUMP RANDOMLY.

Correct order:

Finish Auth + GetMe

Build Profile update

Add prompts + photos

Build Discover

Build Swipe logic

Build Match listing

Build Chat restriction

Add Swipe limits

Add Premium system

Add Moderation

🧠 AI AGENT USAGE STRATEGY

You should use AI for:

✔ Query optimization
✔ Validation schemas
✔ Error handling improvements
✔ Refactoring code
✔ Security review
✔ Performance suggestions
✔ Ranking algorithm improvements

You should NOT use AI for:

❌ Copy-paste blind coding
❌ Schema guessing
❌ Full system generation without thinking

You guide architecture.
AI assists. make full
Context Length
0
200.0k

Tokens




API Request...
07:42 PM
$0.0000

$
Paid Model - Credits Required
This is a paid model. To use paid models, you need to add credits. Get $20 free on your first topup!
Your Kilo Code balance is low

Add Credit
Discover free and budget model options

Type a message...

(@ to add context, / for commands, hold shift to drag in files/images)




Code

Anthropic: Claude Haiku 4.5