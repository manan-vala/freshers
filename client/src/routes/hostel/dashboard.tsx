import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useOnboardedStudents, useHostelStats } from '@/hooks/useHostelDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  IconSearch,
  IconUsers,
  IconBuildingCommunity,
  IconCircleCheck,
  IconAlertCircle,
  IconChevronRight,
} from '@tabler/icons-react'

export const Route = createFileRoute('/hostel/dashboard')({
  component: HostelDashboard,
})

const PRIMARY = 'oklch(0.852 0.199 91.936)'
const PRIMARY_FG = 'oklch(0.421 0.095 57.708)'

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  onClick,
  active,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  accent?: boolean
  onClick?: () => void
  active?: boolean
}) {
  return (
    <Card 
      onClick={onClick}
      className={`shadow-sm bg-white overflow-hidden relative transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
      style={{
        border: active ? `2px solid ${accent ? 'oklch(0.7 0.2 60)' : PRIMARY_FG}` : '2px solid transparent',
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ background: accent ? 'oklch(0.7 0.2 60)' : PRIMARY }}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-0 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </CardTitle>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={accent
            ? { background: 'oklch(0.95 0.05 60)', color: 'oklch(0.65 0.18 60)' }
            : { background: 'oklch(0.97 0.04 91.936)', color: PRIMARY_FG }
          }
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`text-3xl font-bold tracking-tight ${accent ? 'text-amber-600' : 'text-slate-900'}`}>
          {value ?? <span className="text-slate-300">—</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function HostelDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'verified' | 'review'>('all')
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: stats } = useHostelStats()
  const { data: students, isLoading: studentsLoading } = useOnboardedStudents(debouncedSearch)

  const filteredStudents = students?.filter((student: any) => {
    if (filter === 'verified') return student.isVerified;
    if (filter === 'review') return student.needsReview;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage onboarded students and room allocations for your hostel.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconBuildingCommunity} label="Hostel" value={stats?.hostelName?.replace(/_/g, ' ')} />
        <StatCard 
          icon={IconUsers} 
          label="Total Onboarded" 
          value={stats?.totalOnboarded} 
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard 
          icon={IconCircleCheck} 
          label="Verified" 
          value={stats?.totalVerified} 
          onClick={() => setFilter('verified')}
          active={filter === 'verified'}
        />
        <StatCard 
          icon={IconAlertCircle} 
          label="Needs Review" 
          value={stats?.totalNeedingReview} 
          accent 
          onClick={() => setFilter('review')}
          active={filter === 'review'}
        />
      </div>

      {/* Student table */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 pt-0 pb-3 border-b">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Onboarded Students</CardTitle>
            {filteredStudents && (
              <p className="text-xs text-slate-400 mt-0.5">
                {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          <div className="relative w-full sm:w-72">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="search"
              placeholder="Search by name or contact…"
              className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm focus:bg-white transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                  <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Name</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Roll No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Programme</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Discipline</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Gmail ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Outlook ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-400 h-10">Room Status</TableHead>
                  <TableHead className="pr-6 w-8 h-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  /* Skeleton rows */
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b last:border-0">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j} className="pl-6 py-4">
                          <div className="h-3 bg-slate-100 rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredStudents?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                      <IconUsers className="mx-auto h-8 w-8 mb-3 opacity-30" />
                      <p className="font-medium text-sm">No students found</p>
                      {searchTerm && <p className="text-xs mt-1">Try a different search term</p>}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents?.map((student: any) => (
                    <TableRow
                      key={student.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors group"
                      onClick={() => navigate({ to: `/hostel/verify/${student.id}` })}
                    >
                      <TableCell className="pl-6 py-3.5 font-medium text-slate-900 text-sm">
                        {student.name}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-700">
                        {student.rollNumber}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-700">
                        {student.programme}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-700">
                        {student.discipline}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-700 max-w-[160px] truncate">
                        {student.gmailId}
                      </TableCell>
                      <TableCell className="py-3.5 text-sm text-slate-700 max-w-[160px] truncate">
                        {student.outlookId}
                      </TableCell>
                      <TableCell className="py-3.5">
                        {student.allocation ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium px-2 py-0.5"
                            style={{ background: 'oklch(0.97 0.04 91.936)', color: PRIMARY_FG, borderColor: 'oklch(0.85 0.15 91.936)' }}
                          >
                            {student.allocation.room.hostel.code}‑{student.allocation.room.roomNumber}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unallocated</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 py-3.5">
                        <IconChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
