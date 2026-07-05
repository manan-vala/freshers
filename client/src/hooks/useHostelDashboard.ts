import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AllocationInput } from '@shared/allocation'

export const hostelKeys = {
  all: ['hostel'] as const,
  stats: () => [...hostelKeys.all, 'stats'] as const,
  students: (search?: string) => [...hostelKeys.all, 'students', { search }] as const,
  student: (id: string) => [...hostelKeys.all, 'student', id] as const,
  myHostel: () => [...hostelKeys.all, 'myHostel'] as const,
}

export function useHostelStats() {
  return useQuery({
    queryKey: hostelKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get('/v1/dashboard/hostel')
      return data.data
    }
  })
}

export function useOnboardedStudents(search?: string) {
  return useQuery({
    queryKey: hostelKeys.students(search),
    queryFn: async () => {
      const { data } = await api.get('/v1/onboarding/students', { params: { search } })
      return data.data
    }
  })
}

export function useVerifyStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, isVerified, needsReview }: { studentId: string, isVerified: boolean, needsReview: boolean }) => {
      const { data } = await api.patch(`/v1/onboarding/students/${studentId}/verify`, { isVerified, needsReview })
      return data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: hostelKeys.all })
      queryClient.invalidateQueries({ queryKey: ['student', variables.studentId] })
    }
  })
}

export function useAllocateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: AllocationInput) => {
      const { data } = await api.post('/v1/allocations', input)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hostelKeys.all })
    }
  })
}
