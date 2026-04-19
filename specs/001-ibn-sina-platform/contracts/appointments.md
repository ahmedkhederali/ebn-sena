# API Contract: Appointments

**Base path**: `/api/appointments`
**Response envelope**: `{ success, data?, error?, meta? }`

---

## GET /api/appointments/slots

Get available time slots for a doctor on a given date.

**Auth**: Public
**Query params**:
- `doctorId` (required) — ObjectId
- `date` (required) — ISO date string `YYYY-MM-DD`

**Logic** (server):
1. Load doctor's `AvailabilitySchedule` for the weekday
2. Exclude dates covered by `UnavailabilityBlock`
3. Generate slot times: `startTime + n × slotDurationMinutes`
4. Subtract confirmed `Appointment` docs for that doctor+date
5. Subtract active `SlotHold` docs
6. Return remaining slots

**Response 200**:
```json
{
  "success": true,
  "data": {
    "doctorId": "664f...",
    "date": "2026-04-25",
    "slotDurationMinutes": 30,
    "slots": [
      { "time": "09:00", "available": true },
      { "time": "09:30", "available": false },
      { "time": "10:00", "available": true }
    ]
  }
}
```
**Errors**: `404 DOCTOR_NOT_FOUND` | `400 DATE_IN_PAST` | `400 DOCTOR_UNAVAILABLE`

---

## POST /api/appointments/hold

Reserve a slot during the payment flow (10-minute TTL).

**Auth**: Public
**Request body**:
```json
{
  "doctorId": "664f...",
  "appointmentDateTime": "2026-04-25T09:00:00.000Z",
  "patientName": "Sara Ahmed",
  "patientPhone": "+966507654321",
  "patientNationalId": "1098765432"
}
```
**Concurrency**: Unique MongoDB index on `{doctorId, appointmentDateTime}` guarantees one winner.

**Response 201**:
```json
{
  "success": true,
  "data": {
    "holdId": "...",
    "sessionRef": "a1b2c3d4-...",
    "expiresAt": "2026-04-25T09:10:00.000Z",
    "doctorName": "Dr. Khalid Al-Rashid",
    "appointmentDateTime": "2026-04-25T09:00:00.000Z",
    "consultationFeeSAR": 150
  }
}
```
**Errors**: `409 SLOT_UNAVAILABLE` | `400 VALIDATION_ERROR`

---

## POST /api/appointments/confirm

Called internally by payment webhook handler after successful payment.

**Auth**: Internal service call (webhook middleware validates gateway signature — not JWT)
**Request body**:
```json
{
  "sessionRef": "a1b2c3d4-...",
  "paymentId": "664f...",
  "gateway": "hyperpay"
}
```
**Response 201**:
```json
{
  "success": true,
  "data": {
    "bookingRef": "IBN-2026-00042",
    "appointmentId": "664f...",
    "status": "confirmed"
  }
}
```
**Errors**: `404 HOLD_EXPIRED` | `409 ALREADY_CONFIRMED`

---

## GET /api/appointments

List appointments (filtered by role context).

**Auth**: Bearer token — returns only own appointments for `patient`/`doctor`; all for `admin`/`receptionist`
**Query params**:
- `status` — `pending-payment|confirmed|completed|cancelled|no-show`
- `doctorId` — filter by doctor (admin only)
- `patientId` — filter by patient (admin only)
- `from` — ISO date
- `to` — ISO date
- `cursor` — pagination cursor (base64 encoded `_id`)
- `limit` — default 20, max 50

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "664f...",
      "bookingRef": "IBN-2026-00042",
      "appointmentDateTime": "2026-04-25T09:00:00.000Z",
      "status": "confirmed",
      "doctor": { "id": "...", "nameAr": "د. خالد", "nameEn": "Dr. Khalid", "specialty": "Cardiology" },
      "patient": { "id": "...", "nameAr": "سارة", "nameEn": "Sara" },
      "consultationFeeSAR": 150
    }
  ],
  "meta": { "cursor": "...", "hasMore": true, "total": 84 }
}
```

---

## GET /api/appointments/:id

Get single appointment detail.

**Auth**: Bearer — patient sees own only; doctor sees own appointments only; admin sees all
**Response 200**: Full appointment object including `consultationNote` (if exists) and `payment.status`

---

## PUT /api/appointments/:id/cancel

Cancel an appointment.

**Auth**: Bearer — patient (≥24h before); admin (anytime)
**Request body**: `{ "reason": "Patient request" }` _(optional)_
**Business rule**: If patient and `appointmentDateTime - now < 24h` → `403 CANCELLATION_WINDOW_CLOSED`
**Response 200**: Updated appointment with `status: "cancelled"`

---

## PUT /api/appointments/:id/reschedule

Reschedule to a new slot (admin only).

**Auth**: Bearer — `admin` or `receptionist`
**Request body**:
```json
{ "newAppointmentDateTime": "2026-04-26T10:30:00.000Z" }
```
**Validation**: New slot must be available (no existing booking or hold)
**Response 200**: Updated appointment + notification queued to patient

---

## PUT /api/appointments/:id/status

Update appointment status (doctor completes; admin manages).

**Auth**: Bearer — `doctor` (can set `completed`); `admin` (can set any)
**Request body**: `{ "status": "completed" }`
**Response 200**: Updated appointment object

---

## POST /api/appointments/:id/notes

Save or update consultation notes.

**Auth**: Bearer — `doctor` role only; must be the assigned doctor
**Business rule**: `updatedAt > editableUntil (createdAt + 24h)` → `403 NOTE_EDIT_WINDOW_CLOSED`
**Request body**: `{ "noteText": "Patient reports recurring chest pain..." }`
**Response 200** (create) or **200** (update):
```json
{
  "success": true,
  "data": {
    "noteId": "...",
    "noteText": "Patient reports...",
    "editableUntil": "2026-04-26T09:00:00.000Z",
    "createdAt": "2026-04-25T09:00:00.000Z"
  }
}
```
