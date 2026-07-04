import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ImportJobStatus } from '@shared/student'

// ─── Upload mutation ──────────────────────────────────────────────────────────
// Called once when the admin submits the CSV file.
// Returns { jobId } from the 202 response.
export function useUploadStudentCsv() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ jobId: string }> => {
      const formData = new FormData()
      formData.append('file', file)

      const { data } = await api.post<{ success: boolean; data: { jobId: string } }>(
        '/v1/users/bulk-upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return data.data
    },
  })
}

// ─── Status query ─────────────────────────────────────────────────────────────
// Polls the status endpoint every 2 seconds while the job is active.
// Automatically stops polling when the job reaches 'completed' or 'failed'.
export function useImportJobStatus(jobId: string | null) {
  return useQuery<ImportJobStatus>({
    queryKey: ['student-import', 'status', jobId],
    queryFn: async (): Promise<ImportJobStatus> => {
      const { data } = await api.get<{ success: boolean; data: ImportJobStatus }>(
        `/v1/users/bulk-upload/${jobId}/status`
      )
      return data.data
    },
    enabled: !!jobId, // only run when we have a jobId
    refetchInterval: (query) => {
      const state = query.state.data?.state
      // Stop polling when the job is done
      if (state === 'completed' || state === 'failed') return false
      return 2_000 // poll every 2 seconds while active/waiting
    },
    staleTime: 0, // always refetch on every interval tick
  })
}
