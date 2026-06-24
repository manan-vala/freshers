import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useOnboardedStudents, useHostelStats } from '@/hooks/useHostelDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/hostel/dashboard')({
  component: HostelDashboard,
})

function HostelDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: stats, isLoading: statsLoading } = useHostelStats()
  const { data: students, isLoading: studentsLoading } = useOnboardedStudents(debouncedSearch)

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hostel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.hostelName || '...'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAllocated ?? '...'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVerified ?? '...'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.totalNeedingReview ?? '...'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Onboarded Students</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search by name or phone..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Allocation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students?.map((student: any) => (
                    <TableRow 
                      key={student.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => navigate({ to: `/hostel/verify/${student.id}` })}
                    >
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>{student.contactNumber}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {student.isVerified ? (
                            <Badge variant="default" className="bg-emerald-500">Verified</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          {student.needsReview && (
                            <Badge variant="destructive">Needs Review</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.allocation ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {student.allocation.room.hostel.code}-{student.allocation.room.roomNumber}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">Unallocated</span>
                        )}
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
