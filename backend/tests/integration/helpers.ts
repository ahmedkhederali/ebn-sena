import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../../src/app'
import type { Application } from 'express'
import { UserModel } from '../../src/features/auth/auth.schema'
import bcrypt from 'bcryptjs'

let replSet: MongoMemoryReplSet
let app: Application

export async function setupTestDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  const uri = replSet.getUri()
  await mongoose.connect(uri)
  app = createApp()
}

export async function teardownTestDb() {
  await mongoose.disconnect()
  await replSet.stop()
}

export function getApp() {
  return app
}

export async function createTestUser(overrides: {
  email?: string
  password?: string
  role?: string
  nameAr?: string
  nameEn?: string
}) {
  const password = overrides.password ?? 'Test1234!'
  const hash = await bcrypt.hash(password, 10)
  const user = await UserModel.create({
    email: overrides.email ?? `test-${Date.now()}@example.com`,
    passwordHash: hash,
    role: overrides.role ?? 'patient',
    nameAr: overrides.nameAr ?? 'مريض تجريبي',
    nameEn: overrides.nameEn ?? 'Test Patient',
    phone: '+966500000000',
    isEmailVerified: true,
    emailVerified: true,
    isActive: true,
    preferredLanguage: 'en',
    consentGiven: true,
    consentTimestamp: new Date(),
  })
  return { user, password }
}

export async function loginAs(email: string, password: string) {
  const appInstance = getApp()
  const res = await request(appInstance)
    .post('/api/auth/login')
    .send({ email, password })
  return res.body.data?.accessToken as string | undefined
}
