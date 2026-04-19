# API Contract: Admin & Analytics

**Base path**: `/api/admin` + `/api/analytics`
**Auth**: All routes require Bearer token with `admin` role unless noted. Receptionist access noted per endpoint.
**Response envelope**: `{ success, data?, error?, meta? }`

---

## User Management

### GET /api/admin/users

List all staff accounts (Admin + Receptionist).

**Auth**: `admin`
**Query params**: `role`, `isActive`, `search`, `cursor`, `limit`
**Response 200**: Array of staff user objects (no password fields)

---

### POST /api/admin/users

Create a new staff account.

**Auth**: `admin`
**Request body**:
```json
{
  "nameAr": "منى العتيبي",
  "nameEn": "Mona Al-Otaibi",
  "email": "mona@ibnsina.sa",
  "phone": "+966502223344",
  "role": "receptionist"
}
```
**Note**: Temporary password auto-generated and emailed. Role must be `admin` or `receptionist`.
**Response 201**: Created user object
**Errors**: `409 EMAIL_EXISTS` | `400 INVALID_ROLE`

---

### PUT /api/admin/users/:id

Update staff account (role, activation status).

**Auth**: `admin`
**Request body**: `{ "role": "admin", "isActive": false }`
**Constraint**: Cannot modify own account role or deactivate self.
**Response 200**: Updated user object

---

## Analytics

### GET /api/analytics/summary

KPI summary for a date range.

**Auth**: `admin`
**Query params**: `from` (ISO date), `to` (ISO date)
**Response 200**:
```json
{
  "success": true,
  "data": {
    "totalAppointments": 142,
    "completedAppointments": 128,
    "cancelledAppointments": 14,
    "totalRevenueSAR": 21300,
    "newPatientsRegistered": 38,
    "averageConsultationFeeSAR": 166
  }
}
```

---

### GET /api/analytics/by-day

Daily time series within date range.

**Auth**: `admin`
**Query params**: `from`, `to`
**Response 200**:
```json
{
  "success": true,
  "data": [
    { "date": "2026-04-01", "appointments": 12, "revenueSAR": 1800, "newPatients": 4 },
    { "date": "2026-04-02", "appointments": 8, "revenueSAR": 1200, "newPatients": 2 }
  ]
}
```

---

### GET /api/analytics/by-specialty

Appointment and revenue breakdown by specialty.

**Auth**: `admin`
**Query params**: `from`, `to`
**Response 200**:
```json
{
  "success": true,
  "data": [
    { "specialtyId": "...", "specialtyNameAr": "أمراض القلب", "specialtyNameEn": "Cardiology",
      "appointments": 45, "revenueSAR": 6750 },
    { "specialtyId": "...", "specialtyNameAr": "الأطفال", "specialtyNameEn": "Pediatrics",
      "appointments": 38, "revenueSAR": 3800 }
  ]
}
```

---

## Content Management

### GET /api/content

Get all content blocks (admin view — full list).

**Auth**: `admin`
**Response 200**: Array of all `ContentBlock` docs with `key`, `section`, `ar`, `en`, `updatedAt`

---

### GET /api/content/public

Get content blocks for public website rendering.

**Auth**: Public
**Query params**: `keys[]` — specific keys to fetch (e.g. `keys[]=hero.title&keys[]=hero.subtitle`)
**Response 200**:
```json
{
  "success": true,
  "data": {
    "hero.title": { "ar": "مركز ابن سينا الطبي", "en": "Ibn Sina Medical Center" },
    "hero.subtitle": { "ar": "رعاية صحية متميزة", "en": "Excellence in Healthcare" }
  }
}
```
**Caching**: `Cache-Control: public, max-age=30` (satisfies SC-007 ≤30 s propagation)

---

### PUT /api/content/:key

Update a content block.

**Auth**: `admin`
**Request body**:
```json
{
  "ar": "نص عربي محدث",
  "en": "Updated English text"
}
```
**Response 200**: Updated `ContentBlock`
**Note**: TanStack Query on FE uses `staleTime: 30_000` — combined with `Cache-Control: max-age=30`, public site reflects changes within 30 s.

---

## Services (Specialties) Management

### GET /api/services

List all medical services/specialties.

**Auth**: Public
**Response 200**: Array of `Service` docs (id, nameAr, nameEn, descriptionAr, descriptionEn, isActive, displayOrder)

---

### POST /api/services

Create a new service/specialty.

**Auth**: `admin`
**Request body**:
```json
{
  "nameAr": "طب الأسنان",
  "nameEn": "Dentistry",
  "descriptionAr": "خدمات طب الأسنان الشاملة",
  "descriptionEn": "Comprehensive dental care services",
  "displayOrder": 5
}
```
**Response 201**: Created service

---

### PUT /api/services/:id

Update a service.

**Auth**: `admin`
**Response 200**: Updated service

---

## Health Endpoints

### GET /api/health

**Auth**: Public
**Response 200**: `{ "status": "ok", "timestamp": "2026-04-18T..." }`

### GET /api/health/db

**Auth**: Public
**Response 200**: `{ "status": "ok", "latencyMs": 4 }` | **503** if DB unreachable
