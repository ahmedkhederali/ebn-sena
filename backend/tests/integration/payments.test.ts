import request from 'supertest'
import { setupTestDb, teardownTestDb, getApp, createTestUser, loginAs } from './helpers'

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await teardownTestDb()
})

describe('Payments', () => {
  it('unauthenticated initiate returns 401', async () => {
    const res = await request(getApp())
      .post('/api/payments/initiate')
      .send({ appointmentId: 'fake-id', gateway: 'hyperpay' })

    expect(res.status).toBe(401)
  })

  it('initiate with invalid appointmentId returns 404 or 400', async () => {
    const { user, password } = await createTestUser({
      role: 'patient',
      email: `patient-pay-${Date.now()}@test.com`,
    })
    const token = (await loginAs(user.email, password)) ?? ''

    const res = await request(getApp())
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointmentId: '000000000000000000000000', gateway: 'hyperpay' })

    expect([400, 404]).toContain(res.status)
  })

  it('webhook endpoint always returns 200', async () => {
    const res = await request(getApp())
      .post('/api/payments/webhook/hyperpay')
      .send({ id: 'test', paymentType: 'DB', result: { code: '000.000.000' } })

    expect(res.status).toBe(200)
  })

  it('stripe webhook endpoint always returns 200', async () => {
    const res = await request(getApp())
      .post('/api/payments/webhook/stripe')
      .set('stripe-signature', 'invalid')
      .send('{}')

    expect(res.status).toBe(200)
  })

  it('get payment without auth returns 401', async () => {
    const res = await request(getApp()).get('/api/payments/some-payment-id')
    expect(res.status).toBe(401)
  })
})
