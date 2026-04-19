# Implementation Plan: Ibn Sina Medical Center — Full Platform

**Branch**: `001-ibn-sina-platform` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-ibn-sina-platform/spec.md`

---

## Summary

A bilingual (Arabic-primary, RTL-first), MOH/HIPAA-aligned full-stack web platform for Ibn Sina Medical Center. Four integrated modules — Public Website, Patient Portal, Admin Dashboard, Doctor Portal — unified by a shared JWT+RBAC authentication system, a MongoDB-backed API, and a typed-contract layer shared between frontend and backend. Delivered in four phases across eight weeks.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, both FE and BE) / Node.js 20 LTS
**Primary Dependencies**:
- Frontend: React 18, Vite 5, Tailwind CSS 3, react-i18next, react-router-dom v6, TanStack Query v5, react-hook-form + zod, Axios (typed)
- Backend: Express 4, Mongoose 8, jsonwebtoken, bcryptjs, nodemailer, winston, helmet, express-rate-limit, multer → Cloudinary
- Payment: HyperPay SDK (primary) + Stripe SDK (secondary/international)
- Notifications: Unifonic SMS API (or Taqnyat) + Nodemailer (SMTP/SendGrid)
- PDF: puppeteer (receipt generation, server-side)

**Storage**: MongoDB Atlas (KSA region M10+) — primary datastore; Cloudinary — media (doctor photos, profile images); server-side ephemeral storage for PDF generation

**Testing**:
- Backend unit + integration: Jest + Supertest + mongodb-memory-server
- Frontend unit: Vitest + React Testing Library
- E2E: Playwright (Arabic RTL + English LTR locales)
- Coverage gate: ≥ 80% on `backend/src/features/**/services/`

**Target Platform**: Responsive web application (375 px → 1440 px), Arabic RTL default, SSR not required (CSR with Vite)

**Project Type**: Full-stack web application (separate FE + BE repos in a monorepo)

**Performance Goals**:
- API read p95 < 500 ms; write p95 < 1 000 ms
- 200 concurrent booking sessions without 2× latency degradation
- Slot availability update propagation ≤ 3 s (polling or WebSocket)
- Content change propagation to public site ≤ 30 s

**Constraints**:
- Data residency: MongoDB Atlas cluster in KSA (me-south-1 equivalent)
- TLS 1.2+ everywhere; PHI never logged in plaintext
- WCAG 2.1 AA on all public-facing pages (both locales)
- No `any` in TypeScript; strict mode enforced by CI
- Slot hold during payment: 10-minute TTL (via MongoDB TTL index on a `SlotHold` collection)

**Scale/Scope**: ~200 concurrent users at launch; ~20 doctors; ~500 appointments/month initially

---

## Constitution Check

*GATE: Must pass before Phase 1 begins. Re-checked after each phase.*

| Principle | Gate | Status | Notes |
|---|---|---|---|
| I. Security First | JWT RS256 auth + RBAC middleware on ALL non-public routes; `npm audit` clean before each merge | ✅ PASS | Auth system is Phase 1, Gate 1 item |
| II. RTL-First | Tailwind `dir="rtl"` default; logical CSS properties; every component verified at 375 px in AR before EN | ✅ PASS | Base layout scaffolded RTL-first in Phase 1 |
| III. Modular Architecture | Feature-first directories; no cross-feature direct imports; shared `common/` for utilities | ✅ PASS | Directory layout enforced from scaffold |
| IV. TypeScript Everywhere | `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true` in all tsconfigs; `tsc --noEmit` in CI | ✅ PASS | Tsconfig template prepared in Phase 1 |
| V. API-First | `docs/openapi.yaml` complete before any feature implementation; typed Axios client generated from spec | ✅ PASS | OpenAPI spec produced in Phase 0 (research) |
| VI. Compliance | Audit log middleware active from Phase 1; consent capture in patient registration; KSA Atlas cluster | ✅ PASS | AuditLog collection created in Phase 1 foundation |
| VII. Test-First | Auth, slot-locking, RBAC, payment-flow tests written and failing before implementation | ✅ PASS | Test scaffolds in Phase 1; red-green cycle enforced |
| VIII. Accessibility | react-i18next from day one; no hardcoded strings; ARIA labels on all interactive elements | ✅ PASS | i18n skeleton in Phase 1 base layout |
| IX. Observability | Winston structured logging; `X-Request-Id` propagation; `/api/health` + `/api/health/db` endpoints | ✅ PASS | Logging middleware and health endpoints in Phase 1 |

**No constitution violations. All gates pass. Proceeding.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ibn-sina-platform/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions + rationale
├── data-model.md        # Phase 1 — MongoDB schemas + relationships
├── quickstart.md        # Phase 1 — local dev setup guide
├── contracts/           # Phase 1 — API endpoint contracts by feature
│   ├── auth.md
│   ├── doctors.md
│   ├── appointments.md
│   ├── patients.md
│   ├── payments.md
│   ├── admin.md
│   └── content.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
ibn-sina/
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json                     # strict: true
│   ├── tailwind.config.ts                # dir: rtl default
│   ├── src/
│   │   ├── main.tsx                      # App entry; i18n init; dir attribute
│   │   ├── App.tsx                       # Router root; LanguageProvider
│   │   ├── features/
│   │   │   ├── public/                   # Public website (Home, Doctors, Services)
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   └── index.ts              # Public barrel
│   │   │   ├── auth/                     # Login, Register, ForgotPassword
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── appointments/             # Booking flow + slot picker
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── payments/                 # HyperPay / Stripe checkout
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   └── index.ts
│   │   │   ├── patient/                  # Patient portal (dashboard, history, receipts)
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── admin/                    # Admin dashboard (appointments, doctors, patients, analytics, roles)
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── doctor/                   # Doctor portal (schedule, patient records, notes)
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   └── content/                  # CMS editor (admin-only)
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       └── index.ts
│   │   ├── shared/
│   │   │   ├── components/               # Button, Input, Modal, Badge, Spinner, etc.
│   │   │   ├── layouts/                  # PublicLayout, PortalLayout, AdminLayout
│   │   │   ├── hooks/                    # useAuth, useRTL, useToast, useApi
│   │   │   ├── utils/                    # date formatting, currency, validators
│   │   │   ├── api/                      # Axios instance + typed API client
│   │   │   └── guards/                   # RoleGuard, AuthGuard route wrappers
│   │   ├── i18n/
│   │   │   ├── config.ts                 # i18next init
│   │   │   ├── ar/                       # Arabic namespaced JSONs
│   │   │   │   ├── common.json
│   │   │   │   ├── auth.json
│   │   │   │   ├── appointments.json
│   │   │   │   ├── patient.json
│   │   │   │   ├── admin.json
│   │   │   │   ├── doctor.json
│   │   │   │   └── public.json
│   │   │   └── en/                       # English namespaced JSONs (same keys)
│   │   └── assets/
│   │       ├── fonts/                    # IBM Plex Arabic + Latin subsets
│   │       └── images/
│   └── tests/
│       ├── e2e/                          # Playwright
│       │   ├── booking-flow.ar.spec.ts   # Full AR booking E2E
│       │   ├── booking-flow.en.spec.ts   # Full EN booking E2E
│       │   └── auth.spec.ts
│       └── unit/                         # Vitest component tests
│
├── backend/
│   ├── tsconfig.json                     # strict: true
│   ├── src/
│   │   ├── server.ts                     # Express app bootstrap
│   │   ├── app.ts                        # Express app factory (testable)
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── auth.router.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts       # JWT issue/verify/refresh
│   │   │   │   ├── auth.middleware.ts    # requireAuth, requireRole
│   │   │   │   ├── auth.schema.ts        # Mongoose User schema
│   │   │   │   └── auth.types.ts
│   │   │   ├── doctors/
│   │   │   │   ├── doctors.router.ts
│   │   │   │   ├── doctors.controller.ts
│   │   │   │   ├── doctors.service.ts    # CRUD + schedule management
│   │   │   │   ├── doctors.schema.ts
│   │   │   │   └── doctors.types.ts
│   │   │   ├── appointments/
│   │   │   │   ├── appointments.router.ts
│   │   │   │   ├── appointments.controller.ts
│   │   │   │   ├── appointments.service.ts  # Slot generation + booking logic
│   │   │   │   ├── slotHold.schema.ts       # TTL-indexed slot holds
│   │   │   │   ├── appointments.schema.ts
│   │   │   │   └── appointments.types.ts
│   │   │   ├── payments/
│   │   │   │   ├── payments.router.ts
│   │   │   │   ├── payments.controller.ts
│   │   │   │   ├── payments.service.ts   # HyperPay + Stripe adapters
│   │   │   │   ├── payments.schema.ts
│   │   │   │   └── payments.types.ts
│   │   │   ├── patients/
│   │   │   │   ├── patients.router.ts
│   │   │   │   ├── patients.controller.ts
│   │   │   │   ├── patients.service.ts
│   │   │   │   └── patients.types.ts
│   │   │   ├── admin/
│   │   │   │   ├── admin.router.ts
│   │   │   │   ├── admin.controller.ts
│   │   │   │   └── admin.service.ts
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.router.ts
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   └── analytics.service.ts  # MongoDB aggregation pipelines
│   │   │   ├── content/
│   │   │   │   ├── content.router.ts
│   │   │   │   ├── content.controller.ts
│   │   │   │   ├── content.service.ts
│   │   │   │   └── content.schema.ts
│   │   │   └── notifications/
│   │   │       ├── email.service.ts      # Nodemailer / SendGrid
│   │   │       └── sms.service.ts        # Unifonic adapter
│   │   └── shared/
│   │       ├── middleware/
│   │       │   ├── requestId.ts          # X-Request-Id injection
│   │       │   ├── requireAuth.ts        # JWT verification
│   │       │   ├── requireRole.ts        # RBAC enforcement
│   │       │   ├── auditLog.ts           # PHI-safe audit logging
│   │       │   ├── errorHandler.ts       # Centralised error → envelope
│   │       │   ├── rateLimiter.ts        # express-rate-limit
│   │       │   └── sanitize.ts           # mongo-sanitize + XSS clean
│   │       ├── utils/
│   │       │   ├── logger.ts             # Winston structured logger
│   │       │   ├── apiResponse.ts        # { success, data, error, meta }
│   │       │   ├── pagination.ts         # Cursor-based pagination helpers
│   │       │   └── pdfGenerator.ts       # Puppeteer receipt builder
│   │       └── config/
│   │           ├── database.ts           # Mongoose connect
│   │           ├── env.ts                # Typed env vars (zod)
│   │           └── constants.ts
│   └── tests/
│       ├── integration/
│       │   ├── auth.test.ts
│       │   ├── appointments.test.ts      # Concurrent booking, slot-hold
│       │   ├── payments.test.ts
│       │   └── rbac.test.ts
│       └── unit/
│           ├── slotGeneration.test.ts
│           ├── auditLog.test.ts
│           └── pdfGenerator.test.ts
│
├── shared/
│   └── types/
│       ├── user.types.ts
│       ├── doctor.types.ts
│       ├── appointment.types.ts
│       ├── payment.types.ts
│       ├── content.types.ts
│       └── api.types.ts                  # Envelope + pagination generics
│
└── docs/
    └── openapi.yaml                      # OpenAPI 3.1 — source of truth
```

**Structure Decision**: Web application layout (Option 2 from template) — `frontend/` + `backend/` with a `shared/types/` package at root. Chosen because the React SPA and the Express API are independently deployable (Vercel + Railway/VPS) and share typed contracts at build time.

---

## Phase 1 — Foundation (Week 1–2)

**Goal**: Running monorepo with auth, RBAC, database connection, base RTL layout, and all shared infrastructure.

### 1.1 — Monorepo Scaffold

- Initialize root `package.json` with `workspaces: ["frontend", "backend", "shared"]`
- Configure root ESLint + Prettier (shared config consumed by all packages)
- Configure root `tsconfig.base.json` (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`)
- Configure GitHub Actions CI: `tsc --noEmit`, `eslint`, `jest --coverage`, `vitest run`
- Add `npm audit` step in CI (block on high/critical)

### 1.2 — Backend Foundation

- Express app factory (`app.ts`) + server entry (`server.ts`)
- Typed environment config via Zod (`config/env.ts`)
- MongoDB Atlas connection with retry logic (`config/database.ts`)
- Shared middleware stack (applied in order):
  1. `requestId` — injects `X-Request-Id`
  2. `helmet` — security headers
  3. `cors` — whitelist FE origins
  4. `rateLimiter` — 100 req/15 min per IP on auth routes; 500 req/15 min global
  5. `sanitize` — mongo-sanitize + xss-clean on request body
  6. `morgan`/`winston` — structured JSON request logging (scrubs PHI fields)
  7. `errorHandler` — maps errors to `{ success: false, error: { code, message } }`
- Health endpoints: `GET /api/health` → `{ status: "ok" }` | `GET /api/health/db` → `{ status, latency }`
- **AuditLog schema** — collection with TTL; actor, role, action, resourceType, resourceId, outcome, ip, timestamp
- Audit middleware wired to all write routes

### 1.3 — Authentication System (TDD — tests first)

*Tests written and confirmed failing before implementation starts.*

- `User` Mongoose schema (see `data-model.md`)
- `RefreshToken` schema (hashed token, userId, expiresAt, TTL index)
- Auth service:
  - `register(dto)` — bcrypt hash (cost 12), email verification token
  - `login(dto)` → `{ accessToken (15 min RS256), refreshToken (7 day, httpOnly cookie) }`
  - `refresh(token)` → rotate refresh token
  - `logout(token)` → revoke refresh token
  - `forgotPassword(email)` → time-limited reset token (email)
  - `resetPassword(token, newPassword)`
  - `verifyEmail(token)`
- RBAC middleware — `requireRole(...roles: Role[])` — reads JWT claims, returns 403 on mismatch
- Rate limit: 5 failed login attempts / 15 min per IP → 429

### 1.4 — Frontend Foundation

- Vite project init (`frontend/`) with React 18, TypeScript strict
- Tailwind CSS config:
  - `content`, `darkMode: 'class'`
  - No default `dir` in config — managed via `document.documentElement.dir` at runtime
  - IBM Plex Arabic + IBM Plex Sans loaded via `@font-face` in `index.css`
  - Logical property utilities extended where Tailwind lacks them
- `react-i18next` initialised in `main.tsx`; `dir` attribute set on `<html>` on language change
- Router structure (react-router-dom v6):
  ```
  /                         → PublicLayout
    /                       → HomePage
    /doctors                → DoctorsDirectoryPage
    /doctors/:id            → DoctorProfilePage
    /services               → ServicesPage
    /book/:doctorId         → BookingPage (slot picker + patient info)
    /checkout               → CheckoutPage
    /booking-confirmed      → ConfirmationPage
  /auth
    /login                  → LoginPage (redirects by role post-login)
    /register               → RegisterPage
    /forgot-password        → ForgotPasswordPage
    /reset-password         → ResetPasswordPage
    /verify-email           → VerifyEmailPage
  /patient                  → PortalLayout [AuthGuard: patient]
    /                       → PatientDashboardPage
    /appointments           → AppointmentsListPage
    /appointments/:id       → AppointmentDetailPage
    /history                → MedicalHistoryPage
    /profile                → ProfilePage
  /admin                    → AdminLayout [AuthGuard: admin | receptionist]
    /                       → AdminOverviewPage
    /appointments           → AdminAppointmentsPage [admin | receptionist]
    /doctors                → DoctorsManagementPage [admin]
    /doctors/:id/schedule   → DoctorSchedulePage [admin]
    /patients               → PatientsManagementPage [admin | receptionist]
    /content                → ContentManagementPage [admin]
    /analytics              → AnalyticsPage [admin]
    /roles                  → UserRolesPage [admin]
  /doctor                   → PortalLayout [AuthGuard: doctor]
    /                       → DoctorSchedulePage
    /appointments/:id       → PatientDetailPage
  ```
- `AuthGuard` and `RoleGuard` — redirect to `/auth/login` or `/403` as appropriate
- Shared component stubs: `Button`, `Input`, `Select`, `Modal`, `Badge`, `Spinner`, `Table`, `Pagination`
- Typed Axios instance in `shared/api/client.ts` — attaches `Authorization` header, handles token refresh on 401

---

## Phase 2 — Core Features (Week 3–5)

**Prerequisites**: Phase 1 complete; auth tests green; CI passing

### 2.1 — Doctors Module

**Backend** (`features/doctors/`):
- `DoctorProfile` schema embedded in / extending `User`
- `AvailabilitySchedule` schema (weekday, startTime, endTime, slotDurationMinutes)
- `UnavailabilityBlock` schema (doctorId, startDate, endDate, reason)
- CRUD endpoints: `GET /api/doctors`, `GET /api/doctors/:id`, `POST /api/doctors` [admin], `PUT /api/doctors/:id` [admin], `DELETE /api/doctors/:id` [admin] (soft-delete → deactivate)
- Deactivation guard: query future confirmed appointments before allowing deactivation
- Schedule endpoints: `PUT /api/doctors/:id/schedule`, `POST /api/doctors/:id/unavailability`, `DELETE /api/doctors/:id/unavailability/:blockId`
- Cloudinary upload for doctor photos (via multer middleware → Cloudinary transform)

**Frontend** (`features/public/` + `features/admin/`):
- `DoctorsDirectoryPage`: search input + specialty filter chips + doctor cards grid; RTL-first grid
- `DoctorProfilePage`: hero with photo + bio; interactive date picker → slot grid; "Book" CTA
- `AdminDoctorsPage`: CRUD data table; "Add Doctor" slide-over form (bilingual name + specialty + fee + schedule builder)
- `DoctorSchedulePage` (admin view): weekly grid + vacation block form

### 2.2 — Appointments Module (Slot Logic — critical path)

**Backend** (`features/appointments/`):

*Slot Generation Algorithm*:
1. Load doctor's `AvailabilitySchedule` for requested date's weekday
2. Load all `UnavailabilityBlock` ranges covering that date → skip
3. Generate slot start times: `startTime + n × slotDurationMinutes` until `endTime`
4. Query confirmed `Appointment` documents for that doctor+date → mark occupied
5. Query active `SlotHold` documents (TTL: 10 min) → mark held
6. Return available slots

*Concurrency-safe booking*:
1. `POST /api/appointments/hold` → create `SlotHold` (MongoDB `insertOne`; unique index on `doctorId+dateTime` prevents race)
2. On payment success webhook → `POST /api/appointments/confirm` → atomically: delete `SlotHold`, insert `Appointment`
3. On payment failure / timeout → `SlotHold` expires via TTL index (10 min) → slot freed automatically

Endpoints:
- `GET /api/appointments/slots?doctorId=&date=` → available slots
- `POST /api/appointments/hold` → create hold (returns `holdId`)
- `POST /api/appointments/confirm` → called by payment webhook
- `GET /api/appointments` [patient/admin] → filtered list
- `GET /api/appointments/:id` [patient/doctor/admin] → detail
- `PUT /api/appointments/:id/cancel` [patient within 24h | admin anytime]
- `PUT /api/appointments/:id/reschedule` [admin]
- `PUT /api/appointments/:id/status` [doctor → completed | admin]
- `POST /api/appointments/:id/notes` [doctor → save/update note within 24h]

**Frontend** (`features/appointments/`):
- `BookingPage`: date picker → slot grid (real-time, polls every 5 s while open); patient info form (react-hook-form + zod)
- `CheckoutPage`: fee summary + payment widget embed (HyperPay/Stripe)
- `ConfirmationPage`: booking reference + "Create Account" prompt
- `AdminAppointmentsPage`: full CRUD table with advanced filters + inline reschedule modal
- Integration test: concurrent POST to `/api/appointments/hold` with same slot → exactly one succeeds

### 2.3 — Patient Portal

**Backend** (`features/patients/`):
- Patient auth (reuses auth feature — role = `patient`)
- `GET /api/patients/me` → profile
- `PUT /api/patients/me` → update profile
- `GET /api/patients/me/appointments` → full appointment history
- `GET /api/patients/me/appointments/:id` → single appointment + consultation notes
- `GET /api/patients/me/history` → medical history summary (all past appointments + notes)
- `GET /api/patients/me/receipts/:paymentId` → stream PDF receipt

**Frontend** (`features/patient/`):
- `PatientDashboardPage`: upcoming appointment card + quick stats
- `AppointmentsListPage`: tab-filtered list (upcoming / past) with status badges
- `AppointmentDetailPage`: notes section + receipt download button
- `MedicalHistoryPage`: chronological accordion list
- `ProfilePage`: editable form with avatar upload

### 2.4 — Payment Integration

**Backend** (`features/payments/`):

Architecture — gateway adapter pattern:
```typescript
interface PaymentGateway {
  initiate(params: PaymentParams): Promise<PaymentSession>
  handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>
  refund(transactionRef: string, amount: number): Promise<RefundResult>
}
class HyperPayAdapter implements PaymentGateway { ... }
class StripeAdapter implements PaymentGateway { ... }
```
- `POST /api/payments/initiate` → select gateway by currency/card-type; return checkout URL / client secret
- `POST /api/payments/webhook/hyperpay` → verify HMAC signature; trigger appointment confirm
- `POST /api/payments/webhook/stripe` → verify Stripe signature; trigger appointment confirm
- `GET /api/payments/:id/receipt` → generate PDF (Puppeteer) with booking details; stream as PDF
- `Payment` schema: appointmentId, gateway, transactionRef, amount, currency (SAR), status, webhookPayload (encrypted at rest), timestamps

**Frontend** (`features/payments/`):
- `CheckoutPage`: HyperPay widget (iframe) as primary; Stripe Elements as fallback; fee breakdown in SAR
- Payment status polling on return from gateway redirect

---

## Phase 3 — Admin & Doctor Portals (Week 6–7)

**Prerequisites**: Phase 2 complete; all module APIs tested

### 3.1 — Admin Dashboard

**Backend** (`features/admin/` + `features/analytics/`):
- `GET /api/admin/appointments` — full cross-doctor list with advanced filter/sort/cursor-pagination
- `PUT /api/admin/appointments/:id/reschedule`
- `PUT /api/admin/appointments/:id/cancel`
- `GET /api/admin/patients` — search by name / national ID
- `GET /api/admin/users` — list all staff accounts [admin only]
- `POST /api/admin/users` — create Receptionist/Admin account [admin only]
- `PUT /api/admin/users/:id` — update role / deactivate
- Analytics aggregations (MongoDB pipeline):
  - `GET /api/analytics/summary?from=&to=` → { totalAppointments, totalRevenue, newPatients }
  - `GET /api/analytics/by-day?from=&to=` → daily time series
  - `GET /api/analytics/by-specialty?from=&to=` → specialty breakdown

**Frontend** (`features/admin/`):
- `AdminOverviewPage`: KPI cards (today's appointments, revenue MTD, new patients)
- `AdminAppointmentsPage`: full-featured data table; reschedule / cancel modals; status filters
- `DoctorsManagementPage`: doctor card grid + "Add / Edit Doctor" drawer; deactivation with conflict warning modal
- `DoctorSchedulePage` (admin): weekly schedule builder + vacation block calendar
- `PatientsManagementPage`: searchable patient table; patient detail slide-over (read-only clinical notes)
- `AnalyticsPage`: date-range picker; recharts line/bar charts for trends + specialty donut chart
- `UserRolesPage`: staff account table; role assignment + account creation form

### 3.2 — Doctor Portal

**Backend**: All endpoints already defined in Phase 2 (appointments, notes, status). No new routes required.

**Frontend** (`features/doctor/`):
- `DoctorSchedulePage`: today's appointments list sorted by time; calendar nav to any date (read-only)
- `PatientDetailPage`: patient info panel + historical notes accordion (this doctor only) + note editor (auto-disables after 24 h) + "Mark Completed" button

### 3.3 — Content Management

**Backend** (`features/content/`):
- `ContentBlock` schema: `{ key: string, ar: string, en: string, updatedBy, updatedAt }`
- Seed script populates default content blocks on first run
- `GET /api/content?keys[]=hero.title&keys[]=hero.subtitle` → public, no auth
- `PUT /api/content/:key` [admin only] → update AR + EN strings
- `GET /api/content` [admin only] → full list of all content blocks

**Frontend** (`features/content/`):
- `ContentManagementPage`: accordion sections (Homepage, Services, Contact) with inline bilingual text editors; "Save" triggers immediate API update and local cache invalidation
- Public website pages use `GET /api/content` with TanStack Query (stale-time: 30 s) to ensure ≤ 30 s propagation

---

## Phase 4 — Polish & Launch (Week 8)

### 4.1 — Arabic RTL Full Testing

- Run all Playwright E2E tests in Arabic locale (`ar-SA`) and English (`en-US`)
- Audit every page with WCAG 2.1 AA checker (axe-core) in both locales
- Manual RTL visual regression on: forms, tables, modals, navigation, date pickers, slot grids
- Screen-reader test (NVDA on Windows): booking flow, patient portal, doctor notes
- Fix all logical-property violations (`margin-left` → `margin-inline-start`, etc.)
- Verify Hijri date display on appointment confirmation

### 4.2 — Performance Optimization

- Backend: add compound indexes per `data-model.md` index strategy; profile slow queries with `explain()`
- Slot generation: cache doctor schedule in Redis (optional) or use short-TTL TanStack Query (5 s)
- Frontend: code-split by feature route (Vite dynamic imports); lazy-load admin charts
- Image optimization: Cloudinary auto-format (WebP), auto-quality, responsive breakpoints via `srcset`
- Lighthouse audit ≥ 85 on mobile for public pages

### 4.3 — Security Audit

- Run `npm audit` — zero high/critical allowed
- OWASP ZAP baseline scan on staging environment
- Penetration test checklist:
  - [ ] JWT RS256 key rotation procedure documented
  - [ ] Refresh token revocation tested
  - [ ] RBAC bypass attempt (direct URL navigation to admin routes as patient)
  - [ ] Concurrent booking double-spend test
  - [ ] Payment webhook signature verification tested with forged payload
  - [ ] PHI scrubbing verified in log output
  - [ ] Rate limiting verified (auth route brute force)
  - [ ] NoSQL injection via booking form fields
  - [ ] XSS via content management editor inputs
- Access-control matrix reviewed and signed off by Admin role owner

### 4.4 — Deployment

**Target infrastructure**:

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploy from `main`; env vars via Vercel dashboard |
| Backend API | Railway or VPS (KSA region) | Dockerfile; env via secrets; HTTPS via Nginx/Railway TLS |
| Database | MongoDB Atlas M10 (me-south-1 / Bahrain) | IP allowlist; KSA data residency |
| Media | Cloudinary | KSA or closest data centre; signed uploads |
| Email | SendGrid or AWS SES | Domain verified, DKIM configured |
| SMS | Unifonic (KSA) | Production API key separate from sandbox |

**Deployment checklist**:
- [ ] All env vars loaded from secrets (no `.env` in source)
- [ ] MongoDB Atlas connection string uses SRV with TLS
- [ ] CORS origin list restricted to production FE domain
- [ ] `NODE_ENV=production` disables stack traces in error responses
- [ ] Health check `/api/health/db` monitored (UptimeRobot or similar)
- [ ] Incident response document written and shared with Admin role owner
- [ ] Data retention policy configured on Atlas (snapshots + 10-year retention)
- [ ] Access-control matrix signed off before go-live

---

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Slot hold via `SlotHold` TTL collection | Prevents double-booking under concurrent requests without distributed locks | Advisory "check before insert" race-unsafe; Redis not in approved stack |
| Gateway adapter pattern (HyperPay + Stripe) | Two payment gateways required; must be swappable without touching business logic | Single gateway hard-coded would break when secondary gateway is added |
| Separate `shared/types/` package | FE + BE share identical API types; single source of truth prevents drift | Duplicated type files diverge under parallel development |
| Puppeteer for PDF receipts | Server-side PDF with Arabic RTL text and correct SAR formatting | Client-side PDF (jsPDF) cannot reliably handle RTL Arabic font rendering |
| RS256 JWT (asymmetric) over HS256 | Public key can be shared with third-party services (future) without exposing signing secret | HS256 requires sharing the secret with any service that validates tokens |
