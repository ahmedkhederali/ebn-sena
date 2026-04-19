# API Contract: Authentication

**Base path**: `/api/auth`
**Auth requirement**: Public (no token required unless noted)
**Response envelope**: `{ success: boolean, data?: T, error?: { code: string, message: string }, meta?: object }`

---

## POST /api/auth/register

Register a new patient account.

**Auth**: Public
**Request body**:
```json
{
  "nameAr": "أحمد محمد",
  "nameEn": "Ahmed Mohammed",
  "email": "patient@example.com",
  "password": "Min8Chars1Special!",
  "phone": "+966501234567",
  "nationalId": "1234567890",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "preferredLanguage": "ar",
  "consentGiven": true
}
```
**Validation**:
- `email` — valid email format, unique
- `password` — min 8 chars, 1 uppercase, 1 number, 1 special char
- `phone` — E.164 format
- `nationalId` — exactly 10 digits, unique
- `consentGiven` — MUST be `true`; rejected if false (no implied consent — Constitution §VI)

**Response 201**:
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please verify your email.",
    "userId": "664f1a2b3c4d5e6f7a8b9c0d"
  }
}
```
**Errors**: `400 VALIDATION_ERROR` | `409 EMAIL_EXISTS` | `409 NATIONAL_ID_EXISTS` | `403 CONSENT_REQUIRED`

---

## POST /api/auth/verify-email

Verify email with token sent to inbox.

**Auth**: Public
**Request body**: `{ "token": "<verification-token>" }`
**Response 200**: `{ "success": true, "data": { "message": "Email verified." } }`
**Errors**: `400 INVALID_TOKEN` | `410 TOKEN_EXPIRED`

---

## POST /api/auth/login

Authenticate and receive tokens.

**Auth**: Public
**Rate limit**: 5 failed attempts / 15 min per IP
**Request body**:
```json
{ "email": "user@example.com", "password": "Secret123!" }
```
**Response 200**:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt-rs256-15min>",
    "user": {
      "id": "664f...",
      "nameAr": "أحمد",
      "nameEn": "Ahmed",
      "role": "patient",
      "preferredLanguage": "ar"
    }
  }
}
```
**Note**: `refreshToken` set as `HttpOnly; Secure; SameSite=Strict` cookie (not in body)
**Errors**: `401 INVALID_CREDENTIALS` | `403 EMAIL_NOT_VERIFIED` | `403 ACCOUNT_INACTIVE` | `429 TOO_MANY_ATTEMPTS`

---

## POST /api/auth/refresh

Rotate refresh token and issue new access token.

**Auth**: Refresh token via `HttpOnly` cookie
**Request body**: _(empty)_
**Response 200**: Same shape as login `data` (new `accessToken` + rotated cookie)
**Errors**: `401 INVALID_REFRESH_TOKEN` | `401 TOKEN_REVOKED`

---

## POST /api/auth/logout

Revoke current refresh token.

**Auth**: `Bearer <accessToken>`
**Response 200**: `{ "success": true, "data": { "message": "Logged out." } }`

---

## POST /api/auth/forgot-password

Send password reset email.

**Auth**: Public
**Rate limit**: 3 requests / 15 min per email
**Request body**: `{ "email": "user@example.com" }`
**Response 200**: `{ "success": true, "data": { "message": "If that email exists, a reset link was sent." } }`
_(Always returns 200 to prevent email enumeration)_

---

## POST /api/auth/reset-password

Set new password using reset token.

**Auth**: Public
**Request body**: `{ "token": "<reset-token>", "newPassword": "NewSecret123!" }`
**Response 200**: `{ "success": true, "data": { "message": "Password reset successful." } }`
**Errors**: `400 INVALID_TOKEN` | `410 TOKEN_EXPIRED`

---

## GET /api/auth/me

Get current user profile.

**Auth**: `Bearer <accessToken>`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "664f...",
    "nameAr": "أحمد",
    "nameEn": "Ahmed",
    "email": "ahmed@example.com",
    "role": "patient",
    "preferredLanguage": "ar",
    "emailVerified": true
  }
}
```
