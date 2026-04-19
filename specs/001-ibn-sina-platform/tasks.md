---
description: "Sprint-ready task list for Ibn Sina Medical Center full platform"
---

# Tasks: Ibn Sina Medical Center — Full Platform

**Input**: Design documents from `specs/001-ibn-sina-platform/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/ ✅ | research.md ✅

**Layer legend**: `[BE]` Backend · `[FE]` Frontend · `[INT]` Integration · `[OPS]` DevOps
**Format**: `- [ ] T### [P?] [US?] Description` followed by metadata block

**Tests**: TDD enforced for all critical flows (Constitution §VII): auth, slot-hold, RBAC, payments.

**Total tasks**: 121 across 8 phases
**User stories**: US1 (P1) → US2 (P2) → US3 (P3) → US4 (P4) → US5 (i18n, woven throughout)

---

## Phase 1 — Setup (Week 1, Days 1–2)

**Purpose**: Monorepo scaffold, tooling, environment, and all shared configuration. No feature logic.
**No story labels in this phase.**

### DevOps & Tooling

- [ ] T001 [P] [OPS] Initialize monorepo root with npm workspaces in `package.json` defining `frontend/`, `backend/`, `shared/` packages

  **Layer**: OPS | **Est**: 1h | **Deps**: none
  **AC**: `npm install` from root installs all workspace dependencies without errors; `npm run dev` defined in root using `concurrently` to start both servers; `npm test` runs all workspace tests

- [ ] T002 [P] [OPS] Create root ESLint + Prettier shared config in `.eslintrc.base.js` and `.prettierrc` consumed by all workspaces

  **Layer**: OPS | **Est**: 1h | **Deps**: T001
  **AC**: `npx eslint .` from root catches `any` usage and missing semicolons; Prettier formats consistently across BE and FE; `"no-explicit-any": "error"` rule active

- [ ] T003 [P] [OPS] Create root `tsconfig.base.json` with `strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true` inherited by backend and frontend tsconfigs

  **Layer**: OPS | **Est**: 30min | **Deps**: T001
  **AC**: Any file containing `const x: any` fails `tsc --noEmit`; `exactOptionalPropertyTypes` rejects `{ a?: string }` set to `undefined` explicitly

- [ ] T004 [OPS] Create GitHub Actions CI workflow in `.github/workflows/ci.yml` running: `tsc --noEmit`, `eslint`, `jest --coverage`, `vitest run`, `npm audit`

  **Layer**: OPS | **Est**: 2h | **Deps**: T002, T003
  **AC**: CI blocks merge on TypeScript errors; CI blocks merge on `npm audit` high/critical; CI shows coverage report; all checks visible in PR status

- [ ] T005 [P] [OPS] Create environment template files `backend/.env.example` and `frontend/.env.example` documenting all required env vars from `specs/001-ibn-sina-platform/quickstart.md`

  **Layer**: OPS | **Est**: 30min | **Deps**: T001
  **AC**: Every env var used in code has a corresponding entry in `.env.example` with a description comment; `.env` files are in `.gitignore`

### Backend Scaffold

- [ ] T006 [BE] Initialize `backend/` TypeScript project: `tsconfig.json` extending base, `package.json` with Express 4 + Mongoose 8 + all deps from `plan.md` Technical Context

  **Layer**: BE | **Est**: 1h | **Deps**: T003
  **AC**: `npm run build --workspace=backend` compiles with zero errors; `npm run dev --workspace=backend` starts nodemon on port 4000; no `any` in any file

- [ ] T007 [BE] Create Express app factory in `backend/src/app.ts` and server entry in `backend/src/server.ts` (separate for testability)

  **Layer**: BE | **Est**: 1h | **Deps**: T006
  **AC**: `app.ts` exports the Express app without starting a listener; `server.ts` imports `app` and calls `listen()`; integration tests can import `app` directly without port conflicts

- [ ] T008 [BE] Create typed env config in `backend/src/config/env.ts` using Zod schema — validates all required env vars on startup, throws descriptive error if any are missing

  **Layer**: BE | **Est**: 1h | **Deps**: T006
  **AC**: Starting the server without `MONGODB_URI` set prints `"Missing required env var: MONGODB_URI"` and exits with code 1; no `process.env.X` access outside this file

- [ ] T009 [BE] Create MongoDB connection module in `backend/src/config/database.ts` with exponential-backoff retry (max 5 attempts) and graceful shutdown handler

  **Layer**: BE | **Est**: 1.5h | **Deps**: T008
  **AC**: Server retries connection up to 5 times before exiting; `SIGTERM` closes the Mongoose connection cleanly; connection state is logged via Winston on each attempt

### Frontend Scaffold

- [ ] T010 [FE] Initialize `frontend/` Vite + React 18 + TypeScript project; configure `tsconfig.json` extending base; install all FE deps from `plan.md` Technical Context

  **Layer**: FE | **Est**: 1h | **Deps**: T003
  **AC**: `npm run dev --workspace=frontend` starts dev server on port 5173 with hot reload; `npm run build` produces `dist/` with no TS errors; `VITE_API_BASE_URL` consumed from `.env`

- [ ] T011 [FE] Configure Tailwind CSS in `frontend/tailwind.config.ts`: content glob, `fontFamily` for IBM Plex Arabic + IBM Plex Sans, logical-property utilities plugin; add `@font-face` declarations in `frontend/src/index.css`

  **Layer**: FE | **Est**: 2h | **Deps**: T010
  **AC**: IBM Plex Arabic renders in browser (verified in DevTools Network tab); `margin-inline-start` class available; no `margin-left`/`margin-right` in component code

- [ ] T012 [FE] Create `frontend/src/i18n/config.ts` with react-i18next initialisation; create empty namespace JSON stubs (`ar/common.json`, `en/common.json`) for all 7 namespaces: `common`, `auth`, `appointments`, `patient`, `admin`, `doctor`, `public`

  **Layer**: FE | **Est**: 1.5h | **Deps**: T010
  **AC**: `useTranslation('common')` hook resolves without error; changing `i18n.language` to `'ar'` sets `document.documentElement.dir = 'rtl'` and `lang = 'ar'`; no hardcoded Arabic/English strings permitted in JSX after this task

### Shared Types Package

- [ ] T013 [P] [BE] [FE] Create `shared/types/` package with `package.json`, `tsconfig.json`; define `api.types.ts` with generic `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`; define `user.types.ts`, `appointment.types.ts`, `payment.types.ts`, `doctor.types.ts`, `content.types.ts` from `data-model.md`

  **Layer**: BE+FE | **Est**: 3h | **Deps**: T003
  **AC**: Both `backend/tsconfig.json` and `frontend/tsconfig.json` include path alias `"@shared/*"` pointing to `shared/types/*`; changing a type in `shared/` causes `tsc` error in both BE and FE if consumers break

---

## Phase 2 — Foundational (Week 1–2, Days 3–7)

**Purpose**: Auth system, RBAC, logging, audit trail, notification infrastructure, base UI. Blocks ALL user stories.
**⚠️ CRITICAL**: No user story work begins until T014–T031 are complete.
**No story labels in this phase.**

### Backend Foundation

- [ ] T014 [BE] Create shared middleware stack in `backend/src/shared/middleware/`: `requestId.ts` (injects `X-Request-Id` UUID), `helmet.ts` wrapper, `cors.ts` (origin allowlist from env), `rateLimiter.ts` (100 req/15 min auth; 500 req/15 min global)

  **Layer**: BE | **Est**: 2h | **Deps**: T007, T008
  **AC**: Every response has `X-Request-Id` header with UUID; `Origin: http://evil.com` returns 403; 101st request in 15 min to `/api/auth/*` returns 429 with `Retry-After` header

- [ ] T015 [BE] Create `backend/src/shared/middleware/sanitize.ts` applying `express-mongo-sanitize` and `xss-clean` to all request bodies; create `backend/src/shared/middleware/errorHandler.ts` mapping errors to `{ success: false, error: { code, message } }` — PHI field names (`nationalId`, `phone`, `name`) redacted from error details

  **Layer**: BE | **Est**: 1.5h | **Deps**: T014
  **AC**: `POST /api/auth/login` with body `{ "email": { "$gt": "" } }` returns 400 (sanitized, not executed); error responses never include stack traces in production; `nationalId` value never appears in error response body

- [ ] T016 [BE] Create `backend/src/shared/utils/logger.ts` using Winston with JSON format, `X-Request-Id` propagation via AsyncLocalStorage; PHI scrubber that redacts `nationalId`, `phone`, `passwordHash` fields before logging

  **Layer**: BE | **Est**: 2h | **Deps**: T014
  **AC**: Every log line is valid JSON with `{ level, message, requestId, timestamp }`; a log line triggered during a request containing `nationalId` does not include the actual ID value; `console.log` in production code triggers ESLint error

- [ ] T017 [BE] Create `backend/src/shared/utils/apiResponse.ts` with `success<T>(data, meta?)` and `failure(code, message, statusCode)` helpers enforcing the `{ success, data, error, meta }` envelope; create `backend/src/shared/utils/pagination.ts` with cursor-based helpers

  **Layer**: BE | **Est**: 1h | **Deps**: T007
  **AC**: All controller responses use these helpers exclusively; a response with `success: true` always has `data`; a response with `success: false` always has `error.code` and `error.message`

- [ ] T018 [BE] Create `AuditLog` Mongoose schema in `backend/src/shared/middleware/auditLog.ts`; implement post-response audit middleware using `res.on('finish')` capturing `actorId`, `role`, `action`, `resourceType`, `resourceId`, `outcome`, `ip`, `requestId` — zero PHI fields

  **Layer**: BE | **Est**: 2.5h | **Deps**: T016, T017
  **AC**: After `DELETE /api/appointments/xxx`, an `AuditLog` document exists with `action: "appointment.cancel"`, `resourceId: "xxx"`, `actorId`, `timestamp`; no patient name, phone, or nationalId in the log document; audit endpoint returns 403 to non-admin roles

- [ ] T019 [BE] Create `GET /api/health` and `GET /api/health/db` endpoints in `backend/src/app.ts`; health/db pings Mongoose and returns `{ status, latencyMs }`; returns 503 if DB unreachable

  **Layer**: BE | **Est**: 1h | **Deps**: T009, T017
  **AC**: `curl localhost:4000/api/health` returns `200 { "status": "ok" }`; stopping MongoDB causes `/api/health/db` to return 503 within 5 s; health endpoints excluded from rate limiter and auth middleware

### Authentication System (TDD — write failing tests first)

- [ ] T020 [BE] Write failing integration tests for auth flows in `backend/tests/integration/auth.test.ts` covering: register success, duplicate email, duplicate nationalId, login success, login wrong password, refresh token rotation, logout revocation, password reset flow — using `mongodb-memory-server`

  **Layer**: BE | **Est**: 3h | **Deps**: T015, T018
  **AC**: All 12+ test cases fail with "route not found" or similar — confirming tests are written before implementation; `npm test --workspace=backend` reports the failures cleanly

- [ ] T021 [BE] Create `User` Mongoose schema in `backend/src/features/auth/auth.schema.ts` with all fields from `data-model.md`; `RefreshToken` schema with TTL index; indexes: `{ email: 1 }` unique, `{ nationalId: 1 }` unique sparse, `{ role: 1, isActive: 1 }` compound

  **Layer**: BE | **Est**: 2h | **Deps**: T020
  **AC**: Inserting two `User` docs with the same `email` throws `MongoServerError: E11000`; inserting two patients with the same `nationalId` throws duplicate key error; a doctor with `nationalId: null` does not conflict with another doctor with `nationalId: null`

- [ ] T022 [BE] Implement `AuthService` in `backend/src/features/auth/auth.service.ts`: `register()` (bcrypt cost 12, consent required), `verifyEmail()`, `login()` (RS256 JWT 15 min + httpOnly refresh cookie 7 days), `refresh()`, `logout()`, `forgotPassword()`, `resetPassword()`

  **Layer**: BE | **Est**: 5h | **Deps**: T021
  **AC**: T020 integration tests all pass green; `accessToken` JWT decoded header shows `"alg": "RS256"`; refresh token is stored as SHA-256 hash in DB, never plaintext; `login()` with inactive account returns 403; 5 failed logins → 6th returns 429

- [ ] T023 [BE] Create auth router in `backend/src/features/auth/auth.router.ts` and controller in `auth.controller.ts` wiring all 8 auth endpoints from `contracts/auth.md`; mount at `/api/auth` in `app.ts`

  **Layer**: BE | **Est**: 2h | **Deps**: T022
  **AC**: `POST /api/auth/register` returns 201 with userId; `POST /api/auth/login` sets `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict`; T020 E2E tests all pass

- [ ] T024 [BE] Create `requireAuth` middleware in `backend/src/features/auth/auth.middleware.ts` verifying RS256 JWT; create `requireRole(...roles)` RBAC middleware; write failing RBAC test in `backend/tests/integration/rbac.test.ts` (6 role-endpoint combinations)

  **Layer**: BE | **Est**: 2.5h | **Deps**: T023
  **AC**: RBAC tests pass: patient JWT accessing `GET /api/admin/users` returns 403; admin JWT accessing `GET /api/patients/me` returns 200; expired JWT returns 401; missing Bearer returns 401; tampered JWT returns 401

- [ ] T025 [BE] Create `notifications/email.service.ts` using Nodemailer with SMTP config from env; create `notifications/sms.service.ts` with Unifonic adapter + mock mode for dev/test (reads `SMS_PROVIDER=mock` from env); create email templates (HTML + text) for: booking confirmation, cancellation, password reset, email verification

  **Layer**: BE | **Est**: 3h | **Deps**: T008, T016
  **AC**: `SMS_PROVIDER=mock` logs the message instead of calling Unifonic; `EMAIL_FROM` header correctly set; booking confirmation email renders Arabic content when `preferredLanguage: 'ar'`; all templates pass HTML validation

### Frontend Foundation

- [ ] T026 [FE] Create `frontend/src/shared/api/client.ts`: Axios instance with `VITE_API_BASE_URL` base URL, request interceptor attaching `Authorization: Bearer <token>` from localStorage, response interceptor retrying once on 401 with token refresh call before propagating error

  **Layer**: FE | **Est**: 2h | **Deps**: T010, T013
  **AC**: A request to a protected route with an expired access token automatically calls `POST /api/auth/refresh`, then retries the original request; a 401 after refresh redirects to `/auth/login`; `X-Request-Id` echoed from server visible in browser DevTools

- [ ] T027 [FE] Create base shared UI components in `frontend/src/shared/components/`: `Button` (variants: primary, secondary, ghost; RTL-aware icon placement), `Input` (with label, error state, ARIA), `Select`, `Spinner`, `Modal`, `Badge` (status variants), `Table`, `Pagination` (cursor-based)

  **Layer**: FE | **Est**: 4h | **Deps**: T011, T012
  **AC**: All components render correctly in RTL (verified at 375 px Chrome with `dir="rtl"`); every `Input` has `aria-label` or visible `<label>`; `Button` with `loading` prop shows `Spinner` and disables click; all strings via `useTranslation` (no hardcoded text)

- [ ] T028 [FE] Create layout components: `PublicLayout` (header with language switcher + nav, footer), `PortalLayout` (sidebar nav, user avatar), `AdminLayout` (sidebar with role-filtered nav items); implement `AuthGuard` and `RoleGuard` HOC wrappers in `frontend/src/shared/guards/`

  **Layer**: FE | **Est**: 3h | **Deps**: T027, T012
  **AC**: Accessing `/patient` without a valid JWT redirects to `/auth/login`; accessing `/admin/analytics` with a Receptionist JWT redirects to `/403`; language switcher toggles `document.documentElement.dir` between `rtl` and `ltr` without page reload; nav renders correctly in both directions

- [ ] T029 [FE] Configure react-router-dom v6 in `frontend/src/App.tsx` with the full route tree from `plan.md` using lazy imports (`React.lazy`) for all feature route groups; create placeholder page components for each route

  **Layer**: FE | **Est**: 2h | **Deps**: T028
  **AC**: Navigating to `/doctors` renders without crashing; `/admin/analytics` with a patient token redirects to `/403`; browser DevTools Network tab shows code-split chunks loading on first visit to each route group; 404 route renders a bilingual "Page Not Found" page

- [ ] T030 [FE] Create `useAuth` hook in `frontend/src/shared/hooks/useAuth.ts` wrapping `AuthContext` (user, role, isLoading, login, logout, refresh); create `useRTL` hook returning current `dir` and `lang`; create `useToast` hook wrapping a notification library

  **Layer**: FE | **Est**: 2h | **Deps**: T026, T029
  **AC**: `useAuth().user` is populated after successful login; `useAuth().logout()` clears token, calls `POST /api/auth/logout`, and redirects to `/auth/login`; `useRTL().dir` returns `'rtl'` when language is Arabic

- [ ] T031 [FE] Build auth pages: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `VerifyEmailPage` in `frontend/src/features/auth/pages/` using react-hook-form + zod validation; all strings via i18n; RTL-first layout

  **Layer**: FE | **Est**: 4h | **Deps**: T027, T030, T026
  **AC**: Register form submits to `POST /api/auth/register`; validation errors display in Arabic by default; password field shows strength indicator; email verification page auto-submits token from URL query param; register form rejects submission when `consentGiven` checkbox unchecked (mapped to FR-010)

**✅ Checkpoint**: Foundation complete — all auth tests green, CI passing, RTL base layout verified at 375 px. User story work can now begin.

---

## Phase 3 — User Story 1: Patient Books & Pays for an Appointment (Week 2–3)

**Goal**: Full public booking flow — discover doctor → select slot → pay → receive confirmation
**Independent Test**: New visitor completes entire booking flow with payment in < 5 min (SC-001)
**Priority**: P1 — this is the core revenue flow

### [US1] Backend — Doctors Module

- [ ] T032 [P] [US1] [BE] Create `Service` (specialty) Mongoose schema in `backend/src/features/content/content.schema.ts`; seed script at `backend/src/config/seed.ts` creating 6 specialties: Cardiology, Pediatrics, Dermatology, Orthopedics, Neurology, General Practice

  **Layer**: BE | **Est**: 1.5h | **Deps**: T009, T013
  **AC**: `npm run seed --workspace=backend` completes without errors; `GET /api/services` returns 6 specialties with `nameAr` and `nameEn`; seed is idempotent (safe to run twice)

- [ ] T033 [P] [US1] [BE] Create `DoctorProfile` Mongoose schema in `backend/src/features/doctors/doctors.schema.ts`; `AvailabilitySchedule` schema; `UnavailabilityBlock` schema — all with indexes from `data-model.md`

  **Layer**: BE | **Est**: 2h | **Deps**: T021, T032
  **AC**: Unique index on `doctorProfiles.userId` enforced; compound index `{ doctorId, dayOfWeek }` on `availabilitySchedules` exists (verify with `db.availabilitySchedules.getIndexes()`); TTL index not needed on these — just `slotHolds`

- [ ] T034 [US1] [BE] Implement `DoctorService` in `backend/src/features/doctors/doctors.service.ts`: `list(filters)` with specialty + search, `findById(id)`, `create(dto)`, `update(id, dto)`, `deactivate(id)` with future-appointment guard, `setSchedule(id, schedule)`, `addUnavailability(id, block)`, `removeUnavailability(id, blockId)`

  **Layer**: BE | **Est**: 4h | **Deps**: T033
  **AC**: `deactivate()` throws `DOCTOR_HAS_FUTURE_APPOINTMENTS` error listing affected appointments when future confirmed bookings exist; `list()` with `specialtyId` filter returns only doctors in that specialty; `list()` with `search: "خالد"` matches `nameAr` field

- [ ] T035 [US1] [BE] Create doctors router + controller in `backend/src/features/doctors/`; mount at `/api/doctors`; integrate Cloudinary multer middleware for `POST /api/doctors/:id/photo`; wire all 9 endpoints from `contracts/doctors.md`

  **Layer**: BE | **Est**: 2h | **Deps**: T034, T024
  **AC**: `GET /api/doctors` public — no auth required; `POST /api/doctors` without admin JWT returns 403; `DELETE /api/doctors/:id` for a doctor with 0 future appointments returns 200; photo upload to Cloudinary returns `profilePhotoUrl` with `res.cloudinary.com` domain

- [ ] T036 [US1] [BE] Create slot generation algorithm in `backend/src/features/appointments/appointments.service.ts::getAvailableSlots(doctorId, date)`: load schedule → subtract unavailability blocks → generate times → subtract confirmed appointments → subtract active `SlotHold` docs

  **Layer**: BE | **Est**: 3h | **Deps**: T033, T009
  **AC**: For a doctor with schedule `Mon 09:00–12:00` 30-min slots: `getAvailableSlots(id, "2026-04-21")` returns `["09:00","09:30","10:00","10:30","11:00","11:30"]`; a confirmed appointment at 10:00 removes that slot; an active `SlotHold` at 10:30 removes that slot; a `UnavailabilityBlock` covering the date returns empty array

- [ ] T037 [US1] [BE] Create `SlotHold` Mongoose schema with TTL index (`expiresAt`, `expireAfterSeconds: 0`) and unique compound index `{ doctorId, appointmentDateTime }`; write failing concurrency integration test in `backend/tests/integration/appointments.test.ts`: two simultaneous `POST /api/appointments/hold` for same slot → exactly one 201, one 409

  **Layer**: BE | **Est**: 3h | **Deps**: T036
  **AC**: Concurrency test passes: `Promise.all([holdReq1, holdReq2])` yields `[201, 409]` (order may vary); TTL index visible in `db.slotHolds.getIndexes()`; a `SlotHold` document created with `expiresAt: now` is deleted by MongoDB within 60 s

- [ ] T038 [US1] [BE] Implement `POST /api/appointments/hold` endpoint and `POST /api/appointments/confirm` (internal, called by payment webhook); create `Appointment` Mongoose schema with `bookingRef` auto-generation (`IBN-YYYY-NNNNN` sequential); mount appointments router at `/api/appointments`

  **Layer**: BE | **Est**: 3h | **Deps**: T037, T017
  **AC**: T037 concurrency test now passes green; `confirm` atomically: deletes `SlotHold` + inserts `Appointment` in a single transaction (use MongoDB session); `bookingRef` is unique and human-readable; audit log entry created on confirm

- [ ] T039 [US1] [BE] Create `Payment` Mongoose schema; implement `PaymentService` in `backend/src/features/payments/payments.service.ts` with adapter pattern: `HyperPayAdapter` and `StripeAdapter` both implementing `PaymentGateway` interface; write failing payment webhook test in `backend/tests/integration/payments.test.ts`

  **Layer**: BE | **Est**: 4h | **Deps**: T038
  **AC**: Calling `service.initiate({ gateway: 'hyperpay', ... })` returns a `checkoutId`; calling with `gateway: 'stripe'` returns a `clientSecret`; forged webhook signature to `POST /api/payments/webhook/hyperpay` returns 401 (signature verification test passes); successful webhook triggers `appointments/confirm` and sends notification

- [ ] T040 [US1] [BE] Create payments router and mount webhook endpoints `POST /api/payments/webhook/hyperpay` and `POST /api/payments/webhook/stripe`; `POST /api/payments/initiate`; `GET /api/payments/:id`; `GET /api/payments/:id/receipt` (Puppeteer PDF stream)

  **Layer**: BE | **Est**: 3h | **Deps**: T039, T025
  **AC**: T039 tests pass green; receipt PDF streams with `Content-Type: application/pdf`; Arabic text in PDF is right-to-left (verify visually); webhook endpoints respond 200 even on processing error (to prevent gateway retries); `paymentId` stored on `Appointment` after confirm

### [US1] Backend — Notifications Seeding

- [ ] T041 [P] [US1] [BE] Extend `notifications/email.service.ts` with `sendBookingConfirmation(appointment, language)` and `sendCancellationConfirmation(appointment, language)` templates; extend `sms.service.ts` with equivalent SMS messages in Arabic and English

  **Layer**: BE | **Est**: 2h | **Deps**: T025, T038
  **AC**: `sendBookingConfirmation` called with `language: 'ar'` sends email with Arabic subject and body; Mailtrap receives email in dev; SMS mock logs the Arabic message; booking reference number appears in both email and SMS

### [US1] Frontend — Public Booking Flow

- [ ] T042 [P] [US1] [FE] Build `DoctorsDirectoryPage` in `frontend/src/features/public/pages/DoctorsDirectoryPage.tsx`: specialty filter chips, search input, doctor cards grid with RTL layout, TanStack Query fetching `GET /api/doctors`, skeleton loading, empty state

  **Layer**: FE | **Est**: 3h | **Deps**: T027, T028, T029
  **AC**: Page renders in RTL at 375 px with no horizontal overflow; specialty filter chips wrap correctly; search input has Arabic placeholder from i18n; selecting "Cardiology" refetches with `specialtyId` filter; skeleton cards shown during load; uses `useTranslation('public')` exclusively

- [ ] T043 [P] [US1] [FE] Build `DoctorProfilePage` in `frontend/src/features/public/pages/DoctorProfilePage.tsx`: doctor hero section, bilingual bio, qualifications list, consultation fee in SAR, interactive date picker (next 30 days), slot grid fetching `GET /api/appointments/slots` every 5 s

  **Layer**: FE | **Est**: 4h | **Deps**: T042
  **AC**: Slots polling updates every 5 s (TanStack Query `refetchInterval: 5000`); unavailable slots rendered as disabled buttons with correct ARIA `aria-disabled="true"`; date picker disables past dates and Fridays/Saturdays when doctor has no Friday/Saturday schedule; fee displayed as `١٥٠ ر.س` in AR locale and `SAR 150` in EN locale

- [ ] T044 [US1] [FE] Build `BookingPage` in `frontend/src/features/appointments/pages/BookingPage.tsx`: display selected doctor + slot summary, patient info form (nameAr, phone, nationalId) with react-hook-form + zod validation, "Proceed to Payment" button calling `POST /api/appointments/hold`

  **Layer**: FE | **Est**: 3h | **Deps**: T043, T026, T027
  **AC**: Form validation errors shown in Arabic by default (from `ar/appointments.json`); national ID field accepts exactly 10 digits; phone field validates E.164 Saudi format; on successful hold, `sessionRef` and `holdId` stored in sessionStorage; "Proceed to Payment" disabled while loading

- [ ] T045 [US1] [FE] Build `CheckoutPage` in `frontend/src/features/payments/pages/CheckoutPage.tsx`: fee summary card, 10-min countdown timer (slot hold expiry), HyperPay widget embed (primary) and Stripe Elements component (secondary/fallback), calling `POST /api/payments/initiate`

  **Layer**: FE | **Est**: 4h | **Deps**: T044, T026
  **AC**: Countdown timer redirects to doctor profile page on expiry with "slot expired" toast; HyperPay widget script loaded dynamically only on this page; widget rendered inside an accessible `<section>` with ARIA label; `checkoutId` fetched from backend before script load; page works correctly in RTL (HyperPay widget dir tested)

- [ ] T046 [US1] [FE] Build `ConfirmationPage` in `frontend/src/features/appointments/pages/ConfirmationPage.tsx`: booking reference display, doctor + date + time summary, "Create Account" prompt with pre-filled email, SMS/email sent confirmation message, "Back to Home" link

  **Layer**: FE | **Est**: 2h | **Deps**: T045
  **AC**: Booking reference (`IBN-2026-NNNNN`) displayed prominently; "Create Account" button navigates to `/auth/register?bookingRef=IBN-...&email=...` pre-filling those fields; page accessible without login; all text via i18n

- [ ] T047 [P] [US1] [FE] Build `ServicesPage` in `frontend/src/features/public/pages/ServicesPage.tsx` and `HomePage` in `frontend/src/features/public/pages/HomePage.tsx`: hero section (content from `GET /api/content/public`), featured specialties grid, stats bar, "Book Now" CTA

  **Layer**: FE | **Est**: 3h | **Deps**: T028, T026
  **AC**: Hero title renders from `contentBlocks.hero.title` in selected language; `GET /api/content/public?keys[]=hero.title` called with TanStack Query `staleTime: 30_000`; "Book Now" button navigates to `/doctors`; page passes Lighthouse mobile score ≥ 85 on first measurement

### [US1] Integration

- [ ] T048 [US1] [INT] Wire full booking flow end-to-end: seed a doctor with schedule, run Playwright E2E test `frontend/tests/e2e/booking-flow.ar.spec.ts` in Arabic locale — visit homepage → doctors → doctor profile → booking form → checkout (HyperPay sandbox card) → confirmation page

  **Layer**: INT | **Est**: 4h | **Deps**: T040, T046
  **AC**: E2E test passes in Arabic locale: page dir is `rtl` throughout; booking reference appears on confirmation page; Mailtrap receives Arabic confirmation email; slot no longer appears in `GET /api/appointments/slots` after booking; entire flow completes in < 5 min (SC-001)

- [ ] T049 [US1] [INT] Run same E2E booking flow in English locale as `frontend/tests/e2e/booking-flow.en.spec.ts`; verify no Arabic-only strings visible in English mode (SC-003)

  **Layer**: INT | **Est**: 1.5h | **Deps**: T048
  **AC**: Test passes; browser language switcher to English before booking; confirmation email received in English; fee displayed as `SAR 150`; zero "missing translation" warnings in browser console

**✅ Checkpoint (US1)**: Patient booking flow fully functional in both locales. Test: New visitor books appointment in < 5 min.

---

## Phase 4 — User Story 2: Patient Portal (Week 3–4)

**Goal**: Registered patients self-manage appointments, view history, download receipts
**Independent Test**: Patient logs in, views all appointments, opens detail with doctor notes, downloads receipt — no staff contact needed (SC-009)

### [US2] Backend — Patient API

- [ ] T050 [P] [US2] [BE] Implement patient profile endpoints in `backend/src/features/patients/patients.service.ts`: `getProfile(userId)`, `updateProfile(userId, dto)`, `uploadPhoto(userId, file)` → Cloudinary; create patients router at `/api/patients`, mount behind `requireRole('patient')`

  **Layer**: BE | **Est**: 2h | **Deps**: T024, T035
  **AC**: `GET /api/patients/me` with doctor JWT returns 403; profile update rejects attempts to change `email`, `nationalId`, or `role`; photo upload returns Cloudinary URL; audit log entry created on profile update

- [ ] T051 [P] [US2] [BE] Implement `GET /api/patients/me/appointments` with cursor pagination (default 20), status filter; implement `GET /api/patients/me/appointments/:id` returning full appointment + consultation note (if exists) + payment status

  **Layer**: BE | **Est**: 2h | **Deps**: T038, T050
  **AC**: Patient A cannot access patient B's appointments (returns 404 not 403 — no information leakage); cursor pagination: `hasMore: true` when > 20 results; `consultationNote` field is `null` if doctor hasn't added notes yet; `payment.status` reflects latest payment state

- [ ] T052 [US2] [BE] Implement `GET /api/patients/me/history` returning chronological list of past appointments with notes; implement `GET /api/patients/me/receipts/:paymentId` generating and streaming PDF via Puppeteer with RTL Arabic content + SAR formatting

  **Layer**: BE | **Est**: 3h | **Deps**: T051, T040
  **AC**: History endpoint excludes `pending-payment` and `cancelled` appointments; PDF renders Arabic text right-to-left (verified by opening generated PDF); PDF contains booking reference, doctor name in Arabic, date in Hijri + Gregorian, amount in SAR; patient B cannot download patient A's receipt (403)

- [ ] T053 [US2] [BE] Implement `PUT /api/appointments/:id/cancel` for patient role: enforce 24-hour window (`appointmentDateTime - now < 86400s` → 403 `CANCELLATION_WINDOW_CLOSED`); free the slot; trigger cancellation email + SMS; write integration test covering both in-window and out-of-window scenarios

  **Layer**: BE | **Est**: 2.5h | **Deps**: T051, T041
  **AC**: Cancelling 25 hours before appointment → 200, status becomes `cancelled`, slot freed (reappears in `GET /api/appointments/slots`); cancelling 23 hours before → 403 with error `CANCELLATION_WINDOW_CLOSED`; cancellation notification sent in patient's preferred language

### [US2] Frontend — Patient Portal

- [ ] T054 [P] [US2] [FE] Build `PatientDashboardPage` in `frontend/src/features/patient/pages/PatientDashboardPage.tsx`: next upcoming appointment card, quick stats (total past appointments), recent activity; layout uses `PortalLayout` with patient nav sidebar

  **Layer**: FE | **Est**: 2h | **Deps**: T028, T030
  **AC**: Dashboard shows "No upcoming appointments" state when none exist; upcoming appointment card links to appointment detail page; patient name in header rendered in `preferredLanguage` (Arabic or English); sidebar navigation items use `useTranslation('patient')`

- [ ] T055 [P] [US2] [FE] Build `AppointmentsListPage` in `frontend/src/features/patient/pages/AppointmentsListPage.tsx`: tab filter (Upcoming / Past / All), appointment cards with status badge, doctor info, date/time, "Cancel" button (with 24h policy warning modal), cursor-based infinite scroll

  **Layer**: FE | **Est**: 3h | **Deps**: T054, T027
  **AC**: Status badges use semantic colors (confirmed=green, cancelled=red, completed=blue); "Cancel" button disabled for appointments within 24 h with tooltip explaining policy; cancellation modal shows policy text from i18n before confirming; infinite scroll loads next page on scroll to bottom

- [ ] T056 [US2] [FE] Build `AppointmentDetailPage` in `frontend/src/features/patient/pages/AppointmentDetailPage.tsx`: full appointment info, doctor notes section (shown when available, "Notes not yet added" when empty), payment status, receipt download button calling `GET /api/patients/me/receipts/:paymentId`

  **Layer**: FE | **Est**: 2.5h | **Deps**: T055, T026
  **AC**: Receipt download button shows spinner during PDF generation (can take 2–3 s); downloaded file named `receipt-IBN-2026-NNNNN.pdf`; doctor notes displayed in a read-only styled card; "Notes not yet added" message shown when `consultationNote: null`; page accessible with keyboard-only navigation

- [ ] T057 [P] [US2] [FE] Build `MedicalHistoryPage` in `frontend/src/features/patient/pages/MedicalHistoryPage.tsx`: chronological accordion list, each entry shows doctor, specialty, date, note preview (truncated at 150 chars); `ProfilePage` with editable form + avatar upload

  **Layer**: FE | **Est**: 2.5h | **Deps**: T054, T027
  **AC**: Accordion expands to show full note text; dates rendered in both Hijri and Gregorian format (`useTranslation` + date-fns-jalali or equivalent); avatar upload previews before submitting; profile save shows success toast; empty history shows bilingual "No consultation history" message

### [US2] Integration

- [ ] T058 [US2] [INT] Write Playwright test `frontend/tests/e2e/patient-portal.spec.ts`: register new account, verify email (mock), log in, view appointments list, open appointment detail (from seeded data), download receipt, cancel upcoming appointment

  **Layer**: INT | **Est**: 3h | **Deps**: T057, T053
  **AC**: E2E test passes in Arabic locale; receipt PDF download completes (file size > 0); after cancel, appointment moves from "Upcoming" to "Cancelled" tab without page reload; cancellation notification logged in mock SMS

**✅ Checkpoint (US2)**: Patient portal fully functional. Test: Registered patient manages all appointments independently.

---

## Phase 5 — User Story 3: Admin Dashboard (Week 5–6)

**Goal**: Full operational control — appointments CRUD, doctor management, patient lookup, analytics, roles, content editing
**Independent Test**: Admin adds new doctor with schedule → slots appear on public site within 1 min (SC-006)

### [US3] Backend — Admin & Analytics

- [ ] T059 [P] [US3] [BE] Implement `GET /api/admin/appointments` with advanced filters (date range, doctorId, patientId, status, text search) and cursor pagination; implement `PUT /api/admin/appointments/:id/reschedule` with slot-availability validation and patient notification

  **Layer**: BE | **Est**: 3h | **Deps**: T038, T024
  **AC**: Admin can filter appointments by doctorId + date range simultaneously; rescheduling to an already-held slot returns 409; successful reschedule triggers patient notification; receptionist JWT on `GET /api/admin/appointments` returns 200; receptionist JWT on reschedule returns 403

- [ ] T060 [P] [US3] [BE] Implement admin patient search `GET /api/admin/patients?search=` searching across `nameAr`, `nameEn`, `nationalId`, `phone` fields; `GET /api/admin/patients/:id` returning profile + last 10 appointments; apply `requireRole('admin', 'receptionist')` guard

  **Layer**: BE | **Est**: 2h | **Deps**: T050, T024
  **AC**: Search for partial nationalId "1234" returns all patients with nationalId containing "1234"; receptionist can access patient search; receptionist cannot access `GET /api/admin/users`; patient clinical notes visible to admin (read-only)

- [ ] T061 [P] [US3] [BE] Implement user management endpoints in `backend/src/features/admin/admin.service.ts`: `GET /api/admin/users`, `POST /api/admin/users` (create Admin/Receptionist with temp password + email), `PUT /api/admin/users/:id` (role change + deactivate); guard: admin cannot deactivate self

  **Layer**: BE | **Est**: 2.5h | **Deps**: T022, T024
  **AC**: Creating a Receptionist account sends temp-password email; admin cannot set their own `isActive: false`; `PUT /api/admin/users/:id` with `role: 'patient'` returns 400 `INVALID_ROLE`; audit log entry created on every user modification

- [ ] T062 [US3] [BE] Implement MongoDB aggregation pipelines in `backend/src/features/analytics/analytics.service.ts`: `getSummary(from, to)` → total appointments, revenue, new patients; `getByDay(from, to)` → daily time series; `getBySpecialty(from, to)` → specialty breakdown; mount at `/api/analytics` behind `requireRole('admin')`

  **Layer**: BE | **Est**: 4h | **Deps**: T038, T039
  **AC**: `getSummary` for a date range with 5 completed appointments totalling SAR 750 returns `{ totalAppointments: 5, totalRevenueSAR: 750 }`; `getByDay` returns one entry per day in range (including zero-count days); `getBySpecialty` excludes cancelled appointments from revenue; receptionist JWT on analytics returns 403

- [ ] T063 [P] [US3] [BE] Implement `ContentBlock` Mongoose schema and seed default blocks from `contracts/content.md` key namespace; implement `GET /api/content/public` (public, Cache-Control 30 s) and `PUT /api/content/:key` (admin only); implement `GET /api/services`, `POST /api/services`, `PUT /api/services/:id`

  **Layer**: BE | **Est**: 2.5h | **Deps**: T009, T024
  **AC**: `GET /api/content/public?keys[]=hero.title` returns AR + EN values; `PUT /api/content/hero.title` with receptionist JWT returns 403; `GET /api/content/public` response has `Cache-Control: public, max-age=30` header; seed is idempotent

### [US3] Frontend — Admin Dashboard

- [ ] T064 [P] [US3] [FE] Build `AdminOverviewPage` in `frontend/src/features/admin/pages/AdminOverviewPage.tsx`: KPI cards (today's appointments, revenue MTD, new patients this month) fetching from `/api/analytics/summary`; quick links to each section; using `AdminLayout`

  **Layer**: FE | **Est**: 2h | **Deps**: T028, T030
  **AC**: KPI cards render with Arabic numerals in AR locale (٤٢ not 42) and Western numerals in EN; skeleton loading state during data fetch; zero state renders "No data for selected period"; admin role shows all nav items; receptionist role shows only Appointments + Patients nav items

- [ ] T065 [US3] [FE] Build `AdminAppointmentsPage` in `frontend/src/features/admin/pages/AdminAppointmentsPage.tsx`: data table with columns (ref, patient, doctor, date, status, actions), multi-filter bar (date range, doctor select, status select, patient search), "Reschedule" slide-over modal with slot picker, "Cancel" action with reason field

  **Layer**: FE | **Est**: 4h | **Deps**: T064, T027
  **AC**: Table supports column-level sorting by date; reschedule modal shows available slots for same doctor; cancellation from admin dashboard does not have the 24 h restriction (admin can cancel anytime); table is keyboard navigable; all filter labels from i18n

- [ ] T066 [P] [US3] [FE] Build `DoctorsManagementPage` in `frontend/src/features/admin/pages/DoctorsManagementPage.tsx`: doctor cards grid with edit/deactivate actions; "Add Doctor" drawer form (bilingual name, specialty select, bio, fee, photo upload); deactivation warning modal listing affected appointments

  **Layer**: FE | **Est**: 4h | **Deps**: T064, T027
  **AC**: "Add Doctor" form validates both `nameAr` and `nameEn` as required; photo upload shows preview before submitting; deactivation warning modal lists appointment bookingRefs; successful add → card appears in grid without page reload (TanStack Query invalidation); specialty dropdown fetches from `GET /api/services`

- [ ] T067 [US3] [FE] Build `DoctorSchedulePage` (admin view) in `frontend/src/features/admin/pages/DoctorSchedulePage.tsx`: weekly schedule builder (7 day toggles + start/end time + slot duration per day), vacation block form (date range picker + reason), existing blocks list with delete action

  **Layer**: FE | **Est**: 3h | **Deps**: T066
  **AC**: Saving a schedule immediately affects slot availability on public doctor profile page (TanStack Query cache invalidated); adding a vacation block for next week removes those slots from public booking within 30 s; date range picker disables past dates; schedule builder renders correctly in RTL

- [ ] T068 [P] [US3] [FE] Build `PatientsManagementPage` in `frontend/src/features/admin/pages/PatientsManagementPage.tsx`: searchable table (name, nationalId, phone), patient detail slide-over (profile info + last 10 appointments read-only); build `UserRolesPage` with staff accounts table + create account modal

  **Layer**: FE | **Est**: 3h | **Deps**: T064, T027
  **AC**: Search debounced 300 ms before API call; patient detail slide-over opens inline without navigation; clinical notes visible to admin in read-only card; receptionist does not see UserRolesPage in nav; creating new Receptionist shows success toast with "Temp password emailed" message

- [ ] T069 [US3] [FE] Build `AnalyticsPage` in `frontend/src/features/admin/pages/AnalyticsPage.tsx`: date range picker (preset: Today / This Week / This Month / Custom), KPI summary cards, line chart (daily appointments + revenue via recharts), specialty donut chart

  **Layer**: FE | **Est**: 3.5h | **Deps**: T064, T027
  **AC**: Charts render correctly in RTL (x-axis labels right-to-left for Arabic locale); revenue amounts display in SAR with correct locale formatting; custom date range limited to max 90 days; empty state renders "No data" message; charts are accessible (aria-label on SVG containers)

- [ ] T070 [US3] [FE] Build `ContentManagementPage` in `frontend/src/features/content/pages/ContentManagementPage.tsx`: accordion sections (Homepage, Services, Contact), each section has inline bilingual text editors (Arabic + English textarea pair), "Save" button per section calling `PUT /api/content/:key`

  **Layer**: FE | **Est**: 2.5h | **Deps**: T064, T027
  **AC**: After saving "hero.title" change, public `HomePage` reflects the new text within 30 s (TanStack Query `staleTime: 30_000`); Arabic textarea has `dir="rtl"` attribute; "Save" button shows spinner and disables during request; success toast confirms save

### [US3] Integration

- [ ] T071 [US3] [INT] Integration smoke test: admin logs in → adds doctor with Mon–Thu 09:00–17:00 schedule → navigates to public doctor profile → verifies slots appear for next Monday; admin blocks vacation → verifies next Monday slots disappear within 30 s

  **Layer**: INT | **Est**: 2h | **Deps**: T070, T067, T043
  **AC**: Playwright test `admin-doctor-schedule.spec.ts` passes; slot appearance after schedule creation < 60 s (SC-006); slot disappearance after vacation block < 30 s; test verifiable in both Arabic and English locales

**✅ Checkpoint (US3)**: Admin dashboard fully operational. Test: Admin adds doctor with schedule → public slots appear within 1 min.

---

## Phase 6 — User Story 4: Doctor Portal (Week 6–7)

**Goal**: Doctor sees daily schedule, reviews patient info, writes consultation notes, marks appointments complete
**Independent Test**: Doctor logs in, writes notes for all today's appointments, marks completed — without admin assistance

### [US4] Backend

- [ ] T072 [P] [US4] [BE] Implement `GET /api/appointments?role=doctor` scoped to logged-in doctor; implement `GET /api/appointments/:id` for doctor role returning patient snapshot + this doctor's previous notes for this patient; apply `requireRole('doctor')` guard

  **Layer**: BE | **Est**: 2h | **Deps**: T038, T024
  **AC**: Doctor A's token on `GET /api/appointments/:id` for a Doctor B appointment returns 403; endpoint returns `consultationNote` (this doctor only) and `patientHistory` (previous appointments with this same doctor only, sorted desc); other doctors' notes not included

- [ ] T073 [US4] [BE] Implement `POST /api/appointments/:id/notes` creating or updating `ConsultationNote`; enforce 24-hour edit window (`editableUntil = createdAt + 24h`); after window closes, `PUT` returns 403 `NOTE_EDIT_WINDOW_CLOSED`; `PUT /api/appointments/:id/status` for doctor setting `completed`

  **Layer**: BE | **Est**: 2.5h | **Deps**: T072
  **AC**: Integration test: create note at T=0, update at T=23h succeeds, update at T=25h returns 403; marking appointment `completed` triggers status update visible immediately in `GET /api/appointments/:id`; audit log entry created on note save; only assigned doctor can add notes to that appointment

### [US4] Frontend — Doctor Portal

- [ ] T074 [P] [US4] [FE] Build `DoctorSchedulePage` in `frontend/src/features/doctor/pages/DoctorSchedulePage.tsx`: today's appointment list (sorted by time), appointment status badges, calendar nav to future dates (read-only), using `PortalLayout` with doctor nav

  **Layer**: FE | **Est**: 2.5h | **Deps**: T028, T030
  **AC**: Calendar shows only future dates as navigable (past dates disabled); today's date highlighted; appointment list empty state shows "No appointments today"; auto-refreshes every 60 s (TanStack Query `refetchInterval: 60_000`); all UI strings via `useTranslation('doctor')`

- [ ] T075 [US4] [FE] Build `PatientDetailPage` in `frontend/src/features/doctor/pages/PatientDetailPage.tsx`: patient info panel (name, age, gender, phone), previous consultations accordion (this doctor only), note editor textarea (auto-disabled after 24 h with `editableUntil` countdown), "Save Notes" button, "Mark Completed" button

  **Layer**: FE | **Est**: 3h | **Deps**: T074, T027
  **AC**: Note editor shows remaining edit time ("2h 15m remaining" countdown); note editor becomes `disabled` + grey after `editableUntil` passes without page reload (timer-based); "Mark Completed" shows confirmation dialog before API call; marking completed updates status badge on parent schedule page via TanStack Query invalidation

### [US4] Integration

- [ ] T076 [US4] [INT] Playwright test `doctor-portal.spec.ts`: doctor logs in → views today's schedule → opens first appointment → writes note → saves → marks completed → patient logs in to portal → verifies note visible under that appointment

  **Layer**: INT | **Est**: 2.5h | **Deps**: T075, T056
  **AC**: Full cross-role test passes; note created by doctor is visible to patient within 5 s of save; appointment status `completed` reflected in patient portal appointment list; doctor cannot see other doctors' notes on shared patient

**✅ Checkpoint (US4)**: Doctor portal fully functional. Test: Doctor documents all daily appointments independently.

---

## Phase 7 — Polish & Cross-Cutting Concerns (Week 7–8)

**Purpose**: RTL/WCAG audit, performance, security, observability hardening, deployment

### RTL & Accessibility Audit (US5)

- [ ] T077 [P] [FE] Complete all i18n translation files: fill all missing keys in `frontend/src/i18n/ar/*.json` and `en/*.json` for all 7 namespaces; add Hijri date formatting utility in `frontend/src/shared/utils/date.ts` using `date-fns-jalali` or Intl API; add SAR currency formatter

  **Layer**: FE | **Est**: 3h | **Deps**: T031, T042, T054, T064, T074
  **AC**: Zero missing-translation warnings in browser console in both locales; `formatDate(date, 'ar')` returns `"٢٥ رمضان ١٤٤٧ / ٢٥ أبريل ٢٠٢٦"`; `formatCurrency(150, 'ar')` returns `"١٥٠ ر.س"`; ESLint rule `i18next/no-literal-string` active

- [ ] T078 [FE] RTL visual regression audit: open every page in Chrome with `dir="rtl"` at 375 px and 1440 px; fix all logical-property violations (replace `text-left` → `text-start`, `pl-4` → `ps-4`, `margin-left` → `margin-inline-start`); verify form inputs, tables, modals, dropdowns all mirror correctly

  **Layer**: FE | **Est**: 4h | **Deps**: T077
  **AC**: Zero `margin-left`, `margin-right`, `padding-left`, `padding-right`, `text-left`, `text-right` in component files (ESLint `no-restricted-properties` rule or manual audit); all pages verified at 375 px RTL with no overflow; navigation arrow icons flip direction in RTL

- [ ] T079 [FE] WCAG 2.1 AA audit using axe-core: add `@axe-core/react` in dev mode; run `axe` CLI on all public pages in both locales; fix all critical and serious violations (color contrast, ARIA, focus management)

  **Layer**: FE | **Est**: 3h | **Deps**: T078
  **AC**: `axe` reports zero critical or serious violations on: HomePage, DoctorsDirectoryPage, DoctorProfilePage, BookingPage, CheckoutPage, PatientDashboardPage; all interactive elements have visible focus rings; color contrast ratio ≥ 4.5:1 for text (WCAG AA)

- [ ] T080 [P] [INT] Run NVDA screen-reader test on booking flow and patient portal in Arabic: verify all form fields announced with correct Arabic labels, booking confirmation announced, appointment list navigable by list traversal

  **Layer**: INT | **Est**: 2h | **Deps**: T079
  **AC**: NVDA reads "اسم المريض" for patient name field; appointment status badge announced as "مؤكد" (confirmed) in Arabic; all modal close buttons announced with Arabic label; test documented in `specs/001-ibn-sina-platform/checklists/accessibility.md`

### Performance

- [ ] T081 [BE] Add MongoDB compound indexes from `data-model.md` index strategy to all schemas if not already present; run `explain()` on top 5 query patterns and document results in `specs/001-ibn-sina-platform/checklists/performance.md`

  **Layer**: BE | **Est**: 2h | **Deps**: T036, T038, T062
  **AC**: `explain("executionStats")` on `appointments` query shows `IXSCAN` not `COLLSCAN`; `getAvailableSlots` query time < 50 ms with 1000 appointment documents; all indexes verified with `db.collection.getIndexes()`

- [ ] T082 [P] [FE] Add Vite dynamic imports for all feature route groups (`React.lazy`); verify bundle sizes with `vite-bundle-visualizer`; ensure admin chunk not loaded for public pages; configure Cloudinary `srcset` for doctor photos

  **Layer**: FE | **Est**: 2h | **Deps**: T029
  **AC**: Public bundle (homepage + doctors) < 200 KB gzipped; admin chunk not in Network tab when visiting public pages; doctor photos use `srcset` with Cloudinary responsive transforms; Lighthouse mobile score ≥ 85 on `DoctorsDirectoryPage`

### Security Hardening

- [ ] T083 [BE] Run `npm audit` — resolve all high/critical vulnerabilities; run OWASP ZAP baseline scan against staging URL; document findings in `specs/001-ibn-sina-platform/checklists/security.md`

  **Layer**: BE | **Est**: 3h | **Deps**: All BE tasks
  **AC**: `npm audit` exits with code 0; ZAP scan shows zero High alerts; JWT RS256 key rotation procedure documented; refresh token revocation tested manually

- [ ] T084 [BE] Security penetration checklist execution: (1) forged JWT → 401, (2) RBAC bypass via direct URL → 403, (3) concurrent slot hold race → one 201 + one 409, (4) forged payment webhook signature → 401, (5) NoSQL injection via booking form → sanitized, (6) XSS via content editor → escaped, (7) brute force login 6× → 429

  **Layer**: BE | **Est**: 3h | **Deps**: T083
  **AC**: All 7 checklist items pass; results documented in `checklists/security.md`; access-control matrix reviewed and signed off

### DevOps & Deployment

- [ ] T085 [OPS] Create `backend/Dockerfile` (Node 20 Alpine, multi-stage build: deps → build → prod); create `docker-compose.yml` for local dev with MongoDB + backend; configure `backend/.dockerignore`

  **Layer**: OPS | **Est**: 2h | **Deps**: T006
  **AC**: `docker build -t ibn-sina-backend .` succeeds; `docker-compose up` starts backend + MongoDB; `GET localhost:4000/api/health` returns 200 from inside Docker; image size < 300 MB

- [ ] T086 [OPS] Configure Vercel project for `frontend/`: set `VITE_API_BASE_URL` to production backend URL, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_HYPERPAY_SCRIPT_URL`; configure `vercel.json` with SPA rewrite rule (`/* → /index.html`)

  **Layer**: OPS | **Est**: 1.5h | **Deps**: T010
  **AC**: `vercel deploy --prod` succeeds; navigating directly to `/doctors` (not via SPA link) returns the app not a 404; `VITE_API_BASE_URL` points to Railway/VPS production URL

- [ ] T087 [OPS] Configure Railway (or VPS) for backend deployment: set all production env vars as Railway secrets; configure health check to `GET /api/health`; set `NODE_ENV=production`; configure MongoDB Atlas M10 cluster in Bahrain region with IP allowlist for Railway egress IPs

  **Layer**: OPS | **Est**: 3h | **Deps**: T085
  **AC**: `GET https://api.ibnsina.sa/api/health` returns 200; `GET /api/health/db` shows `latencyMs < 100` from Bahrain Atlas; no stack traces in production error responses; `NODE_ENV === 'production'` verified in logs

- [ ] T088 [OPS] Configure MongoDB Atlas: enable encryption at rest, set 10-year backup retention policy, configure `mongodump` snapshot schedule daily, enable Atlas audit logging for admin actions, create read-only analytics user

  **Layer**: OPS | **Est**: 2h | **Deps**: T087
  **AC**: Atlas dashboard shows "Encryption at Rest: Enabled"; backup policy shows daily snapshots retained 365 days (long-term via export strategy for 10-year requirement); audit log enabled in Atlas project settings; data residency confirmed as `me-south-1` (Bahrain)

- [ ] T089 [P] [OPS] Configure Cloudinary account: create `ibn-sina` cloud name, set upload presets (auto-format WebP, auto-quality, max 1200 px width), restrict unsigned uploads, enable KSA-adjacent delivery

  **Layer**: OPS | **Est**: 1h | **Deps**: T035
  **AC**: Doctor photo upload returns WebP format URL; unsigned upload to Cloudinary without API key returns 401; image served via Cloudinary CDN with `auto` quality suffix in URL

- [ ] T090 [OPS] Configure production monitoring: set up UptimeRobot (or equivalent) monitoring `GET /api/health/db` every 5 min; configure alert email to admin on 2 consecutive failures; document incident response procedure in `docs/incident-response.md`

  **Layer**: OPS | **Est**: 2h | **Deps**: T087
  **AC**: UptimeRobot dashboard shows backend as "Up"; stopping backend triggers email alert within 10 min; `docs/incident-response.md` exists with: escalation contacts, rollback procedure, data breach steps

- [ ] T091 [OPS] Configure Stripe CLI for webhook forwarding in local dev (`stripe listen --forward-to localhost:4000/api/payments/webhook/stripe`); configure HyperPay sandbox webhook URL pointing to ngrok/localtunnel for local testing; document in `quickstart.md`

  **Layer**: OPS | **Est**: 1h | **Deps**: T040
  **AC**: Local webhook test: trigger HyperPay sandbox success → appointment confirmed in local DB; Stripe CLI forwards webhook → appointment confirmed; `quickstart.md` updated with webhook setup instructions

### Final Validation

- [ ] T092 [INT] Full platform E2E regression run: execute all Playwright specs (`booking-flow.ar`, `booking-flow.en`, `patient-portal`, `admin-doctor-schedule`, `doctor-portal`) against staging environment; all must pass before production deploy

  **Layer**: INT | **Est**: 2h | **Deps**: T048, T049, T058, T071, T076
  **AC**: All 5 E2E test files pass on staging; zero test failures; test report archived in CI artifacts; staging uses production MongoDB Atlas cluster with separate database (`ibn-sina-staging`)

- [ ] T093 [INT] Execute pre-launch access-control matrix review: sign off that Receptionist cannot access Analytics/Doctors/Content/Roles; Patient cannot access Admin or Doctor portals; Doctor cannot access Admin portal or other doctors' patient notes; Admin can access all sections

  **Layer**: INT | **Est**: 1.5h | **Deps**: T024, T092
  **AC**: All 12 role-resource combinations in RBAC matrix tested manually or by automated test; sign-off documented in `specs/001-ibn-sina-platform/checklists/security.md`; no workarounds or hardcoded role bypasses in frontend route guards

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No deps — start immediately. T001–T013 can mostly run in parallel.
- **Phase 2 (Foundation)**: Depends on Phase 1 complete. Blocks ALL user story phases.
- **Phase 3 (US1)**: Depends on Phase 2 complete. Can proceed in parallel with Phase 4 if staffed.
- **Phase 4 (US2)**: Depends on Phase 2 + Phase 3 (payments, appointments BE).
- **Phase 5 (US3)**: Depends on Phase 2 + Phase 3 BE (appointments, doctors, payments all exist).
- **Phase 6 (US4)**: Depends on Phase 3 BE (appointments + notes endpoints).
- **Phase 7 (Polish)**: Depends on Phases 3–6 all complete.

### User Story Dependencies

| Story | Phase | Can Start After | Independent? |
|---|---|---|---|
| US1 — Booking | Phase 3 | Phase 2 complete | Yes — first story |
| US2 — Patient Portal | Phase 4 | Phase 2 + US1 booking BE | Yes — no US1 FE dependency |
| US3 — Admin | Phase 5 | Phase 2 + US1 BE (doctors, appointments, payments) | Yes — own FE module |
| US4 — Doctor Portal | Phase 6 | Phase 2 + US1 appointments BE | Yes — own FE module |
| US5 — i18n/RTL | Phase 7 | All other stories | Polish phase — horizontal concern |

### Critical Path

```
T001–T013 (Setup)
    ↓
T014–T031 (Foundation: auth, RBAC, middleware, base UI)
    ↓
T032–T049 (US1: booking flow — longest chain, unlocks all other stories)
    ↓
T050–T058 (US2) ──┐
T059–T071 (US3) ──┤── All can overlap if team size allows
T072–T076 (US4) ──┘
    ↓
T077–T093 (Polish, RTL, security, deployment)
```

### Parallel Opportunities Within Phase 3 (US1)

```
# Backend and Frontend can proceed in parallel once API contracts are signed:
Backend: T032 → T033 → T034 → T035 (doctors)
         T036 → T037 → T038 (slots + hold)
         T039 → T040 (payments)

Frontend: T042 → T043 → T044 → T045 → T046 (booking flow pages)
          T047 (home + services — fully independent)

Integration: T048, T049 (after both BE + FE complete)
```

---

## Implementation Strategy

### MVP First (US1 Only — Week 1–3)

1. Complete Phase 1: Setup (T001–T013)
2. Complete Phase 2: Foundation (T014–T031) — **CRITICAL, blocks all stories**
3. Complete Phase 3: US1 Booking Flow (T032–T049)
4. **STOP and VALIDATE** (SC-001): New patient books appointment < 5 min, both locales
5. Demo to stakeholder — MVP is live and revenue-generating

### Incremental Delivery

| Week | Deliverable | Success Criterion |
|---|---|---|
| 1–2 | Foundation (auth, infra, base UI) | Login/register works; health endpoints live |
| 2–3 | US1 — Public booking + payment | Patient books in < 5 min (SC-001); double-booking prevented (SC-011) |
| 3–4 | US2 — Patient portal | Patient views history + downloads receipt without staff |
| 5–6 | US3 — Admin dashboard | Admin adds doctor → slots live in < 1 min (SC-006) |
| 6–7 | US4 — Doctor portal | Doctor documents all daily appointments |
| 8 | Polish, RTL audit, security, deploy | WCAG AA pass; OWASP ZAP clean; production live |

### Parallel Team Strategy (2 developers)

- **Developer A**: Backend (T014–T073) → always 1 phase ahead of FE
- **Developer B**: Frontend (T026–T075) → consumes API contracts, not live BE (mock data initially)
- **Integration sync**: Every 2 days, wire latest FE against latest BE; run integration tests
- **DevOps**: OPS tasks (T001–T005, T085–T091) owned by either dev depending on availability

---

## Notes

- `[P]` tasks have no dependencies on incomplete tasks in same phase — safe to parallelize
- `[US?]` label maps every task to its user story for traceability to spec.md acceptance scenarios
- Constitution §VII (TDD): T020, T024, T037, T039 all write failing tests before implementation
- Constitution §I: `requireRole` guard must be applied before each new router is committed
- Constitution §II: Every `[FE]` task verified at 375 px RTL before marking done
- Commit after each task or logical group using `/speckit.git.commit`
- Stop at each ✅ Checkpoint to validate story independently before proceeding
