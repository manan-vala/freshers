import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useVerifyStudent, useAllocateRoom } from '@/hooks/useHostelDashboard'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  IconArrowLeft,
  IconCircleCheck,
  IconUser,
  IconMail,
  IconPhone,
  IconDroplet,
  IconShieldCheck,
  IconAlertTriangle,
  IconBed,
  IconLoader2,
} from '@tabler/icons-react'

export const Route = createFileRoute('/hostel/verify/$studentId')({
  component: VerifyStudent,
})

const PRIMARY = 'oklch(0.852 0.199 91.936)'
const PRIMARY_FG = 'oklch(0.421 0.095 57.708)'

function useMyHostel() {
  return useQuery({
    queryKey: ['hostel', 'mine'],
    queryFn: async () => {
      const { data } = await api.get('/v1/hostels/mine')
      return data.data
    }
  })
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm text-slate-800 font-medium break-all">{value || <span className="text-slate-300 italic font-normal">—</span>}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: 'oklch(0.97 0.04 91.936)', color: PRIMARY_FG }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
  )
}

function VerifyStudent() {
  const { studentId } = Route.useParams()
  const navigate = useNavigate()

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
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

  useEffect(() => {
    if (student) {
      setIsVerified(student.isVerified)
      setNeedsReview(student.needsReview)
    }
  }, [student])

  /* ─── Loading ─── */
  if (studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <IconLoader2 className="h-8 w-8 animate-spin" style={{ color: PRIMARY }} />
          <span className="text-sm font-medium">Loading student details…</span>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-slate-500 font-medium">Student not found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/hostel/dashboard' })}>
            <IconArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const handleVerify = async () => {
    await verifyMutation.mutateAsync({ studentId, isVerified, needsReview })
  }

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isVerified) {
      alert('Please mark the student as verified first.')
      return
    }
    if (!myHostel) return
    await handleVerify()
    await allocateMutation.mutateAsync({ studentId, hostelId: myHostel.id, roomNumber, notes })
    setSuccess(true)
  }

  /* ─── Success screen ─── */
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-sm w-full text-center space-y-5 p-8 bg-white rounded-2xl shadow-sm border">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'oklch(0.96 0.05 152)', color: 'oklch(0.55 0.18 152)' }}
          >
            <IconCircleCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Allocation Successful</h2>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold text-slate-700">{student.name}</span> has been allocated to Room{' '}
              <span className="font-semibold text-slate-700">{roomNumber}</span>.
            </p>
          </div>
          <Button
            className="w-full"
            style={{ background: PRIMARY, color: PRIMARY_FG }}
            onClick={() => navigate({ to: '/hostel/dashboard' })}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const isWrongHostel = student.hostelId && myHostel && student.hostelId !== myHostel.id

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/hostel/dashboard' })}
          className="rounded-lg border text-slate-500 hover:text-slate-900 hover:bg-slate-100 h-9 w-9"
        >
          <IconArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{student.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{student.rollNumber}</p>
        </div>
        {student.isVerified && (
          <Badge className="ml-auto text-xs font-medium" style={{ background: 'oklch(0.96 0.06 152)', color: 'oklch(0.45 0.18 152)', border: 'none' }}>
            ✓ Verified
          </Badge>
        )}
        {student.needsReview && (
          <Badge variant="destructive" className="text-xs font-medium">
            Needs Review
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column: Student Details ─── */}
        <div className="lg:col-span-3 space-y-5">
          {/* Identity */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconUser} title="Identity & Academics" />
            </CardHeader>
            <CardContent className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Programme" value={student.programme} />
              <InfoRow label="Discipline" value={student.discipline} />
              <InfoRow label="Roll Number" value={student.rollNumber} />
              <InfoRow label="Gmail ID" value={student.gmailId} />
              <InfoRow label="Outlook ID" value={student.outlookId} />
              <InfoRow label="Date of Birth" value={student.dob} />
              <InfoRow label="Gender" value={student.gender} />
              <InfoRow label="Country" value={student.country} />
              <InfoRow label="State" value={student.state} />
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Permanent Address" value={student.permanentAddress} />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconPhone} title="Contact & Emergency" />
            </CardHeader>
            <CardContent className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Phone" value={student.contactNumber} />
              <InfoRow label="Alternate Phone" value={student.alternateContactNumber} />
              <InfoRow label="Emergency Name" value={student.emergencyContactName} />
              <InfoRow label="Relation" value={student.emergencyContactRelation} />
              <InfoRow label="Emergency Phone" value={student.emergencyContactNumber} />
            </CardContent>
          </Card>

          {/* Medical */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconDroplet} title="Medical Information" />
            </CardHeader>
            <CardContent className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              <InfoRow label="Blood Group" value={student.bloodGroup?.replace(/_/g, ' ')} />
              <InfoRow label="Identification Mark" value={student.identificationMark} />
              <InfoRow label="Handicapped" value={student.isHandicapped ? 'Yes' : 'No'} />
              {student.isHandicapped && <InfoRow label="Details" value={student.handicapDetails} />}
              <div className="col-span-2 sm:col-span-3">
                <InfoRow label="Medical Conditions" value={student.medicalConditions} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: Actions ─── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Verification */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconShieldCheck} title="Verification" />
            </CardHeader>
            <CardContent className="px-6 py-5 space-y-4">
              {/* Verified toggle */}
              <label
                htmlFor="verified"
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
              >
                <Checkbox
                  id="verified"
                  checked={isVerified}
                  onCheckedChange={(checked) => setIsVerified(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Mark as Verified</p>
                  <p className="text-xs text-slate-400 mt-0.5">Confirms documents & details are correct</p>
                </div>
              </label>

              {/* Needs review toggle */}
              <label
                htmlFor="review"
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${needsReview ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
              >
                <Checkbox
                  id="review"
                  checked={needsReview}
                  onCheckedChange={(checked) => setNeedsReview(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Flag for Review</p>
                  <p className="text-xs text-slate-400 mt-0.5">Marks record for follow-up by admin</p>
                </div>
              </label>

              <Button
                variant="secondary"
                className="w-full h-9 text-sm font-semibold"
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <><IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  'Save Verification Status'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Allocation */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconBed} title="Room Allocation" />
              {student.allocation ? (
                <CardDescription className="text-amber-600 font-medium text-xs mt-1 flex items-center gap-1">
                  <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Currently in {student.allocation.room.hostel.code}‑{student.allocation.room.roomNumber}
                </CardDescription>
              ) : (
                <CardDescription className="text-xs mt-1">
                  Pre-assigned hostel:{' '}
                  <span className="font-semibold text-slate-700">
                    {student.hostel?.name?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="px-6 py-5">
              {isWrongHostel ? (
                <div className="flex gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <IconAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Wrong hostel</p>
                    <p className="mt-0.5 text-red-600">
                      This student is pre-assigned to <span className="font-semibold">{student.hostel?.code}</span>. You cannot allocate them here.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAllocate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="roomNumber" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Room Number
                    </Label>
                    <Input
                      id="roomNumber"
                      placeholder="e.g. A-101"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Notes <span className="font-normal text-slate-400 normal-case">(optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Any allocation notes…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="text-sm bg-slate-50 border-slate-200 focus:bg-white resize-none min-h-[72px]"
                    />
                  </div>

                  {!isVerified && roomNumber && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <IconAlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Please verify the student first.
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-9 text-sm font-semibold"
                    style={{ background: PRIMARY, color: PRIMARY_FG }}
                    disabled={!isVerified || allocateMutation.isPending || !roomNumber}
                  >
                    {allocateMutation.isPending ? (
                      <><IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> Allocating…</>
                    ) : (
                      'Confirm Allocation'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Email summary */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="px-6 pt-0 pb-3 border-b">
              <SectionHeader icon={IconMail} title="Email Addresses" />
            </CardHeader>
            <CardContent className="px-6 py-5 space-y-3">
              <InfoRow label="Gmail (Personal)" value={student.gmailId} />
              <InfoRow label="Outlook (IITG)" value={student.outlookId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
