import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateRoomInput, UpdateRoomInput } from '@shared/room'

export const roomKeys = {
  all: ['rooms'] as const,
  byHostel: (hostelId: string) => [...roomKeys.all, { hostelId }] as const,
}

export function useRoomsForHostel(hostelId: string | undefined) {
  return useQuery({
    queryKey: roomKeys.byHostel(hostelId!),
    queryFn: async () => {
      const { data } = await api.get('/v1/rooms', { params: { hostelId } })
      return data.data
    },
    enabled: !!hostelId,
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRoomInput) => {
      const { data } = await api.post('/v1/rooms', input)
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roomKeys.byHostel(variables.hostelId) })
    }
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: UpdateRoomInput, hostelId: string }) => {
      const response = await api.patch(`/v1/rooms/${id}`, data)
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roomKeys.byHostel(variables.hostelId) })
    }
  })
}

export function useDeactivateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string, hostelId: string }) => {
      const response = await api.delete(`/v1/rooms/${id}`)
      return response.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: roomKeys.byHostel(variables.hostelId) })
    }
  })
}
