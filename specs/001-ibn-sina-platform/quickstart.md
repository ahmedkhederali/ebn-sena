# Quickstart: Ibn Sina Medical Center — Local Development

**Date**: 2026-04-18
**Platform**: Windows / macOS / Linux
**Node.js required**: 20 LTS

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| npm | 10+ | Bundled with Node |
| MongoDB | 7.x (local) or Atlas account | https://mongodb.com |
| Git | Any | https://git-scm.com |

---

## 1. Clone & Install

```bash
git clone <repo-url> ibn-sina
cd ibn-sina

# Install all workspaces from root
npm install
```

---

## 2. Environment Variables

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/ibn-sina-dev
# or MongoDB Atlas: mongodb+srv://<user>:<pass>@cluster.mongodb.net/ibn-sina-dev

# JWT (RS256 — generate with: openssl genrsa -out private.pem 2048)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption (for webhook payload storage)
ENCRYPTION_KEY=<32-byte hex string>

# CORS
CORS_ORIGIN=http://localhost:5173

# Email (dev: use Mailtrap or Ethereal)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<mailtrap-user>
SMTP_PASS=<mailtrap-pass>
EMAIL_FROM=noreply@ibnsina.sa

# SMS (dev: mock mode)
SMS_PROVIDER=mock
UNIFONIC_APP_SID=<sandbox-sid>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>

# Payment Gateways (sandbox)
HYPERPAY_ACCESS_TOKEN=<sandbox-token>
HYPERPAY_BASE_URL=https://eu-test.oppwa.com
HYPERPAY_ENTITY_ID_VISA=<entity-id>
HYPERPAY_WEBHOOK_SECRET=<webhook-hmac-secret>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_HYPERPAY_SCRIPT_URL=https://eu-test.oppwa.com/v1/paymentWidgets.js
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 3. Generate JWT Keys

```bash
cd backend
mkdir -p keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

---

## 4. Seed Database

```bash
# From repo root
npm run seed --workspace=backend
```

This creates:
- 1 Admin account: `admin@ibnsina.sa` / `Admin123!`
- 3 sample doctors with weekly schedules
- 5 medical specialties / services
- Default content blocks for homepage and services page

---

## 5. Start Development Servers

```bash
# From repo root — starts both FE and BE with hot reload
npm run dev

# Or individually:
npm run dev --workspace=backend   # http://localhost:4000
npm run dev --workspace=frontend  # http://localhost:5173
```

---

## 6. Run Tests

```bash
# Backend (Jest + mongodb-memory-server)
npm test --workspace=backend

# Frontend (Vitest)
npm test --workspace=frontend

# E2E (Playwright — requires both dev servers running)
npm run test:e2e

# Coverage report
npm run test:coverage --workspace=backend
```

Coverage gate: backend `services/` layer must be ≥ 80 %.

---

## 7. Verify RTL Layout

Open `http://localhost:5173` in Chrome. The page should:
- Load in Arabic by default (`dir="rtl"` on `<html>`)
- Display IBM Plex Arabic font
- Show navigation aligned to the right
- Show form labels right-aligned

Click the language switcher → page re-renders in English (LTR) without reload.

---

## 8. Test the Booking Flow (Happy Path)

1. Navigate to `http://localhost:5173/doctors`
2. Select any doctor → click "Book Appointment"
3. Select a date and available time slot
4. Fill in patient info (use any 10-digit number for National ID in dev)
5. Click "Proceed to Payment"
6. In sandbox: use HyperPay test card `4111 1111 1111 1111`, expiry `01/39`, CVV `123`
7. On redirect back → confirm page with booking reference
8. Check Mailtrap inbox for confirmation email

---

## 9. Test Admin Dashboard

1. Navigate to `http://localhost:5173/auth/login`
2. Log in as `admin@ibnsina.sa` / `Admin123!`
3. Redirected to `/admin` dashboard
4. Navigate to `/admin/doctors` → verify seeded doctors visible
5. Navigate to `/admin/analytics` → verify charts render (no data yet — use date range covering seed data)

---

## 10. Verify Slot Hold Concurrency (Dev Test)

```bash
# Run the concurrency test — both requests target the same slot
npm run test:concurrency --workspace=backend
# Expected: one request returns 201 (hold created), one returns 409 (SLOT_UNAVAILABLE)
```

---

## 11. Health Check

```bash
curl http://localhost:4000/api/health
# → { "status": "ok", "timestamp": "..." }

curl http://localhost:4000/api/health/db
# → { "status": "ok", "latencyMs": 3 }
```

---

## Common Issues

| Issue | Fix |
|---|---|
| `Cannot connect to MongoDB` | Ensure MongoDB is running: `mongod --dbpath /data/db` |
| `JWT key not found` | Run the `openssl` key generation commands in step 3 |
| `Font not loading` | Check `frontend/src/assets/fonts/` — IBM Plex Arabic woff2 files must be present |
| `RTL not applied` | Verify `document.documentElement.dir === 'rtl'` in browser console on load |
| `Payment webhook not received in dev` | Use Stripe CLI: `stripe listen --forward-to localhost:4000/api/payments/webhook/stripe` |
