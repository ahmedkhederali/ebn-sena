export type AppointmentStatus =
  | 'pending-payment'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export type PaymentGateway = 'hyperpay' | 'stripe'

export interface TimeSlot {
  time: string      // "HH:mm" 24h
  available: boolean
}

export interface AvailableSlotsResponse {
  doctorId: string
  date: string      // YYYY-MM-DD
  slotDurationMinutes: number
  slots: TimeSlot[]
}

export interface SlotHoldResponse {
  holdId: string
  sessionRef: string
  expiresAt: string
  doctorName: string
  appointmentDateTime: string
  consultationFeeSAR: number
}

export interface AppointmentSummary {
  id: string
  bookingRef: string
  appointmentDateTime: string
  status: AppointmentStatus
  doctor: {
    id: string
    nameAr: string
    nameEn: string
    specialty: string
  }
  consultationFeeSAR: number
  hasNote: boolean
  hasReceipt: boolean
}
