import request from 'supertest'
import { setupTestDb, teardownTestDb, getApp, createTestUser } from './helpers'

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await teardownTestDb()
})

describe('POST /api/auth/register', () => {
  it('creates a patient account and returns tokens', async () => {
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({
        email: 'newpatient@test.com',
        password: 'Test1234!',
        nameAr: 'مريض جديد',
        nameEn: 'New Patient',
        phone: '+966501234567',
        preferredLanguage: 'en',
        consentGiven: true,
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('userId')
  })

  it('rejects duplicate email', async () => {
    await createTestUser({ email: 'dup@test.com' })
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({
        email: 'dup@test.com',
        password: 'Test1234!',
        nameAr: 'مريض',
        nameEn: 'Patient',
        phone: '+966501234568',
        preferredLanguage: 'en',
        consentGiven: true,
      })

    expect(res.status).toBe(409)
  })

  it('rejects weak password', async () => {
    const res = await request(getApp())
      .post('/api/auth/register')
      .send({
        email: 'weak@test.com',
        password: '123',
        nameAr: 'مريض',
        nameEn: 'Patient',
        phone: '+966501234569',
        preferredLanguage: 'en',
        consentGiven: true,
      })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('returns accessToken and sets refresh cookie for valid credentials', async () => {
    const { user, password } = await createTestUser({ email: 'logintest@test.com' })

    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email: user.email, password })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('accessToken')
    // refreshToken is set as an httpOnly cookie
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const { user } = await createTestUser({ email: 'wrongpass@test.com' })

    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPassword1!' })

    expect(res.status).toBe(401)
  })

  it('rejects unknown email', async () => {
    const res = await request(getApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Test1234!' })

    expect(res.status).toBe(401)
  })
})
