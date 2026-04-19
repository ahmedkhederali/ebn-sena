import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { apiClient } from '../../../shared/api/client'
import type { SlotHoldResponse } from '@shared/types/appointment.types'

export interface HoldSlotPayload {
  doctorId: string
  appointmentDateTime: string   // ISO 8601
  patientName: string
  patientPhone: string
  patientNationalId: string
  patientNotes?: string
}

async function holdSlot(payload: HoldSlotPayload): Promise<SlotHoldResponse> {
  const { data } = await apiClient.post<{ success: true; data: SlotHoldResponse }>(
    '/appointments/hold',
    payload,
  )
  return data.data
}

interface UseBookAppointmentOptions {
  onSuccess?: (data: SlotHoldResponse) => void
  onError?: (code: string, message: string) => void
}

export function useBookAppointment({ onSuccess, onError }: UseBookAppointmentOptions = {}) {
  return useMutation({
    mutationFn: holdSlot,
    onSuccess,
    onError: (error) => {
      if (error instanceof AxiosError) {
        const code = (error.response?.data as { error?: { code?: string; message?: string } })?.error
        onError?.(code?.code ?? 'UNKNOWN', code?.message ?? 'Booking failed')
      } else {
        onError?.('UNKNOWN', 'Booking failed')
      }
    },
  })
}
