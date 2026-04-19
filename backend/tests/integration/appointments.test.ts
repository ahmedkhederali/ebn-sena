import request from 'supertest'
import { setupTestDb, teardownTestDb, getApp, createTestUser, loginAs } from './helpers'
import { DoctorProfileModel, ServiceModel } from '../../src/features/doctors/doctors.schema'
import { AvailabilityScheduleModel } from '../../src/features/appointments/appointments.schema'

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await teardownTestDb()
})

describe('Appointments booking flow', () => {
  let patientToken: string
  let doctorProfileId: string

  beforeEach(async () => {
    const { user, password } = await createTestUser({
      role: 'patient',
      email: `patient-appt-${Date.now()}@test.com`,
    })
    patientToken = (await loginAs(user.email, password)) ?? ''

    const { user: docUser } = await createTestUser({
      role: 'doctor',
      email: `doctor-appt-${Date.now()}@test.com`,
    })

    const specialty = await ServiceModel.create({
      nameAr: 'طب عام',
      nameEn: 'General Practice',
      isActive: true,
      sortOrder: 1,
    })

    const profile = await DoctorProfileModel.create({
      userId: docUser._id,
      specialtyId: specialty._id,
      consultationFeeSAR: 150,
      isActive: true,
    })
    doctorProfileId = String(profile._id)

    // Add availability for next Monday (day 1)
    await AvailabilityScheduleModel.create({
      doctorId: docUser._id,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      isActive: true,
    })
  })

  it('patient can view available slots', async () => {
    // Find next Monday
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
    const date = d.toISOString().slice(0, 10)

    const res = await request(getApp())
      .get(`/api/appointments/slots?doctorId=${doctorProfileId}&date=${date}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.slots)).toBe(true)
  })

  it('unauthenticated user can view doctor list', async () => {
    const res = await request(getApp()).get('/api/doctors')
    expect(res.status).toBe(200)
  })

  it('initiate payment requires auth', async () => {
    const res = await request(getApp())
      .post('/api/payments/initiate')
      .send({ gateway: 'stripe', sessionRef: 'test', amountSAR: 100 })

    expect(res.status).toBe(401)
  })
})

describe('Patient appointment management', () => {
  it('patient can view their appointments', async () => {
    const { user, password } = await createTestUser({
      role: 'patient',
      email: `patient-list-${Date.now()}@test.com`,
    })
    const token = (await loginAs(user.email, password)) ?? ''

    const res = await request(getApp())
      .get('/api/patients/me/appointments')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('patient can view their profile', async () => {
    const { user, password } = await createTestUser({
      role: 'patient',
      email: `patient-profile-${Date.now()}@test.com`,
    })
    const token = (await loginAs(user.email, password)) ?? ''

    const res = await request(getApp())
      .get('/api/patients/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('nameEn')
  })
})
