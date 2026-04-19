import { Router } from 'express'
import * as controller from './appointments.controller'
import { verifyToken, checkRole, optionalAuth } from '../auth/auth.middleware'

const router = Router()

// ── Public routes ─────────────────────────────────────────────────────────────
// GET /api/appointments/slots?doctorId=&date=
router.get('/slots', controller.getAvailableSlots)

// POST /api/appointments/hold — any user (incl. anonymous)
router.post('/hold', optionalAuth, controller.holdSlot)

// POST /api/appointments/confirm — called by payment webhook (internal)
router.post('/confirm', controller.confirmAppointment)

// ── Authenticated routes ───────────────────────────────────────────────────────
// GET /api/appointments — role-scoped list
router.get('/', verifyToken, controller.listAppointments)

// GET /api/appointments/:id
router.get('/:id', verifyToken, controller.getAppointmentById)

// PUT /api/appointments/:id/status — patient cancel | doctor complete | admin any
router.put('/:id/status', verifyToken, controller.updateStatus)

// POST /api/appointments/:id/notes — doctor only
router.post('/:id/notes', verifyToken, checkRole('doctor'), controller.saveNote)

export { router as appointmentsRouter }
