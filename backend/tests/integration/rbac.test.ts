import request from 'supertest'
import { setupTestDb, teardownTestDb, getApp, createTestUser, loginAs } from './helpers'

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await teardownTestDb()
})

describe('Role-based access control', () => {
  it('patient cannot access admin endpoints', async () => {
    const { user, password } = await createTestUser({ role: 'patient', email: 'patient-rbac@test.com' })
    const token = await loginAs(user.email, password)

    const res = await request(getApp())
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${token ?? ''}`)

    expect(res.status).toBe(403)
  })

  it('unauthenticated request returns 401', async () => {
    const res = await request(getApp()).get('/api/patients/me')
    expect(res.status).toBe(401)
  })

  it('admin can access admin endpoints', async () => {
    const { user, password } = await createTestUser({ role: 'admin', email: 'admin-rbac@test.com' })
    const token = await loginAs(user.email, password)

    const res = await request(getApp())
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${token ?? ''}`)

    expect([200, 404]).toContain(res.status)
  })

  it('receptionist can access appointment management', async () => {
    const { user, password } = await createTestUser({ role: 'receptionist', email: 'receptionist-rbac@test.com' })
    const token = await loginAs(user.email, password)

    const res = await request(getApp())
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${token ?? ''}`)

    expect([200, 404]).toContain(res.status)
  })

  it('doctor cannot access admin patient management', async () => {
    const { user, password } = await createTestUser({ role: 'doctor', email: 'doctor-rbac@test.com' })
    const token = await loginAs(user.email, password)

    const res = await request(getApp())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token ?? ''}`)

    expect(res.status).toBe(403)
  })

  it('expired/invalid token returns 401', async () => {
    const res = await request(getApp())
      .get('/api/patients/me')
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
  })
})
