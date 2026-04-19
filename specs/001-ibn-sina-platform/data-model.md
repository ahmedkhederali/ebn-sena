# Data Model: Ibn Sina Medical Center — Full Platform

**Phase**: 1 — Design
**Date**: 2026-04-18
**Database**: MongoDB 7.x via Mongoose 8.x

All schemas use TypeScript strict types. Every schema includes `createdAt` and `updatedAt` via Mongoose `timestamps: true`.

---

## Collections Overview

| Collection | Purpose |
|---|---|
| `users` | All account holders (Patient, Doctor, Admin, Receptionist) |
| `doctorProfiles` | Extended doctor information linked to a `users` doc |
| `availabilitySchedules` | Recurring weekly schedule per doctor |
| `unavailabilityBlocks` | Vacation / leave date ranges per doctor |
| `appointments` | Confirmed booking records |
| `slotHolds` | Temporary slot reservations during payment (TTL: 10 min) |
| `consultationNotes` | Doctor-authored notes per appointment |
| `payments` | Payment transaction records |
| `services` | Medical specialties / services (bilingual) |
| `contentBlocks` | CMS-managed bilingual website content |
| `auditLogs` | Compliance audit trail for all write operations |
| `refreshTokens` | Hashed refresh tokens (TTL: 7 days) |

---

## Schema Definitions

### `users`

```typescript
interface IUser {
  _id: ObjectId
  // Identity
  nameAr: string                        // Arabic name (required)
  nameEn: string                        // English name (required)
  email: string                         // unique, lowercase, indexed
  passwordHash: string                  // bcrypt hash (cost 12)
  phone: string                         // E.164 format (+966...)
  nationalId: string                    // 10-digit SA National ID or Iqama; unique sparse index
  dateOfBirth?: Date
  gender?: 'male' | 'female'
  profilePhotoUrl?: string              // Cloudinary URL
  // Role & Access
  role: 'patient' | 'doctor' | 'admin' | 'receptionist'
  isActive: boolean                     // default: true; false = deactivated
  // Auth state
  emailVerified: boolean                // default: false
  emailVerificationToken?: string       // hashed; cleared on verification
  emailVerificationExpires?: Date
  passwordResetToken?: string           // hashed; time-limited
  passwordResetExpires?: Date
  // Preferences
  preferredLanguage: 'ar' | 'en'       // default: 'ar'
  // Consent
  consentGiven: boolean                 // must be true before data stored
  consentTimestamp?: Date
  // Timestamps (via Mongoose)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ email: 1 }` — unique
- `{ nationalId: 1 }` — unique, sparse (null allowed for non-patient roles)
- `{ role: 1, isActive: 1 }` — compound (admin queries by role)

---

### `doctorProfiles`

```typescript
interface IDoctorProfile {
  _id: ObjectId
  userId: ObjectId                      // ref: users; unique
  specialtyId: ObjectId                 // ref: services
  bioAr: string
  bioEn: string
  qualifications: string[]              // e.g. ["MBBS", "FRCS"]
  consultationFeeSAR: number            // SAR, positive
  averageRating: number                 // 0–5, computed field
  ratingCount: number
  isAcceptingBookings: boolean          // default: true
  cloudinaryPublicId?: string           // for photo management
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ userId: 1 }` — unique
- `{ specialtyId: 1, isAcceptingBookings: 1 }` — public directory queries

---

### `availabilitySchedules`

```typescript
interface IAvailabilitySchedule {
  _id: ObjectId
  doctorId: ObjectId                    // ref: users (doctor role)
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6  // 0 = Sunday
  startTime: string                     // "HH:mm" 24h format
  endTime: string                       // "HH:mm" 24h format
  slotDurationMinutes: number           // 15 | 20 | 30 | 45 | 60
  isActive: boolean                     // default: true
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ doctorId: 1, dayOfWeek: 1 }` — slot generation queries
- `{ doctorId: 1, isActive: 1 }`

---

### `unavailabilityBlocks`

```typescript
interface IUnavailabilityBlock {
  _id: ObjectId
  doctorId: ObjectId                    // ref: users
  startDate: Date                       // inclusive; stored as UTC midnight
  endDate: Date                         // inclusive; stored as UTC midnight
  reason: 'vacation' | 'leave' | 'training' | 'other'
  notes?: string                        // admin note (not patient-visible)
  createdBy: ObjectId                   // ref: users (admin who created)
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ doctorId: 1, startDate: 1, endDate: 1 }` — range overlap queries

---

### `appointments`

```typescript
interface IAppointment {
  _id: ObjectId
  bookingRef: string                    // e.g. "IBN-2026-00001"; unique, auto-generated
  patientId: ObjectId                   // ref: users (patient role)
  doctorId: ObjectId                    // ref: users (doctor role)
  appointmentDateTime: Date             // UTC; the exact start of the slot
  slotDurationMinutes: number           // snapshot from schedule at booking time
  status: 'pending-payment'
        | 'confirmed'
        | 'completed'
        | 'cancelled'
        | 'no-show'
  // Cancellation tracking
  cancelledBy?: ObjectId               // ref: users
  cancelledAt?: Date
  cancellationReason?: string
  // Patient context at booking
  patientNameSnapshot: string          // name as entered at booking (may differ from profile)
  patientPhoneSnapshot: string
  patientNationalIdSnapshot: string    // stored encrypted
  patientNotes?: string                // patient's notes at booking
  // Payment linkage
  paymentId?: ObjectId                 // ref: payments; set after payment
  // Metadata
  bookedByUserId?: ObjectId            // ref: users; set if booked while logged in
  bookedAnonymously: boolean           // true if booked without account
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ bookingRef: 1 }` — unique
- `{ patientId: 1, appointmentDateTime: -1 }` — patient portal list
- `{ doctorId: 1, appointmentDateTime: 1, status: 1 }` — doctor schedule + slot queries
- `{ status: 1, appointmentDateTime: 1 }` — admin dashboard
- `{ appointmentDateTime: 1 }` — analytics time-series

---

### `slotHolds`

```typescript
interface ISlotHold {
  _id: ObjectId
  doctorId: ObjectId
  appointmentDateTime: Date
  sessionRef: string                    // random UUID; returned to client to claim on confirm
  patientNationalIdHash: string         // bcrypt hash; for dedup check only
  expiresAt: Date                       // NOW + 10 minutes; drives TTL index
  createdAt: Date
}
```

**Indexes**:
- `{ doctorId: 1, appointmentDateTime: 1 }` — **unique** (prevents double-hold = prevents double-booking)
- `{ expiresAt: 1 }` — **TTL index** (`expireAfterSeconds: 0`); MongoDB auto-deletes expired holds
- `{ sessionRef: 1 }` — unique; used to claim hold on payment confirmation

---

### `consultationNotes`

```typescript
interface IConsultationNote {
  _id: ObjectId
  appointmentId: ObjectId              // ref: appointments; unique per doctor+appointment
  doctorId: ObjectId                   // ref: users (doctor role)
  patientId: ObjectId                  // ref: users (patient role); denormalized for query
  noteText: string                     // plain text; no HTML; max 5000 chars
  editableUntil: Date                  // createdAt + 24 hours; after this, immutable
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ appointmentId: 1, doctorId: 1 }` — unique (one note per doctor per appointment)
- `{ patientId: 1, createdAt: -1 }` — patient medical history view
- `{ doctorId: 1, patientId: 1 }` — doctor's notes for a specific patient

---

### `payments`

```typescript
interface IPayment {
  _id: ObjectId
  appointmentId: ObjectId              // ref: appointments; unique
  gateway: 'hyperpay' | 'stripe'
  gatewayCheckoutId: string            // HyperPay checkoutId or Stripe PaymentIntent ID
  gatewayTransactionRef?: string       // final transaction ref from gateway
  amountSAR: number                    // in halalas (1 SAR = 100); e.g. 15000 = 150 SAR
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  // Webhook snapshot — stored encrypted at rest
  webhookPayloadEncrypted?: string     // AES-256-GCM encrypted JSON string
  webhookReceivedAt?: Date
  // Receipt
  receiptGeneratedAt?: Date
  // Timestamps
  initiatedAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ appointmentId: 1 }` — unique
- `{ gatewayCheckoutId: 1 }` — webhook lookup
- `{ status: 1, completedAt: -1 }` — analytics revenue queries

---

### `services`

```typescript
interface IService {
  _id: ObjectId
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  iconSlug?: string                    // Heroicons / custom icon name
  isActive: boolean
  displayOrder: number                 // for homepage ordering
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**:
- `{ isActive: 1, displayOrder: 1 }`

---

### `contentBlocks`

```typescript
interface IContentBlock {
  _id: ObjectId
  key: string                          // unique; e.g. "hero.title", "services.intro"
  section: 'homepage' | 'services' | 'about' | 'contact'
  ar: string                           // Arabic content (HTML-safe text)
  en: string                           // English content
  updatedBy: ObjectId                  // ref: users (admin)
  updatedAt: Date
  createdAt: Date
}
```

**Indexes**:
- `{ key: 1 }` — unique
- `{ section: 1 }`

---

### `auditLogs`

```typescript
interface IAuditLog {
  _id: ObjectId
  actorId: ObjectId                    // ref: users; who performed the action
  actorRole: string                    // role at time of action
  action: string                       // e.g. "appointment.cancel", "doctor.create"
  resourceType: string                 // collection name
  resourceId: ObjectId                 // document _id affected
  outcome: 'success' | 'failure'
  ipAddress: string
  userAgent?: string
  // NO PHI fields — patientName, phone, nationalId are NEVER stored here
  metadata?: Record<string, unknown>   // non-PHI context (e.g. { newStatus: "cancelled" })
  requestId: string                    // X-Request-Id from middleware
  timestamp: Date
}
```

**Indexes**:
- `{ actorId: 1, timestamp: -1 }`
- `{ resourceType: 1, resourceId: 1, timestamp: -1 }`
- `{ timestamp: -1 }` — admin log viewer

---

### `refreshTokens`

```typescript
interface IRefreshToken {
  _id: ObjectId
  userId: ObjectId                     // ref: users
  tokenHash: string                    // SHA-256 hash of the raw token
  expiresAt: Date                      // NOW + 7 days
  isRevoked: boolean                   // default: false; set on logout/rotation
  userAgent?: string
  ipAddress?: string
  createdAt: Date
}
```

**Indexes**:
- `{ tokenHash: 1 }` — unique; webhook / refresh lookup
- `{ userId: 1, isRevoked: 1 }`
- `{ expiresAt: 1 }` — TTL index (`expireAfterSeconds: 0`)

---

## State Transitions

### Appointment Status

```
[booking initiated]
       │
       ▼
pending-payment ──(payment success)──► confirmed ──(doctor marks)──► completed
       │                                   │
       │ (payment fail / TTL)              │ (patient/admin cancel)
       ▼                                   ▼
   [SlotHold                          cancelled
    auto-expires]
                                      confirmed ──(no contact)──► no-show
```

### SlotHold Lifecycle

```
POST /hold ──(unique index)──► created (TTL: 10 min)
                                   │
              ┌────────────────────┼──────────────────────┐
              ▼                    ▼                       ▼
     payment confirmed     payment failed          TTL expires
     (delete + create       (delete hold)         (auto-deleted
      Appointment)                                 by MongoDB)
```

---

## Key Relationships

```
users ─────1:1────► doctorProfiles
users ─────1:N────► availabilitySchedules  (doctor role)
users ─────1:N────► unavailabilityBlocks   (doctor role)
users ─────1:N────► appointments            (patientId)
users ─────1:N────► appointments            (doctorId)
appointments ──1:1──► payments
appointments ──1:1──► consultationNotes     (per doctor)
appointments ──1:0..1──► slotHolds          (transient)
services ──1:N──► doctorProfiles            (specialtyId)
contentBlocks ── standalone CMS collection
auditLogs ── append-only; references users + any resource
```

---

## Index Summary (performance-critical)

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `slotHolds` | `{doctorId,appointmentDateTime}` | Unique | Concurrency guard |
| `slotHolds` | `{expiresAt}` | TTL | Auto-expiry |
| `appointments` | `{doctorId,appointmentDateTime,status}` | Compound | Slot availability |
| `appointments` | `{patientId,appointmentDateTime}` | Compound | Patient portal |
| `users` | `{email}` | Unique | Auth lookup |
| `users` | `{nationalId}` | Unique sparse | Dedup patients |
| `refreshTokens` | `{tokenHash}` | Unique | Token refresh |
| `refreshTokens` | `{expiresAt}` | TTL | Auto-expiry |
| `consultationNotes` | `{appointmentId,doctorId}` | Unique | One note/doctor/appt |
| `payments` | `{gatewayCheckoutId}` | Unique | Webhook handler |
