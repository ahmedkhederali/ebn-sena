# API Contract: Payments

**Base path**: `/api/payments`
**Response envelope**: `{ success, data?, error?, meta? }`

---

## POST /api/payments/initiate

Start a payment session for a held appointment slot.

**Auth**: Public (patient may not be registered yet)
**Request body**:
```json
{
  "sessionRef": "a1b2c3d4-...",
  "gateway": "hyperpay",
  "currency": "SAR"
}
```
**Gateway selection logic**:
- `hyperpay` — default for SAR; returns `checkoutId` for widget embed
- `stripe` — international cards; returns `clientSecret` for Stripe Elements

**Response 200**:
```json
{
  "success": true,
  "data": {
    "gateway": "hyperpay",
    "checkoutId": "BF...",
    "paymentId": "664f...",
    "amountSAR": 150,
    "expiresAt": "2026-04-25T09:10:00.000Z"
  }
}
```
_(For Stripe: `{ "gateway": "stripe", "clientSecret": "pi_..._secret_..." }`)_

**Errors**: `404 HOLD_EXPIRED` | `400 UNSUPPORTED_GATEWAY`

---

## POST /api/payments/webhook/hyperpay

Receive and process HyperPay payment result.

**Auth**: HMAC-SHA256 signature verification (no JWT — raw body verification)
**Headers**: `X-Hyperpay-Signature: <hmac>`
**Request body**: HyperPay webhook payload (raw JSON)
**Processing**:
1. Verify HMAC signature against raw body
2. Extract `result.code` (success = `000.000.000`)
3. On success: call `appointments/confirm` internally
4. On failure: delete `SlotHold`, mark payment `failed`
5. Trigger notification (SMS + email) on success

**Response 200**: `{ "received": true }` _(Always respond 200 to prevent retries)_

---

## POST /api/payments/webhook/stripe

Receive and process Stripe payment result.

**Auth**: `stripe-signature` header verification
**Processing**: Same flow as HyperPay webhook
**Events handled**: `payment_intent.succeeded` | `payment_intent.payment_failed`
**Response 200**: `{ "received": true }`

---

## GET /api/payments/:id

Get payment record details.

**Auth**: Bearer — `patient` (own payments only) | `admin`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "id": "664f...",
    "appointmentId": "664g...",
    "bookingRef": "IBN-2026-00042",
    "gateway": "hyperpay",
    "amountSAR": 150,
    "status": "succeeded",
    "completedAt": "2026-04-25T09:08:32.000Z"
  }
}
```

---

## GET /api/payments/:id/receipt

Generate and stream PDF receipt.

**Auth**: Bearer — `patient` (own) | `admin`
**Response 200**: `application/pdf` stream
**PDF content**:
- Center logo + letterhead (Arabic RTL)
- Booking reference, date issued
- Patient name, appointment date/time
- Doctor name, specialty
- Amount paid (SAR), payment method
- Transaction reference
- Center contact information
- Arabic text right-aligned, English as secondary

---

## GET /api/payments (Admin analytics)

List all payments with filters.

**Auth**: Bearer — `admin`
**Query params**: `status`, `gateway`, `from`, `to`, `cursor`, `limit`
**Response 200**: Payment list for revenue reporting
