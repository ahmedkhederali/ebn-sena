# API Contract: Patients

**Base path**: `/api/patients`
**Response envelope**: `{ success, data?, error?, meta? }`

---

## GET /api/patients/me

Get current patient's profile.

**Auth**: Bearer — `patient`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "664f...",
    "nameAr": "سارة أحمد",
    "nameEn": "Sara Ahmed",
    "email": "sara@example.com",
    "phone": "+966507654321",
    "dateOfBirth": "1990-03-20",
    "gender": "female",
    "preferredLanguage": "ar",
    "profilePhotoUrl": "https://res.cloudinary.com/..."
  }
}
```

---

## PUT /api/patients/me

Update patient profile.

**Auth**: Bearer — `patient`
**Request body** (partial — all fields optional):
```json
{
  "nameAr": "سارة محمد",
  "nameEn": "Sara Mohammed",
  "phone": "+966509991234",
  "dateOfBirth": "1990-03-20",
  "preferredLanguage": "en"
}
```
**Note**: `email`, `nationalId`, `role` are immutable via this endpoint.
**Response 200**: Updated profile object

---

## POST /api/patients/me/photo

Upload patient profile photo.

**Auth**: Bearer — `patient`
**Content-Type**: `multipart/form-data`
**Field**: `photo` — JPEG/PNG/WebP, max 5 MB
**Response 200**: `{ "success": true, "data": { "profilePhotoUrl": "..." } }`

---

## GET /api/patients/me/appointments

List patient's appointments.

**Auth**: Bearer — `patient`
**Query params**:
- `status` — filter by status
- `cursor`, `limit` (default 20)

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
      "doctor": { "nameAr": "د. خالد", "nameEn": "Dr. Khalid", "specialty": "Cardiology" },
      "consultationFeeSAR": 150,
      "hasNote": true,
      "hasReceipt": true
    }
  ],
  "meta": { "cursor": "...", "hasMore": false }
}
```

---

## GET /api/patients/me/appointments/:id

Get full appointment detail including consultation note.

**Auth**: Bearer — `patient` (own appointments only)
**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "664f...",
    "bookingRef": "IBN-2026-00042",
    "appointmentDateTime": "2026-04-25T09:00:00.000Z",
    "status": "completed",
    "doctor": { "nameAr": "د. خالد", "nameEn": "Dr. Khalid", "specialty": "Cardiology", "profilePhotoUrl": "..." },
    "consultationNote": {
      "noteText": "Patient presented with...",
      "createdAt": "2026-04-25T09:45:00.000Z"
    },
    "payment": { "status": "succeeded", "amountSAR": 150 }
  }
}
```

---

## GET /api/patients/me/history

Medical history summary — all past consultations.

**Auth**: Bearer — `patient`
**Query params**: `cursor`, `limit` (default 20)
**Response 200**:
```json
{
  "success": true,
  "data": [
    {
      "appointmentId": "664f...",
      "appointmentDateTime": "2026-04-25T09:00:00.000Z",
      "doctorNameAr": "د. خالد",
      "doctorNameEn": "Dr. Khalid",
      "specialtyAr": "أمراض القلب",
      "specialtyEn": "Cardiology",
      "noteText": "Patient presented with..."
    }
  ],
  "meta": { "cursor": "...", "hasMore": true }
}
```

---

## GET /api/patients/me/receipts/:paymentId

Download payment receipt as PDF.

**Auth**: Bearer — `patient` (own payments only)
**Response 200**: `Content-Type: application/pdf` stream
**Headers**: `Content-Disposition: attachment; filename="receipt-IBN-2026-00042.pdf"`
**Errors**: `404 PAYMENT_NOT_FOUND` | `403 NOT_YOUR_RECEIPT` | `400 PAYMENT_NOT_COMPLETED`

---

## GET /api/patients (Admin)

Search and list all patients.

**Auth**: Bearer — `admin` or `receptionist`
**Query params**:
- `search` — searches `nameAr`, `nameEn`, `nationalId`, `phone`
- `cursor`, `limit` (default 20)

**Response 200**: Patient list (no PHI beyond name, phone, nationalId — these are the search keys)

---

## GET /api/patients/:id (Admin)

Get patient profile + appointment history.

**Auth**: Bearer — `admin` or `receptionist`
**Response 200**: Patient profile + last 10 appointments summary
