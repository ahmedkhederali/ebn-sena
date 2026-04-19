# API Contract: Doctors

**Base path**: `/api/doctors`
**Response envelope**: `{ success, data?, error?, meta? }`

---

## GET /api/doctors

List all active doctors (public directory).

**Auth**: Public
**Query params**:
- `specialtyId` — filter by specialty
- `search` — free-text search on `nameAr`, `nameEn`
- `cursor`, `limit` (default 12)

**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "id": "664f...",
      "nameAr": "د. خالد الراشد",
      "nameEn": "Dr. Khalid Al-Rashid",
      "specialty": { "id": "...", "nameAr": "أمراض القلب", "nameEn": "Cardiology" },
      "profilePhotoUrl": "https://res.cloudinary.com/...",
      "consultationFeeSAR": 150,
      "averageRating": 4.8,
      "ratingCount": 92,
      "nextAvailableSlot": "2026-04-22T10:00:00.000Z"
    }
  ],
  "meta": { "cursor": "...", "hasMore": false, "total": 20 }
}
```

---

## GET /api/doctors/:id

Get doctor public profile.

**Auth**: Public
**Response 200**: Full doctor object including `bioAr`, `bioEn`, `qualifications`, `specialtyId`

---

## POST /api/doctors

Create new doctor account.

**Auth**: Bearer — `admin`
**Request body**:
```json
{
  "nameAr": "د. فاطمة العتيبي",
  "nameEn": "Dr. Fatima Al-Otaibi",
  "email": "dr.fatima@ibnsina.sa",
  "phone": "+966501112222",
  "specialtyId": "664f...",
  "bioAr": "طبيبة متخصصة في...",
  "bioEn": "Specialist in...",
  "qualifications": ["MBBS", "MD Pediatrics"],
  "consultationFeeSAR": 200
}
```
**Note**: Creates a `users` doc (role: `doctor`) + `doctorProfiles` doc. Auto-generates a temporary password emailed to the doctor.
**Response 201**: Created doctor profile object
**Errors**: `409 EMAIL_EXISTS` | `400 SPECIALTY_NOT_FOUND`

---

## PUT /api/doctors/:id

Update doctor profile.

**Auth**: Bearer — `admin`
**Request body**: Any subset of `POST /api/doctors` fields (partial update)
**Response 200**: Updated doctor profile

---

## DELETE /api/doctors/:id

Deactivate a doctor (soft delete).

**Auth**: Bearer — `admin`
**Business rule**: If doctor has future `confirmed` appointments → `409 DOCTOR_HAS_FUTURE_APPOINTMENTS` with list
**Response 200**: `{ "success": true, "data": { "message": "Doctor deactivated." } }`

---

## PUT /api/doctors/:id/schedule

Replace doctor's weekly availability schedule.

**Auth**: Bearer — `admin`
**Request body**:
```json
{
  "schedule": [
    { "dayOfWeek": 0, "startTime": "09:00", "endTime": "13:00", "slotDurationMinutes": 30 },
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "17:00", "slotDurationMinutes": 30 },
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00", "slotDurationMinutes": 30 }
  ]
}
```
**Response 200**: New schedule array

---

## POST /api/doctors/:id/unavailability

Block a date range (vacation / leave).

**Auth**: Bearer — `admin`
**Request body**:
```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-07",
  "reason": "vacation"
}
```
**Response 201**: Created `UnavailabilityBlock`
**Side effect**: All slot-availability queries will exclude this range immediately

---

## DELETE /api/doctors/:id/unavailability/:blockId

Remove an unavailability block.

**Auth**: Bearer — `admin`
**Response 200**: `{ "success": true }`

---

## POST /api/doctors/:id/photo

Upload doctor profile photo.

**Auth**: Bearer — `admin`
**Content-Type**: `multipart/form-data`
**Field**: `photo` — JPEG/PNG/WebP, max 5 MB
**Response 200**: `{ "success": true, "data": { "profilePhotoUrl": "https://res.cloudinary.com/..." } }`
**Errors**: `400 FILE_TOO_LARGE` | `400 UNSUPPORTED_FORMAT`
