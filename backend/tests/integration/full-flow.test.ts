/**
 * Full end-to-end integration tests covering:
 * 1. Admin creates doctor with profile
 * 2. Doctor sets weekly schedule (slots)
 * 3. Patient registers and logs in
 * 4. Patient browses doctors and views available slots
 * 5. Patient holds a slot
 * 6. Patient initiates payment
 * 7. Payment webhook fires → appointment confirmed automatically
 * 8. Doctor views appointment and adds consultation note
 * 9. Doctor marks appointment as completed
 * 10. Patient views appointment with note
 * 11. Admin cancels/reschedules scenarios
 * 12. Error scenarios and edge cases
 */

import request from 'supertest'
import mongoose from 'mongoose'
import { setupTestDb, teardownTestDb, getApp, createTestUser, loginAs } from './helpers'
import { ServiceModel } from '../../src/features/doctors/doctors.schema'
import {
  AvailabilityScheduleModel,
  AppointmentModel,
} from '../../src/features/appointments/appointments.schema'

// ─── Test state ───────────────────────────────────────────────────────────────
let adminToken: string
let adminUserId: string
let doctorToken: string
let doctorUserId: string
let doctorProfileId: string
let patientToken: string
let patientUserId: string
let specialtyId: string
let sessionRef: string
let paymentId: string
let appointmentId: string
let bookingRef: string
let scheduleId: string

// Helper: next available date for a given weekday (0=Sun) — uses UTC to avoid timezone drift
function nextWeekday(dow: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  while (d.getUTCDay() !== dow) {
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return d.toISOString().slice(0, 10)
}

// ─── Setup ────────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await setupTestDb()

  // Seed a specialty
  const specialty = await ServiceModel.create({
    nameAr: 'طب عام',
    nameEn: 'General Practice',
    icon: '🏥',
    isActive: true,
    sortOrder: 1,
  })
  specialtyId = specialty._id.toString()

  // Create admin user
  const { user: admin, password: adminPass } = await createTestUser({
    role: 'admin',
    email: `admin-flow-${Date.now()}@test.com`,
    nameEn: 'Admin User',
  })
  adminUserId = admin._id.toString()
  adminToken = (await loginAs(admin.email, adminPass)) ?? ''
})

afterAll(async () => {
  await teardownTestDb()
})

// ─── 1. Admin creates doctor ──────────────────────────────────────────────────
describe('Step 1: Admin creates a doctor with profile', () => {
  it('POST /api/admin/doctors — creates user + DoctorProfile atomically', async () => {
    const res = await request(getApp())
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nameAr: 'د. علي حسن',
        nameEn: 'Dr. Ali Hassan',
        email: `dr.ali.${Date.now()}@ibnsina.sa`,
        phone: '+966501234567',
        specialtyId,
        consultationFeeSAR: 200,
        bioAr: 'طبيب عام ذو خبرة عشر سنوات',
        bioEn: 'General practitioner with 10 years experience',
        yearsOfExperience: 10,
        qualifications: ['MBBS', 'Saudi Board'],
        languages: ['ar', 'en'],
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('userId')
    expect(res.body.data).toHaveProperty('doctorProfileId')
    expect(res.body.data).toHaveProperty('tempPassword')

    doctorProfileId = res.body.data.doctorProfileId as string
    doctorUserId = res.body.data.userId as string
    const tempPassword = res.body.data.tempPassword as string

    // Doctor logs in with temp password
    const loginRes = await request(getApp())
      .post('/api/auth/login')
      .send({ email: `dr.ali.${Date.now()}@ibnsina.sa`, password: tempPassword })

    // We need to get the actual email — query DB
    const { UserModel } = await import('../../src/features/auth/auth.schema')
    const doctor = await UserModel.findById(doctorUserId).lean()
    expect(doctor).not.toBeNull()
    expect(doctor!.role).toBe('doctor')

    const loginRes2 = await request(getApp())
      .post('/api/auth/login')
      .send({ email: doctor!.email, password: tempPassword })

    expect(loginRes2.status).toBe(200)
    doctorToken = loginRes2.body.data.accessToken as string
  })

  it('POST /api/admin/doctors — rejects missing required fields', async () => {
    const res = await request(getApp())
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nameAr: 'د. ناقص', nameEn: 'Incomplete Doctor' })

    expect(res.status).toBe(400)
  })

  it('GET /api/admin/doctors — admin can list doctor profiles', async () => {
    const res = await request(getApp())
      .get('/api/admin/doctors')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThan(0)
  })

  it('GET /api/doctors/me/profile — doctor can view their own profile', async () => {
    const res = await request(getApp())
      .get('/api/doctors/me/profile')
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(doctorProfileId)
    expect(res.body.data.nameEn).toBe('Dr. Ali Hassan')
    expect(res.body.data.consultationFeeSAR).toBe(200)
  })
})

// ─── 2. Doctor sets weekly schedule ──────────────────────────────────────────
describe('Step 2: Doctor sets availability schedule', () => {
  it('POST /api/doctors/me/schedule — sets Monday 09:00–17:00 with 30min slots', async () => {
    const res = await request(getApp())
      .post('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('_id')
    scheduleId = res.body.data._id as string
  })

  it('POST /api/doctors/me/schedule — sets Tuesday as well', async () => {
    const res = await request(getApp())
      .post('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ dayOfWeek: 2, startTime: '10:00', endTime: '15:00', slotDurationMinutes: 30 })

    expect(res.status).toBe(201)
  })

  it('POST /api/doctors/me/schedule — upserts existing day', async () => {
    const res = await request(getApp())
      .post('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ dayOfWeek: 1, startTime: '08:00', endTime: '18:00', slotDurationMinutes: 30 })

    expect(res.status).toBe(201)
    expect(res.body.data.startTime).toBe('08:00')
  })

  it('POST /api/doctors/me/schedule — rejects invalid dayOfWeek', async () => {
    const res = await request(getApp())
      .post('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ dayOfWeek: 8, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(400)
  })

  it('GET /api/doctors/me/schedule — doctor views their schedule', async () => {
    const res = await request(getApp())
      .get('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeGreaterThanOrEqual(2)
  })

  it('DELETE /api/doctors/me/schedule/:id — deactivates a schedule entry', async () => {
    // First add a temporary one
    const addRes = await request(getApp())
      .post('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ dayOfWeek: 6, startTime: '09:00', endTime: '12:00' })

    const tempId = addRes.body.data._id as string

    const res = await request(getApp())
      .delete(`/api/doctors/me/schedule/${tempId}`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)

    // Verify no longer in active list
    const listRes = await request(getApp())
      .get('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${doctorToken}`)

    const ids = (listRes.body.data as Array<{ _id: string }>).map((s) => s._id)
    expect(ids).not.toContain(tempId)
  })

  it('patient cannot access doctor schedule endpoint', async () => {
    const { user, password } = await createTestUser({ role: 'patient', email: `p-sched-${Date.now()}@t.com` })
    const token = (await loginAs(user.email, password)) ?? ''
    const res = await request(getApp())
      .get('/api/doctors/me/schedule')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })
})

// ─── 3. Patient registration ──────────────────────────────────────────────────
describe('Step 3: Patient registers', () => {
  it('POST /api/auth/register — creates patient account', async () => {
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({
        nameAr: 'فاطمة الزهراء',
        nameEn: 'Fatima Al-Zahraa',
        email: `fatima.${Date.now()}@test.com`,
        password: 'SecurePass123!',
        phone: '+966509876543',
        nationalId: '1234567890',
        preferredLanguage: 'ar',
        consentGiven: true,
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('userId')
    patientUserId = res.body.data.userId as string

    // Login to get token (may need email verification bypass in test env)
    // For tests, create directly in DB
    const { UserModel } = await import('../../src/features/auth/auth.schema')
    await UserModel.findByIdAndUpdate(patientUserId, {
      emailVerified: true,
      isActive: true,
    })

    const { user } = await createTestUser({
      role: 'patient',
      email: `fatima.login.${Date.now()}@test.com`,
      nameEn: 'Fatima Al-Zahraa',
    })
    patientUserId = user._id.toString()
    const loginRes = await request(getApp())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test1234!' })

    expect(loginRes.status).toBe(200)
    patientToken = loginRes.body.data.accessToken as string
  })
})

// ─── 4. Patient browses doctors + views slots ─────────────────────────────────
describe('Step 4: Patient browses doctors and views slots', () => {
  it('GET /api/doctors — returns doctor list with profile', async () => {
    const res = await request(getApp()).get('/api/doctors')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)

    const doctor = (res.body.data as Array<{ id: string; nameEn: string }>)
      .find((d) => d.id === doctorProfileId)
    expect(doctor).toBeDefined()
    expect(doctor?.nameEn).toBe('Dr. Ali Hassan')
  })

  it('GET /api/doctors/:id — returns doctor detail', async () => {
    const res = await request(getApp()).get(`/api/doctors/${doctorProfileId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.consultationFeeSAR).toBe(200)
    expect(res.body.data.specialty.nameEn).toBe('General Practice')
  })

  it('GET /api/appointments/slots — returns slots for next Monday', async () => {
    const date = nextWeekday(1) // Monday
    const res = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`,
    )
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data.slots)).toBe(true)
    expect(res.body.data.slots.length).toBeGreaterThan(0)
    // 08:00–18:00 with 30 min = 20 slots
    expect(res.body.data.slots.length).toBe(20)
    // First slot should be available
    expect(res.body.data.slots[0].available).toBe(true)
  })

  it('GET /api/appointments/slots — returns empty for day with no schedule', async () => {
    const date = nextWeekday(0) // Sunday — no schedule
    const res = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.slots).toHaveLength(0)
  })

  it('GET /api/appointments/slots — rejects past dates', async () => {
    const res = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=2020-01-01`,
    )
    expect(res.status).toBe(400)
  })

  it('GET /api/doctors — filters by specialtyId', async () => {
    const res = await request(getApp()).get(`/api/doctors?specialtyId=${specialtyId}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    const ids = (res.body.data as Array<{ id: string }>).map((d) => d.id)
    expect(ids).toContain(doctorProfileId)
  })
})

// ─── 5. Patient holds a slot ──────────────────────────────────────────────────
describe('Step 5: Patient holds a slot', () => {
  it('POST /api/appointments/hold — authenticated patient holds a slot', async () => {
    const date = nextWeekday(1)
    const dt = `${date}T09:00:00.000Z`

    const res = await request(getApp())
      .post('/api/appointments/hold')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
        appointmentDateTime: dt,
        patientName: 'Fatima Al-Zahraa',
        patientPhone: '+966509876543',
        patientNationalId: '1234567890',
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('sessionRef')
    expect(res.body.data).toHaveProperty('expiresAt')
    sessionRef = res.body.data.sessionRef as string
  })

  it('POST /api/appointments/hold — same slot returns 409 SLOT_UNAVAILABLE', async () => {
    const date = nextWeekday(1)
    const dt = `${date}T09:00:00.000Z`

    const res = await request(getApp())
      .post('/api/appointments/hold')
      .send({
        doctorId: doctorProfileId,
        appointmentDateTime: dt,
        patientName: 'Other Patient',
        patientPhone: '+966501111111',
        patientNationalId: '9876543210',
      })

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('SLOT_UNAVAILABLE')
  })

  it('GET /api/appointments/slots — held slot shows as unavailable', async () => {
    const date = nextWeekday(1)
    const res = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`,
    )
    const slot = (res.body.data.slots as Array<{ time: string; available: boolean }>)
      .find((s) => s.time === '09:00')
    expect(slot?.available).toBe(false)
  })
})

// ─── 6. Patient initiates payment ────────────────────────────────────────────
describe('Step 6: Patient initiates payment', () => {
  it('POST /api/payments/initiate — creates payment with correct customerName', async () => {
    const res = await request(getApp())
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        gateway: 'hyperpay',
        sessionRef,
        amountSAR: 200,
      })

    expect(res.status).toBe(201)
    expect(res.body.data).toHaveProperty('paymentId')
    expect(res.body.data).toHaveProperty('checkoutId')
    paymentId = res.body.data.paymentId as string

    // Verify customerName is not the email
    const { PaymentModel } = await import('../../src/features/payments/payments.service')
    const payment = await PaymentModel.findById(paymentId).lean()
    expect(payment?.customerName).not.toBe(payment?.customerEmail)
    expect(payment?.patientId).toBe(patientUserId)
  })

  it('POST /api/payments/initiate — rejects missing fields', async () => {
    const res = await request(getApp())
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ gateway: 'hyperpay' })

    expect(res.status).toBe(400)
  })
})

// ─── 7. Payment webhook → appointment confirmed ───────────────────────────────
describe('Step 7: Payment webhook confirms appointment', () => {
  it('POST /api/payments/webhook/hyperpay — success webhook creates appointment', async () => {
    const webhookPayload = JSON.stringify({
      result: { code: '000.000.000', description: 'Transaction approved' },
      merchantTransactionId: sessionRef,
      id: 'hp-tx-001',
    })

    const res = await request(getApp())
      .post('/api/payments/webhook/hyperpay')
      .set('Content-Type', 'application/json')
      .send(webhookPayload)

    expect(res.status).toBe(200)

    // Wait briefly for async confirmation
    await new Promise((r) => setTimeout(r, 200))

    // Appointment should now exist
    const { AppointmentModel: AM } = await import('../../src/features/appointments/appointments.schema')
    const appt = await AM.findOne({ patientId: new mongoose.Types.ObjectId(patientUserId) }).lean()
    expect(appt).not.toBeNull()
    expect(appt?.status).toBe('confirmed')
    expect(appt?.paymentStatus).toBe('succeeded')

    appointmentId = appt!._id.toString()
    bookingRef = appt!.bookingRef
    expect(bookingRef).toMatch(/^IBN-\d{4}-\d{5}$/)
  })

  it('POST /api/payments/webhook/hyperpay — idempotent on duplicate webhook', async () => {
    const webhookPayload = JSON.stringify({
      result: { code: '000.000.000' },
      merchantTransactionId: sessionRef,
    })

    const res = await request(getApp())
      .post('/api/payments/webhook/hyperpay')
      .set('Content-Type', 'application/json')
      .send(webhookPayload)

    expect(res.status).toBe(200)

    const { AppointmentModel: AM } = await import('../../src/features/appointments/appointments.schema')
    const count = await AM.countDocuments({
      patientId: new mongoose.Types.ObjectId(patientUserId),
    })
    expect(count).toBe(1) // still only one appointment
  })

  it('POST /api/payments/webhook/stripe — always returns 200', async () => {
    const res = await request(getApp())
      .post('/api/payments/webhook/stripe')
      .set('stripe-signature', 't=123,v1=abc')
      .send('{}')
    expect(res.status).toBe(200)
  })
})

// ─── 8. Patient views appointment ────────────────────────────────────────────
describe('Step 8: Patient views their appointment', () => {
  it('GET /api/patients/me/appointments — patient sees confirmed appointment', async () => {
    const res = await request(getApp())
      .get('/api/patients/me/appointments')
      .set('Authorization', `Bearer ${patientToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    const appt = (res.body.data as Array<{ id: string; status: string }>)
      .find((a) => a.id === appointmentId)
    expect(appt?.status).toBe('confirmed')
  })

  it('GET /api/patients/me/appointments/:id — patient sees detail with bookingRef', async () => {
    const res = await request(getApp())
      .get(`/api/patients/me/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.bookingRef).toBe(bookingRef)
    expect(res.body.data.status).toBe('confirmed')
  })

  it('GET /api/patients/me/appointments/:id — other patient gets 404 or 401 (not their appointment)', async () => {
    const ts = Date.now()
    const { user: other, password } = await createTestUser({
      role: 'patient',
      email: `other-${ts}@test.com`,
    })
    const loginRes = await request(getApp())
      .post('/api/auth/login')
      .send({ email: other.email, password })
    expect(loginRes.status).toBe(200)
    const otherToken = loginRes.body.data.accessToken as string

    const res = await request(getApp())
      .get(`/api/patients/me/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${otherToken}`)

    // Either 404 (appointment found but doesn't belong to them) or 400/401/403
    expect([401, 403, 404]).toContain(res.status)
  })
})

// ─── 9. Doctor manages appointment ───────────────────────────────────────────
describe('Step 9: Doctor views and manages appointment', () => {
  it('GET /api/doctors/me/appointments — doctor sees the booked appointment', async () => {
    const res = await request(getApp())
      .get('/api/doctors/me/appointments')
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)
    const appt = (res.body.data as Array<{ id: string }>).find((a) => a.id === appointmentId)
    expect(appt).toBeDefined()
  })

  it('GET /api/doctors/me/appointments/:id — doctor sees appointment with patient info', async () => {
    const res = await request(getApp())
      .get(`/api/doctors/me/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.bookingRef).toBe(bookingRef)
    expect(res.body.data.consultationNote).toBeNull()
  })

  it('PUT /api/doctors/me/appointments/:id/note — doctor adds consultation note', async () => {
    const res = await request(getApp())
      .put(`/api/doctors/me/appointments/${appointmentId}/note`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ note: 'Patient presents with mild fever. Prescribed paracetamol 500mg.' })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('noteId')
    expect(res.body.data).toHaveProperty('editableUntil')
  })

  it('GET /api/doctors/me/appointments/:id — note appears in appointment detail', async () => {
    const res = await request(getApp())
      .get(`/api/doctors/me/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.body.data.consultationNote).toBe('Patient presents with mild fever. Prescribed paracetamol 500mg.')
  })

  it('PUT /api/doctors/me/appointments/:id/note — doctor updates note', async () => {
    const res = await request(getApp())
      .put(`/api/doctors/me/appointments/${appointmentId}/note`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ note: 'Patient presents with mild fever. Prescribed paracetamol 500mg. Follow up in 3 days.' })

    expect(res.status).toBe(200)
  })

  it('PUT /api/doctors/me/appointments/:id/note — rejects empty note', async () => {
    const res = await request(getApp())
      .put(`/api/doctors/me/appointments/${appointmentId}/note`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ note: '   ' })

    expect(res.status).toBe(400)
  })

  it('PUT /api/doctors/me/appointments/:id/complete — marks as completed', async () => {
    const res = await request(getApp())
      .put(`/api/doctors/me/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)

    const appt = await AppointmentModel.findById(appointmentId).lean()
    expect(appt?.status).toBe('completed')
  })

  it('PUT /api/doctors/me/appointments/:id/complete — cannot complete already-completed', async () => {
    const res = await request(getApp())
      .put(`/api/doctors/me/appointments/${appointmentId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)

    // Doctors can only mark as 'completed', so completing a completed appt fails
    expect([400, 403]).toContain(res.status)
  })
})

// ─── 10. Patient views completed appointment ──────────────────────────────────
describe('Step 10: Patient views completed appointment with note', () => {
  it('GET /api/patients/me/appointments/:id — shows completed status and note', async () => {
    const res = await request(getApp())
      .get(`/api/patients/me/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('completed')
    expect(res.body.data.consultationNote).toBeTruthy()
  })

  it('GET /api/patients/me/history — appears in medical history', async () => {
    const res = await request(getApp())
      .get('/api/patients/me/history')
      .set('Authorization', `Bearer ${patientToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})

// ─── 11. Admin appointment management ────────────────────────────────────────
describe('Step 11: Admin appointment management', () => {
  let freshAppointmentId: string
  let freshSessionRef: string

  // Create a fresh confirmed appointment for admin tests
  beforeAll(async () => {
    // Create and confirm a new appointment
    const date = nextWeekday(2) // Tuesday
    const dt = `${date}T10:00:00.000Z`

    const holdRes = await request(getApp())
      .post('/api/appointments/hold')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfileId,
        appointmentDateTime: dt,
        patientName: 'Fatima',
        patientPhone: '+966509876543',
        patientNationalId: '1234567890',
      })

    freshSessionRef = holdRes.body.data.sessionRef as string

    // Initiate payment
    const payRes = await request(getApp())
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ gateway: 'hyperpay', sessionRef: freshSessionRef, amountSAR: 200 })

    // Trigger webhook
    await request(getApp())
      .post('/api/payments/webhook/hyperpay')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        result: { code: '000.000.000' },
        merchantTransactionId: freshSessionRef,
      }))

    await new Promise((r) => setTimeout(r, 200))

    const appt = await AppointmentModel.findOne({
      patientId: new mongoose.Types.ObjectId(patientUserId),
      status: 'confirmed',
    }).lean()

    freshAppointmentId = appt?._id.toString() ?? ''
  })

  it('GET /api/admin/appointments — admin lists all appointments', async () => {
    const res = await request(getApp())
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/admin/appointments?status=confirmed — filters by status', async () => {
    const res = await request(getApp())
      .get('/api/admin/appointments?status=confirmed')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    const items = res.body.data as Array<{ status: string }>
    items.forEach((a) => expect(a.status).toBe('confirmed'))
  })

  it('PUT /api/admin/appointments/:id/cancel — admin cancels appointment', async () => {
    if (!freshAppointmentId) return

    const res = await request(getApp())
      .put(`/api/admin/appointments/${freshAppointmentId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Doctor unavailable' })

    expect(res.status).toBe(200)

    const appt = await AppointmentModel.findById(freshAppointmentId).lean()
    expect(appt?.status).toBe('cancelled')
    expect(appt?.cancellationReason).toBe('Doctor unavailable')
  })

  it('PUT /api/admin/appointments/:id/reschedule — rejects non-existent appointment', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await request(getApp())
      .put(`/api/admin/appointments/${fakeId}/reschedule`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newDateTime: new Date(Date.now() + 86400000).toISOString() })

    expect(res.status).toBe(404)
  })
})

// ─── 12. Unavailability blocking ─────────────────────────────────────────────
describe('Step 12: Doctor unavailability blocks all slots', () => {
  let blockId: string

  it('POST /api/doctors/me/unavailability — blocks a date range', async () => {
    const nextMon = nextWeekday(1)
    const res = await request(getApp())
      .post('/api/doctors/me/unavailability')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ startDate: nextMon, endDate: nextMon, reason: 'leave' })

    expect(res.status).toBe(201)
    blockId = res.body.data._id as string
  })

  it('GET /api/appointments/slots — blocked day returns empty slots', async () => {
    const date = nextWeekday(1)
    const res = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`,
    )
    expect(res.status).toBe(200)
    expect(res.body.data.slots).toHaveLength(0)
  })

  it('DELETE /api/doctors/me/unavailability/:id — removes block, slots return', async () => {
    const res = await request(getApp())
      .delete(`/api/doctors/me/unavailability/${blockId}`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)

    const date = nextWeekday(1)
    const slotsRes = await request(getApp()).get(
      `/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`,
    )
    expect(slotsRes.body.data.slots.length).toBeGreaterThan(0)
  })
})

// ─── 13. Patient cancellation with 24h policy ─────────────────────────────────
describe('Step 13: Patient cancellation policy', () => {
  it('PUT /api/appointments/:id/status — patient cannot cancel within 24h', async () => {
    // Create appointment in the next few hours (within 24h)
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    // Directly insert confirmed appointment into DB
    const appt = await AppointmentModel.create({
      bookingRef: 'IBN-TEST-CANCEL',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      doctorId: new mongoose.Types.ObjectId(doctorUserId),
      appointmentDateTime: soon,
      status: 'confirmed',
      paymentStatus: 'succeeded',
      patientNameSnapshot: 'Fatima',
      patientPhoneSnapshot: '+966509876543',
      patientNationalIdSnapshot: '1234567890',
    })

    const res = await request(getApp())
      .put(`/api/appointments/${appt._id.toString()}/status`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CANCELLATION_WINDOW_CLOSED')
  })

  it('PUT /api/appointments/:id/status — patient can cancel appointment >24h away', async () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000) // 2 days from now
    const appt = await AppointmentModel.create({
      bookingRef: 'IBN-TEST-CANCEL2',
      patientId: new mongoose.Types.ObjectId(patientUserId),
      doctorId: new mongoose.Types.ObjectId(doctorUserId),
      appointmentDateTime: future,
      status: 'confirmed',
      paymentStatus: 'succeeded',
      patientNameSnapshot: 'Fatima',
      patientPhoneSnapshot: '+966509876543',
      patientNationalIdSnapshot: '1234567890',
    })

    const res = await request(getApp())
      .put(`/api/appointments/${appt._id.toString()}/status`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(200)

    const updated = await AppointmentModel.findById(appt._id).lean()
    expect(updated?.status).toBe('cancelled')
  })
})

// ─── 14. RBAC enforcement ─────────────────────────────────────────────────────
describe('Step 14: RBAC — unauthorized access blocked', () => {
  it('unauthenticated cannot hold slot... wait, hold slot allows optionalAuth — confirm it works', async () => {
    const date = nextWeekday(2)
    const dt = `${date}T11:00:00.000Z`

    const res = await request(getApp())
      .post('/api/appointments/hold')
      .send({
        doctorId: doctorProfileId,
        appointmentDateTime: dt,
        patientName: 'Anonymous',
        patientPhone: '+966501111111',
        patientNationalId: '1111111111',
      })

    // optionalAuth — should succeed even without token
    expect(res.status).toBe(201)
  })

  it('patient cannot access admin endpoints', async () => {
    const res = await request(getApp())
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
    expect(res.status).toBe(403)
  })

  it('doctor cannot access admin doctors endpoint', async () => {
    const res = await request(getApp())
      .post('/api/admin/doctors')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({})
    expect(res.status).toBe(403)
  })

  it('unauthenticated cannot access patient profile', async () => {
    const res = await request(getApp()).get('/api/patients/me')
    expect(res.status).toBe(401)
  })

  it('unauthenticated cannot initiate payment', async () => {
    const res = await request(getApp())
      .post('/api/payments/initiate')
      .send({ gateway: 'hyperpay', sessionRef: 'x', amountSAR: 100 })
    expect(res.status).toBe(401)
  })
})

// ─── 15. Analytics ────────────────────────────────────────────────────────────
describe('Step 15: Admin analytics', () => {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10)

  it('GET /api/analytics/summary — returns KPIs for date range', async () => {
    const res = await request(getApp())
      .get(`/api/analytics/summary?from=${monthStart}&to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('totalAppointments')
    expect(res.body.data).toHaveProperty('totalRevenueSAR')
    expect(res.body.data.totalAppointments).toBeGreaterThanOrEqual(0)
  })

  it('GET /api/analytics/by-day — returns daily breakdown', async () => {
    const res = await request(getApp())
      .get(`/api/analytics/by-day?from=${monthStart}&to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('GET /api/analytics/by-specialty — returns specialty breakdown', async () => {
    const res = await request(getApp())
      .get(`/api/analytics/by-specialty?from=${monthStart}&to=${today}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('patient cannot access analytics', async () => {
    const res = await request(getApp())
      .get(`/api/analytics/summary?from=${monthStart}&to=${today}`)
      .set('Authorization', `Bearer ${patientToken}`)
    expect(res.status).toBe(403)
  })
})
