# Research: Ibn Sina Medical Center — Full Platform

**Phase**: 0 — Pre-implementation research
**Date**: 2026-04-18
**Feature**: `specs/001-ibn-sina-platform/`

All decisions below resolve unknowns identified in the Technical Context and align with the constitution's locked stack.

---

## Decision 1: Slot Concurrency Strategy

**Decision**: MongoDB unique compound index on `SlotHold(doctorId, dateTime)` + TTL index (10 min expiry). Booking is a two-step atomic operation: (1) insert `SlotHold`, (2) on payment confirmation, delete `SlotHold` + insert `Appointment`.

**Rationale**: MongoDB's `insertOne` with a unique index provides atomicity for a single-document operation, preventing race conditions without requiring distributed locks or Redis. The TTL index automatically releases held slots on payment timeout, avoiding ghost reservations. This keeps the tech stack minimal (no Redis) while satisfying SC-011 (double-booking prevention).

**Alternatives considered**:
- **Optimistic locking (version field)**: Requires retry logic on the client, complex UX for payment flows.
- **Redis Redlock**: Correct, but adds Redis as an infrastructure dependency not in the approved stack.
- **Check-then-insert (advisory)**: Classic TOCTOU race condition — unacceptable for booking.

---

## Decision 2: Payment Gateway Integration

**Decision**: Adapter pattern — `PaymentGateway` interface implemented by `HyperPayAdapter` and `StripeAdapter`. Selection is runtime-determined by currency and card type (HyperPay for SAR local cards; Stripe as fallback for international). Webhook signature verification is mandatory for both.

**Rationale**: HyperPay is required for SAR-denominated transactions and Saudi card network (mada). Stripe provides coverage for international cards. The adapter pattern isolates gateway-specific code, allowing either to be replaced without touching business logic. Both gateways require secure webhook endpoints with HMAC/signature verification.

**Alternatives considered**:
- **HyperPay only**: Cannot process international cards — limits patient base.
- **Stripe only**: mada card support is limited; local acquiring fees are higher.
- **Single class with if/else**: Tight coupling — rejected per Principle III (Modular Architecture).

**HyperPay integration notes**:
- Test environment: `eu-test.oppwa.com`
- Widget integration: server-side checkout ID → client-side widget script
- Webhook: HMAC-SHA256 on raw body with shared secret

**Stripe integration notes**:
- Elements (client-side) + PaymentIntents (server-side)
- Webhook: `stripe-signature` header verified with `stripe.webhooks.constructEvent`

---

## Decision 3: SMS Provider

**Decision**: Unifonic as primary SMS provider for KSA-resident numbers. Taqnyat as documented fallback if Unifonic SLA is not met. Integration via REST API with Arabic-language message templates (pre-approved with provider to avoid rejection by Saudi telecom regulators).

**Rationale**: Unifonic is headquartered in Riyadh and is MOH-approved for healthcare notifications. Arabic SMS templates must be pre-registered with the provider and CITC (Communications and Information Technology Commission) for sender ID approval. This is a regulatory requirement, not a technical preference.

**Alternatives considered**:
- **Twilio**: Higher latency to KSA numbers; no KSA data residency for message logs.
- **AWS SNS**: Adequate technically, but lacks KSA-specific support for sender ID registration.

---

## Decision 4: PDF Receipt Generation

**Decision**: Puppeteer (headless Chromium) on the backend. Receipt HTML template with embedded Arabic font (IBM Plex Arabic). Generated server-side on demand, streamed as `application/pdf`. Not cached — generated fresh per request.

**Rationale**: Arabic RTL text rendering in PDFs is notoriously broken in pure-JavaScript libraries (jsPDF, PDFKit). Puppeteer renders the HTML exactly as Chrome would, producing correct bidirectional text with proper Arabic glyph shaping. The server-side approach also ensures the receipt is consistent regardless of the patient's browser.

**Alternatives considered**:
- **jsPDF**: Cannot reliably shape Arabic glyphs — tested and rejected.
- **PDFKit**: Requires embedding Arabic font manually; does not handle BiDi text algorithm.
- **Pre-generated on payment confirmation**: Adds complexity and storage cost; receipts are low-frequency downloads.

---

## Decision 5: RTL/i18n Architecture

**Decision**: `react-i18next` with JSON namespace files per feature (`ar/appointments.json`, `en/appointments.json`, etc.). `document.documentElement.dir` and `document.documentElement.lang` set on language change. Tailwind logical properties used for all spacing/alignment. `dir` on `<html>` ensures browser-native BiDi text algorithm applies.

**Rationale**: `react-i18next` is the de facto standard with the largest Arabic community support. Namespacing by feature matches the modular architecture (Principle III) and allows lazy-loading translation chunks. Setting `dir` on `<html>` (not per-component) ensures correct text rendering at the OS level, including third-party components.

**Alternatives considered**:
- **FormatJS / react-intl**: More complex setup for RTL; smaller Arabic ecosystem.
- **Per-component `dir` attribute**: Error-prone; does not affect inherited browser BiDi behavior.
- **Separate Arabic/English routes**: Duplicated routing logic — rejected.

---

## Decision 6: Real-Time Slot Availability

**Decision**: Client-side polling every 5 seconds on the `BookingPage` slot grid (TanStack Query `refetchInterval: 5000`). No WebSocket in v1.

**Rationale**: The SC-002 requirement is "slot unavailable within 3 seconds" — this is met by the `SlotHold` TTL mechanism on the server side. The 5 s polling is sufficient for the UI to reflect the hold. WebSockets add infrastructure complexity (sticky sessions, socket.io) that is not justified at the projected scale (200 concurrent users). Polling can be replaced with SSE/WebSocket in v2 if load data supports it.

**Alternatives considered**:
- **WebSocket (socket.io)**: Correct for real-time, but requires session affinity at the load balancer level — premature for v1 scale.
- **Server-Sent Events**: Simpler than WebSocket but still requires persistent connection management.

---

## Decision 7: Deployment Architecture

**Decision**: Frontend → Vercel (CDN + edge). Backend → Railway (managed Node.js containers, KSA-adjacent) or Ubuntu VPS in KSA (if data residency enforcement is strict). MongoDB → Atlas M10 in Bahrain (me-south-1) region.

**Rationale**: Vercel is optimal for the static/CSR React app (global CDN, zero-config). Railway simplifies backend ops (auto-deploy, managed TLS, horizontal scaling). MongoDB Atlas Bahrain is the closest KSA-compliant region available. If MOH auditors require backend compute within KSA borders, a KSA-region VPS (e.g., STC Cloud, Alibaba Cloud KSA) replaces Railway.

**Note**: Confirm with project owner whether Railway (Bahrain-adjacent) satisfies MOH data-residency requirements for backend compute, or whether KSA-border VPS is mandated.

---

## Decision 8: Audit Logging Strategy

**Decision**: Express middleware (`auditLog.ts`) intercepts all write operations (POST/PUT/DELETE) after the response is sent (`res.on('finish')`). Logs are written to a dedicated `AuditLog` MongoDB collection. PHI fields (patientName, phone, nationalId) are excluded from log payloads; only resource IDs and actor context are stored.

**Rationale**: Audit logging must not block the response path (Principle IX — Observability). Post-response logging via `res.on('finish')` ensures zero latency impact. Storing logs in a dedicated MongoDB collection (separate from the main `logs` collection) allows independent retention policy and role-restricted access (Admin only).

**Alternatives considered**:
- **Winston file logs only**: Not queryable by Admin via UI; fails the compliance requirement.
- **Pre-response logging**: Blocks response on I/O — rejected.
- **External service (Datadog, CloudWatch)**: Adds cost and potential data-residency concerns for PHI metadata.
