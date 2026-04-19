import mongoose, { Schema, type Document, type Model } from 'mongoose'
import type { AppointmentStatus, PaymentStatus } from '@shared/types/appointment.types'

// ── Availability Schedule ─────────────────────────────────────────────────────
interface IAvailabilitySchedule {
  doctorId: mongoose.Types.ObjectId
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  startTime: string    // "HH:mm"
  endTime: string      // "HH:mm"
  slotDurationMinutes: number
  isActive: boolean
}
interface IAvailabilityScheduleDocument extends IAvailabilitySchedule, Document {}

const availabilityScheduleSchema = new Schema<IAvailabilityScheduleDocument>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDurationMinutes: { type: Number, enum: [15, 20, 30, 45, 60], default: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)
availabilityScheduleSchema.index({ doctorId: 1, dayOfWeek: 1 })

export const AvailabilityScheduleModel: Model<IAvailabilityScheduleDocument> =
  mongoose.model('AvailabilitySchedule', availabilityScheduleSchema)

// ── Unavailability Block ───────────────────────────────────────────────────────
interface IUnavailabilityBlock {
  doctorId: mongoose.Types.ObjectId
  startDate: Date
  endDate: Date
  reason: 'vacation' | 'leave' | 'training' | 'other'
  notes?: string
}
interface IUnavailabilityBlockDocument extends IUnavailabilityBlock, Document {}

const unavailabilityBlockSchema = new Schema<IUnavailabilityBlockDocument>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, enum: ['vacation', 'leave', 'training', 'other'], required: true },
    notes: { type: String },
  },
  { timestamps: true },
)
unavailabilityBlockSchema.index({ doctorId: 1, startDate: 1, endDate: 1 })

export const UnavailabilityBlockModel: Model<IUnavailabilityBlockDocument> =
  mongoose.model('UnavailabilityBlock', unavailabilityBlockSchema)

// ── SlotHold (TTL) ─────────────────────────────────────────────────────────────
export interface ISlotHold {
  doctorId: mongoose.Types.ObjectId
  appointmentDateTime: Date
  sessionRef: string
  patientId?: mongoose.Types.ObjectId
  patientNationalIdHash?: string
  expiresAt: Date
}
interface ISlotHoldDocument extends ISlotHold, Document {}

const slotHoldSchema = new Schema<ISlotHoldDocument>(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDateTime: { type: Date, required: true },
    sessionRef: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User' },
    patientNationalIdHash: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// CRITICAL: unique compound index prevents double-booking race condition
slotHoldSchema.index({ doctorId: 1, appointmentDateTime: 1 }, { unique: true })
// CRITICAL: TTL index — MongoDB auto-deletes expired holds
slotHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
slotHoldSchema.index({ sessionRef: 1 }, { unique: true })

export const SlotHoldModel: Model<ISlotHoldDocument> = mongoose.model('SlotHold', slotHoldSchema)

// ── Appointment ───────────────────────────────────────────────────────────────
export interface IAppointment {
  bookingRef: string
  patientId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  appointmentDateTime: Date
  slotDurationMinutes: number
  status: AppointmentStatus
  paymentStatus: PaymentStatus
  paymentId?: mongoose.Types.ObjectId
  cancelledBy?: mongoose.Types.ObjectId
  cancelledAt?: Date
  cancellationReason?: string
  patientNameSnapshot: string
  patientPhoneSnapshot: string
  patientNationalIdSnapshot: string
  patientNotes?: string
  bookedAnonymously: boolean
  createdAt: Date
  updatedAt: Date
}
export interface IAppointmentDocument extends IAppointment, Document {
  _id: mongoose.Types.ObjectId
}

// Auto-increment booking ref counter
const bookingRefCounterSchema = new Schema({ seq: { type: Number, default: 0 } })
const BookingRefCounter = mongoose.model('BookingRefCounter', bookingRefCounterSchema)

export async function getNextBookingRef(): Promise<string> {
  const year = new Date().getFullYear()
  const counter = await BookingRefCounter.findOneAndUpdate(
    {},
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  )
  const seq = String(counter?.seq ?? 1).padStart(5, '0')
  return `IBN-${year}-${seq}`
}

const appointmentSchema = new Schema<IAppointmentDocument>(
  {
    bookingRef: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDateTime: { type: Date, required: true },
    slotDurationMinutes: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['pending-payment', 'confirmed', 'completed', 'cancelled', 'no-show'] satisfies AppointmentStatus[],
      default: 'pending-payment',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded'] satisfies PaymentStatus[],
      default: 'pending',
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    patientNameSnapshot: { type: String, required: true },
    patientPhoneSnapshot: { type: String, required: true },
    patientNationalIdSnapshot: { type: String, required: true },
    patientNotes: { type: String },
    bookedAnonymously: { type: Boolean, default: true },
  },
  { timestamps: true },
)

appointmentSchema.index({ patientId: 1, appointmentDateTime: -1 })
appointmentSchema.index({ doctorId: 1, appointmentDateTime: 1, status: 1 })
appointmentSchema.index({ status: 1, appointmentDateTime: 1 })
appointmentSchema.index({ appointmentDateTime: 1 })

export const AppointmentModel: Model<IAppointmentDocument> = mongoose.model(
  'Appointment',
  appointmentSchema,
)

// ── Consultation Note ─────────────────────────────────────────────────────────
interface IConsultationNote {
  appointmentId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  patientId: mongoose.Types.ObjectId
  noteText: string
  editableUntil: Date
}
interface IConsultationNoteDocument extends IConsultationNote, Document {}

const consultationNoteSchema = new Schema<IConsultationNoteDocument>(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    noteText: { type: String, required: true, maxlength: 5000 },
    editableUntil: { type: Date, required: true },
  },
  { timestamps: true },
)
consultationNoteSchema.index({ appointmentId: 1, doctorId: 1 }, { unique: true })
consultationNoteSchema.index({ patientId: 1, createdAt: -1 })

export const ConsultationNoteModel: Model<IConsultationNoteDocument> = mongoose.model(
  'ConsultationNote',
  consultationNoteSchema,
)
