import { z } from 'zod'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const availableSlotsSchema = z.object({
  doctorId: z.string().min(1, 'doctorId is required'),
  date: z.string().regex(DATE_REGEX, 'date must be YYYY-MM-DD format'),
})

export const holdSlotSchema = z.object({
  doctorId: z.string().min(1, 'doctorId is required'),
  appointmentDateTime: z.string().datetime({ message: 'appointmentDateTime must be ISO 8601' }),
  patientName: z.string().min(2, 'Patient name is required'),
  patientPhone: z.string().regex(/^\+9665\d{8}$/, 'Phone must be Saudi format: +9665XXXXXXXX'),
  patientNationalId: z
    .string()
    .regex(/^\d{10}$/, 'National ID must be exactly 10 digits'),
  patientNotes: z.string().max(500).optional(),
})

export const confirmAppointmentSchema = z.object({
  sessionRef: z.string().min(1),
  paymentId: z.string().min(1),
  gateway: z.enum(['hyperpay', 'stripe']),
})

export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'cancelled', 'no-show', 'confirmed']),
  cancellationReason: z.string().max(500).optional(),
})

export const saveNoteSchema = z.object({
  noteText: z.string().min(1).max(5000, 'Note cannot exceed 5000 characters'),
})

export const listAppointmentsSchema = z.object({
  status: z
    .enum(['pending-payment', 'confirmed', 'completed', 'cancelled', 'no-show'])
    .optional(),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  from: z.string().regex(DATE_REGEX).optional(),
  to: z.string().regex(DATE_REGEX).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export type HoldSlotInput = z.infer<typeof holdSlotSchema>
export type ListAppointmentsInput = z.infer<typeof listAppointmentsSchema>
