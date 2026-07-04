'use client'

import { createFileRoute, redirect } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { fetchMe } from '@/lib/auth'
import { useUploadStudentCsv, useImportJobStatus } from '@/hooks/useStudentImport'
import { queryClient } from '@/lib/queryClient'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// ─── Route definition & role guard ───────────────────────────────────────────
export const Route = createFileRoute('/admin/users')({
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: fetchMe,
      })
      if (!user || user.role !== 'ADMIN') throw redirect({ to: '/login' })
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminUsersPage,
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface RowError {
  row: number
  rollNumber: string
  reason: string
}

// ─── Component ────────────────────────────────────────────────────────────────
function AdminUsersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<RowError[] | null>(null)

  const uploadMutation = useUploadStudentCsv()
  const statusQuery = useImportJobStatus(jobId)

  const jobState = statusQuery.data?.state
  const isDone = jobState === 'completed' || jobState === 'failed'

  // ── File selection ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setValidationErrors(null)
    setJobId(null)
    uploadMutation.reset()
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0] ?? null
    if (file?.name.endsWith('.csv')) {
      setSelectedFile(file)
      setValidationErrors(null)
      setJobId(null)
      uploadMutation.reset()
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!selectedFile) return
    setValidationErrors(null)

    try {
      const { jobId: newJobId } = await uploadMutation.mutateAsync(selectedFile)
      setJobId(newJobId)
    } catch (err: any) {
      // Server returned 400 with row-level validation errors
      const serverErrors = err?.response?.data?.errors as RowError[] | undefined
      if (serverErrors) setValidationErrors(serverErrors)
    }
  }

  // ── Reset for a new upload ────────────────────────────────────────────────
  function handleReset() {
    setSelectedFile(null)
    setJobId(null)
    setValidationErrors(null)
    uploadMutation.reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
    // Invalidate the students list so the table refreshes
    queryClient.invalidateQueries({ queryKey: ['students'] })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Management</h1>
        <p className="text-muted-foreground mt-1">
          Upload a CSV to bulk-provision student accounts for the active academic year.
        </p>
      </div>

      {/* ── Drop zone ── */}
      {!jobId && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer',
            'transition-colors hover:border-primary hover:bg-muted/40',
            selectedFile && 'border-primary bg-muted/20'
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <p className="text-sm font-medium">
              📄 {selectedFile.name}{' '}
              <span className="text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </p>
          ) : (
            <>
              <p className="text-sm font-medium">Drop your CSV here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Columns required: name, rollNumber, branch, email, hostelCode, gmailId, outlookId
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Validation errors from server (pre-queue 400) ── */}
      {validationErrors && validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>CSV Validation Failed</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Fix the following rows and re-upload:</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {validationErrors.map((e) => (
                <div key={e.row} className="text-xs font-mono">
                  Row {e.row} ({e.rollNumber}): {e.reason}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Upload button ── */}
      {selectedFile && !jobId && (
        <Button
          onClick={handleUpload}
          disabled={uploadMutation.isPending}
          className="w-full"
        >
          {uploadMutation.isPending ? 'Uploading...' : `Upload ${selectedFile.name}`}
        </Button>
      )}

      {/* ── Progress bar (shown while job is active/waiting) ── */}
      {jobId && !isDone && (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Importing students…</span>
            <span className="text-muted-foreground">{statusQuery.data?.progress ?? 0}%</span>
          </div>
          <Progress value={statusQuery.data?.progress ?? 0} />
          <p className="text-xs text-muted-foreground">
            Job ID: <span className="font-mono">{jobId}</span>
          </p>
        </div>
      )}

      {/* ── Result (completed) ── */}
      {isDone && jobState === 'completed' && statusQuery.data?.result && (
        <div className="space-y-4">
          <Alert variant={statusQuery.data.result.failureCount > 0 ? 'default' : 'default'}>
            <AlertTitle>Import Complete</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>✅ {statusQuery.data.result.successCount} students created successfully</p>
              {statusQuery.data.result.failureCount > 0 && (
                <p>⚠️ {statusQuery.data.result.failureCount} rows failed</p>
              )}
            </AlertDescription>
          </Alert>

          {/* Row-level errors from the worker */}
          {statusQuery.data.result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Failed rows:</p>
              <div className="max-h-64 overflow-y-auto rounded-lg border p-3 space-y-1">
                {statusQuery.data.result.errors.map((e) => (
                  <div key={`${e.row}-${e.rollNumber}`} className="text-xs font-mono">
                    Row {e.row} ({e.rollNumber}): {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="outline" onClick={handleReset} className="w-full">
            Upload another CSV
          </Button>
        </div>
      )}

      {/* ── Result (failed — worker-level crash) ── */}
      {isDone && jobState === 'failed' && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Import Job Failed</AlertTitle>
            <AlertDescription>
              {statusQuery.data?.failedReason ?? 'An unknown error occurred in the worker.'}
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={handleReset} className="w-full">
            Try again
          </Button>
        </div>
      )}

      {/* ── CSV format reference ── */}
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-semibold mb-2">CSV Format Reference</p>
        <code className="block text-xs bg-muted rounded p-2 overflow-x-auto">
          name,rollNumber,branch,email,hostelCode,gmailId,outlookId{'\n'}
          Arjun Sharma,230101001,CSE,230101001@iitg.ac.in,BH1,arjun@gmail.com,a.sharma@iitg.ac.in
        </code>
        <p className="text-muted-foreground mt-2 text-xs">
          Maximum 5,000 rows per file. File size limit: 5 MB.
        </p>
      </div>
    </div>
  )
}
