import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useOnboardedStudents, useVerifyStudent, useAllocateRoom } from '@/hooks/useHostelDashboard'
// We don't need useAuth since useMyHostel uses api directly.
// Actually, `useOnboardedStudents` doesn't fetch `myHostel`.
// I will just use `api.get('/v1/hostels/mine')` via a hook if needed.
// Wait, the plan says: `useMyHostel()` hook. Let's create it inline or in the hook file later.
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IconArrowLeft, IconCircleCheck } from '@tabler/icons-react'

export const Route = createFileRoute('/hostel/verify/$studentId')({
  component: VerifyStudent,
})

function useMyHostel() {
  return useQuery({
    queryKey: ['hostel', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/v1/hostels/mine')
      return data.data
    }
  })
}

function VerifyStudent() {
  const { studentId } = Route.useParams()
  const navigate = useNavigate()
  
  // Find the student from the list. Wait, useOnboardedStudents might not have it if accessed directly or paginated. 
  // Let's create a specific fetch for a single student just to be safe, or just filter from the list if it's small.
  // The plan specified `/v1/allocations/student/:rollNumber`, but we're using studentId now. 
  // I'll fetch the specific student.
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      // We can use the students list endpoint and filter, or I'll just add a quick endpoint or find from cache.
      const { data } = await api.get('/v1/onboarding/students')
      return data.data.find((s: any) => s.id === studentId)
    }
  })

  const { data: myHostel } = useMyHostel()
  
  const verifyMutation = useVerifyStudent()
  const allocateMutation = useAllocateRoom()

  const [isVerified, setIsVerified] = useState(false)
  const [needsReview, setNeedsReview] = useState(false)
  const [roomNumber, setRoomNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [success, setSuccess] = useState(false)

  // Initialize checkboxes if student already has them set
  useEffect(() => {
    if (student) {
      setIsVerified(student.isVerified)
      setNeedsReview(student.needsReview)
    }
  }, [student])

  if (studentLoading) return <div className="p-8">Loading student details...</div>
  if (!student) return <div className="p-8">Student not found.</div>

  const handleVerify = async () => {
    await verifyMutation.mutateAsync({ studentId, isVerified, needsReview })
  }

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isVerified) {
      alert("Please mark the student as verified first.")
      return
    }
    if (!myHostel) return

    // Ensure we verify flags first
    await handleVerify()

    await allocateMutation.mutateAsync({
      studentId,
      hostelId: myHostel.id,
      roomNumber,
      notes
    })

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-6">
        <IconCircleCheck className="mx-auto h-16 w-16 text-emerald-500" />
        <h2 className="text-2xl font-bold text-slate-900">Allocation Successful!</h2>
        <p className="text-slate-600">
          {student.name} has been verified and allocated to Room {roomNumber}.
        </p>
        <Button onClick={() => navigate({ to: '/hostel/dashboard' })}>
          Back to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/hostel/dashboard' })}>
          <IconArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Verify & Allocate: {student.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Details</CardTitle>
            <CardDescription>Review the information submitted by the student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <span className="font-semibold text-slate-500">Roll Number:</span>
              <span>{student.rollNumber}</span>
              
              <span className="font-semibold text-slate-500">Email:</span>
              <span>{student.email}</span>

              <span className="font-semibold text-slate-500">Branch:</span>
              <span>{student.branch}</span>

              <span className="font-semibold text-slate-500">Contact:</span>
              <span>{student.contactNumber}</span>
              
              <span className="font-semibold text-slate-500">Blood Group:</span>
              <span>{student.bloodGroup}</span>

              <span className="font-semibold text-slate-500">Emergency Contact:</span>
              <span>{student.emergencyContactName} ({student.emergencyContactRelation})</span>
              
              <span className="font-semibold text-slate-500">Emergency Phone:</span>
              <span>{student.emergencyContactNumber}</span>

              <span className="font-semibold text-slate-500">Medical Conditions:</span>
              <span>{student.medicalConditions || 'None'}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Verification Card */}
          <Card>
            <CardHeader>
              <CardTitle>Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="verified" 
                  checked={isVerified}
                  onCheckedChange={(checked) => setIsVerified(checked === true)}
                />
                <Label htmlFor="verified" className="font-medium cursor-pointer">
                  Mark as Verified
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="review" 
                  checked={needsReview}
                  onCheckedChange={(checked) => setNeedsReview(checked === true)}
                />
                <Label htmlFor="review" className="text-amber-600 font-medium cursor-pointer">
                  Flag for Review
                </Label>
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? 'Saving...' : 'Save Verification Status'}
              </Button>
            </CardContent>
          </Card>

          {/* Allocation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Room Allocation</CardTitle>
              {student.allocation && (
                <CardDescription className="text-amber-600 font-medium">
                  Note: This student is currently allocated to {student.allocation.room.hostel.code}-{student.allocation.room.roomNumber}.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAllocate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input 
                    id="roomNumber" 
                    placeholder="e.g. A-101" 
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Any allocation notes..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!isVerified || allocateMutation.isPending || !roomNumber}
                >
                  {allocateMutation.isPending ? 'Allocating...' : 'Confirm Allocation'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
