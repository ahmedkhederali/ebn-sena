import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../shared/api/client'
import type { AvailableSlotsResponse } from '@shared/types/appointment.types'

async function fetchSlots(doctorId: string, date: string): Promise<AvailableSlotsResponse> {
  const { data } = await apiClient.get<{ success: true; data: AvailableSlotsResponse }>(
    '/appointments/slots',
    { params: { doctorId, date } },
  )
  return data.data
}

interface UseAvailableSlotsOptions {
  doctorId: string | null
  date: string | null  // YYYY-MM-DD
}

export function useAvailableSlots({ doctorId, date }: UseAvailableSlotsOptions) {
  return useQuery({
    queryKey: ['slots', doctorId, date],
    queryFn: () => fetchSlots(doctorId!, date!),
    enabled: Boolean(doctorId && date),
    // Poll every 5 s while the component is mounted — keeps availability fresh
    refetchInterval: 5_000,
    staleTime: 4_000,
    retry: 2,
  })
}
