import { Request, Response, NextFunction } from 'express'
import { sendSuccess } from '../../shared/utils/apiResponse'
import { AppError } from '../../shared/middleware/errorHandler'
import * as doctorsService from './doctors.service'
import type { ListDoctorsQuery } from './doctors.service'

// GET /api/services
export async function getServices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const services = await doctorsService.listServices()
    sendSuccess(res, services)
  } catch (err) {
    next(err)
  }
}

// GET /api/services/:id
export async function getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id']
    if (typeof id !== 'string' || !id) throw new AppError(400, 'INVALID_ID', 'Service ID is required')
    const service = await doctorsService.getServiceById(id)
    sendSuccess(res, service)
  } catch (err) {
    next(err)
  }
}

// GET /api/doctors
export async function getDoctors(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { specialtyId, cursor, limit } = req.query
    // Build query without undefined values (exactOptionalPropertyTypes safe)
    const query: ListDoctorsQuery = {}
    if (typeof specialtyId === 'string') query.specialtyId = specialtyId
    if (typeof cursor === 'string') query.cursor = cursor
    if (typeof limit === 'string' && limit) query.limit = Number(limit)

    const result = await doctorsService.listDoctors(query)

    sendSuccess(res, result.doctors, 200, {
      cursor: result.cursor,
      hasMore: result.hasMore,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/doctors/:id
export async function getDoctorById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id']
    if (typeof id !== 'string' || !id) throw new AppError(400, 'INVALID_ID', 'Doctor ID is required')
    const doctor = await doctorsService.getDoctorById(id)
    sendSuccess(res, doctor)
  } catch (err) {
    next(err)
  }
}
