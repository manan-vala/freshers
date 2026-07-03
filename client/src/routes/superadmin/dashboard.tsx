import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { superAdminApi } from '@/lib/superadmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { IconTrash, IconPlus, IconLoader2, IconLogout, IconShieldCheck, IconUpload, IconUsers, IconHome, IconDatabase, IconSearch } from '@tabler/icons-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar"

export const Route = createFileRoute('/superadmin/dashboard')({
  component: SuperAdminDashboard,
})

const createAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  loginId: z.string().min(3, 'Must be at least 3 characters'),
  hostelName: z.string().min(1, 'Please select a hostel'),
})
type CreateAdminInput = z.infer<typeof createAdminSchema>

// Maps the backend HostelName enum value → human-readable display label.
// The <option value> always carries the enum string; only the visible text is the label.
const HOSTEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'LOHIT_HOSTEL',            label: 'Lohit' },
  { value: 'DISANG_HOSTEL',           label: 'Disang' },
  { value: 'SUBANSIRI_HOSTEL',        label: 'Subansiri' },
  { value: 'UMIAM_HOSTEL',            label: 'Umiam' },
  { value: 'DHANSIRI_HOSTEL',         label: 'Dhansiri' },
  { value: 'MANAS_HOSTEL',            label: 'Manas' },
  { value: 'KAMENG_HOSTEL',           label: 'Kameng' },
  { value: 'GAURANG_HOSTEL',          label: 'Gaurang' },
  { value: 'BARAK_HOSTEL',            label: 'Barak' },
  { value: 'BRAHMAPUTRA_HOSTEL',      label: 'Brahmaputra' },
  { value: 'DIHING_HOSTEL',           label: 'Dihing' },
  { value: 'KAPILI_HOSTEL',           label: 'Kapili' },
  { value: 'SIANG_HOSTEL',            label: 'Siang' },
  { value: 'MARRIED_SCHOLAR_HOSTEL',  label: 'Married Scholar' },
]

function SuperAdminDashboard() {
  const queryClient = useQueryClient()
  const navigate = Route.useNavigate()
  const [activeView, setActiveView] = useState<'hostel-admin' | 'upload-data' | 'students-data'>('hostel-admin')

  const { data: users, isLoading } = useQuery({
    queryKey: ['superadmin', 'hmc-users'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/v1/users/hmc')
      return data.data
    }
  })

  const form = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { email: '', loginId: '', hostelName: '' },
  })

  const createMutation = useMutation({
    mutationFn: async (input: CreateAdminInput) => {
      // `hostelName` is already the exact HostelName enum string (e.g. "LOHIT_HOSTEL")
      await superAdminApi.post('/v1/users/admin', { ...input, role: 'HMC' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'hmc-users'] })
      form.reset()
      form.clearErrors()
    },
    onError: (error: any) => {
      form.setError('root', {
        type: 'manual',
        message: error.response?.data?.message || 'Failed to provision admin. Please try again.',
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await superAdminApi.delete(`/v1/users/hmc/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'hmc-users'] })
    }
  })

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)

  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await superAdminApi.post('/v1/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return data.data
    },
    onSuccess: (data) => {
      setUploadResult(data)
      setUploadFile(null)
      // reset file input
      const fileInput = document.getElementById('bulk-upload-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    }
  })

  const onSubmit = (data: CreateAdminInput) => {
    createMutation.mutate(data)
  }

  const handleLogout = async () => {
    await superAdminApi.post('/v1/auth/logout')
    queryClient.clear()
    navigate({ to: '/superadmin/login' })
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border px-6 py-4 flex flex-row items-center gap-2 h-[60px]">
          <IconShieldCheck className="text-emerald-600" size={24} />
          <h1 className="font-bold text-sm text-sidebar-foreground">Super Admin</h1>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'hostel-admin'}
                    onClick={() => setActiveView('hostel-admin')}
                  >
                    <IconHome />
                    <span>Hostel Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'upload-data'}
                    onClick={() => setActiveView('upload-data')}
                  >
                    <IconUpload />
                    <span>Upload Data</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'students-data'}
                    onClick={() => setActiveView('students-data')}
                  >
                    <IconUsers />
                    <span>Students Data</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-slate-50 min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="bg-slate-950 text-slate-100 px-4 py-4 flex items-center justify-between shadow-md h-[60px] shrink-0">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-slate-400 hover:text-white" />
            <div className="hidden md:flex items-center gap-3">
              <IconShieldCheck className="text-emerald-400" size={24} />
              <div>
                <h1 className="font-bold text-sm leading-tight">Super Admin Dashboard</h1>
              </div>
            </div>
            <div className="md:hidden">
              <h1 className="font-bold text-sm leading-tight">Super Admin</h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white h-8 text-xs px-3"
          >
            <IconLogout size={14} className="mr-2" />
            End Session
          </Button>
        </nav>

        <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8 w-full flex-1">
          
          {activeView === 'hostel-admin' && (
            <>
              {/* Create Form */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <IconPlus size={20} className="text-slate-500" />
                  Provision New Hostel Admin
                </h2>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Microsoft Login)</FormLabel>
                        <FormControl><Input placeholder="warden@iitg.ac.in" {...field} className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="loginId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Login ID</FormLabel>
                        <FormControl><Input placeholder="warden_kameng" {...field} className="h-10" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="hostelName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Hostel</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="" disabled>Select a hostel...</option>
                            {HOSTEL_OPTIONS.map((hostel) => (
                              <option key={hostel.value} value={hostel.value}>{hostel.label}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {form.formState.errors.root && (
                      <div className="md:col-span-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm font-medium">
                        {form.formState.errors.root.message}
                      </div>
                    )}

                    <div className="space-y-2 flex flex-col justify-start">
                      <div className="text-sm font-medium leading-none opacity-0 select-none hidden md:block">&nbsp;</div>
                      <Button 
                        type="submit" 
                        className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors" 
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? <IconLoader2 className="animate-spin" size={20} /> : "Provision"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </section>

              {/* User List */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Hostel Admins</h2>
                
                {isLoading ? (
                  <div className="py-12 flex justify-center text-slate-400">
                    <IconLoader2 className="animate-spin h-8 w-8" />
                  </div>
                ) : users?.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-100 rounded-xl">
                    No hostel admins provisioned yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 font-medium">Email</th>
                          <th className="px-6 py-3 font-medium">Login ID</th>
                          <th className="px-6 py-3 font-medium">Hostel Code</th>
                          <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users?.map((user: any) => (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{user.email}</td>
                            <td className="px-6 py-4 text-slate-500">{user.loginId}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                {user.hmcAdmin?.hostel?.code || 'Unassigned'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${user.email}?`)) {
                                    deleteMutation.mutate(user.id)
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <IconTrash size={16} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {activeView === 'upload-data' && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <IconUpload size={20} className="text-slate-500" />
                Bulk Upload Students
              </h2>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-2">
                  <label htmlFor="bulk-upload-file" className="text-sm font-medium leading-none">Upload CSV File</label>
                  <Input 
                    id="bulk-upload-file" 
                    type="file" 
                    accept=".csv"
                    className="h-10 cursor-pointer" 
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-slate-500">
                    CSV must contain: name, rollNumber, branch, email, hostelCode
                  </p>
                </div>
                <div className="space-y-2 flex flex-col justify-start">
                  <div className="text-sm font-medium leading-none opacity-0 select-none hidden md:block">&nbsp;</div>
                  <Button 
                    onClick={() => uploadFile && bulkUploadMutation.mutate(uploadFile)}
                    disabled={!uploadFile || bulkUploadMutation.isPending}
                    className="h-10 px-8 w-full md:w-auto"
                  >
                    {bulkUploadMutation.isPending ? <IconLoader2 className="animate-spin mr-2" size={20} /> : null}
                    Upload & Provision
                  </Button>
                </div>
              </div>

              {uploadResult && (
                <div className="mt-6 p-4 bg-slate-50 border rounded-xl space-y-2 text-sm">
                  <p className="font-medium text-slate-800">Upload Results:</p>
                  <p className="text-emerald-600 font-medium">Successfully provisioned: {uploadResult.successCount}</p>
                  {uploadResult.failureCount > 0 && (
                    <div className="text-red-600">
                      <p className="font-medium">Failed: {uploadResult.failureCount}</p>
                      <ul className="list-disc pl-5 mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {uploadResult.errors.map((err: any, i: number) => (
                          <li key={i}>Row {err.row}: {err.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {activeView === 'students-data' && (
            <StudentsDataView />
          )}

        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function StudentsDataView() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin', 'students', page, limit, debouncedSearch, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (status !== 'ALL') params.append('status', status)
      
      const { data } = await superAdminApi.get(`/v1/users/students?${params.toString()}`)
      return data
    }
  })

  const students = data?.data || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full md:w-80">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
          <Input 
            placeholder="Search name, roll, email..." 
            className="pl-9 h-10 w-full"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-40 h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-full md:w-28 h-10">
              <SelectValue placeholder="Limit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <Table className="relative w-full">
            <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Roll No.</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Room</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    <IconLoader2 className="animate-spin mx-auto size-6 text-emerald-500" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student: any) => {
                  const readableHostel = HOSTEL_OPTIONS.find(h => h.value === student.hostel?.name)?.label || 'Unassigned';
                  return (
                    <TableRow key={student.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-900">{student.name}</TableCell>
                      <TableCell className="text-slate-500">{student.rollNumber}</TableCell>
                      <TableCell className="text-slate-600 max-w-[150px] truncate" title={student.branch}>{student.branch}</TableCell>
                      <TableCell className="text-slate-500">{student.user.email}</TableCell>
                      <TableCell>{readableHostel}</TableCell>
                      <TableCell>
                        <Badge variant={student.onboardingStatus === 'SUBMITTED' ? 'default' : 'secondary'} className={student.onboardingStatus === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}>
                          {student.onboardingStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={student.allocation ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'text-slate-400'}>
                          {student.allocation ? 'Allocated' : 'Unallocated'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {total > 0 && (
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-medium text-slate-900">{total}</span> students
            </p>
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)) }} 
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm font-medium">Page {page} of {totalPages}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)) }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  )
}
