import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import type {
  ColumnDef,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import * as XLSX from 'xlsx'
import { superAdminApi } from '@/lib/superadmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IconTrash, IconPlus, IconLoader2, IconLogout, IconShieldCheck, IconUpload, IconUsers, IconHome, IconSearch, IconBed, IconEdit, IconCheck, IconX, IconAlertCircle, IconAlertTriangle, IconDownload, IconFilter, IconDatabase } from '@tabler/icons-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [activeView, setActiveView] = useState<'hostel-admin' | 'upload-data' | 'students-data' | 'rooms-management' | 'data-download' | 'setup-db'>('hostel-admin')

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
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'rooms-management'}
                    onClick={() => setActiveView('rooms-management')}
                  >
                    <IconBed />
                    <span>Rooms Inventory</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'data-download'}
                    onClick={() => setActiveView('data-download')}
                  >
                    <IconDownload />
                    <span>Data Download</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'setup-db'}
                    onClick={() => setActiveView('setup-db')}
                  >
                    <IconDatabase />
                    <span>Setup DB</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="bg-slate-50 min-h-screen flex flex-col min-w-0 overflow-hidden">
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

        <main className={`mx-auto p-4 md:p-6 space-y-6 w-full min-w-0 flex-1 transition-all duration-300 overflow-hidden ${['data-download', 'students-data', 'rooms-management'].includes(activeView) ? 'max-w-full' : 'max-w-6xl'}`}>
          
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
                    CSV must contain: name, rollNumber, discipline, programme, hostelCode, gmailId, outlookId
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

          {activeView === 'rooms-management' && (
            <RoomsManagementView />
          )}

          {activeView === 'data-download' && (
            <DataDownloadView />
          )}

          {activeView === 'setup-db' && (
            <SetupDbView />
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
                <TableHead>Programme</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>Gmail ID</TableHead>
                <TableHead>Outlook ID</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Room</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                    <IconLoader2 className="animate-spin mx-auto size-6 text-emerald-500" />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-500">
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
                      <TableCell className="text-slate-600">{student.programme}</TableCell>
                      <TableCell className="text-slate-600 max-w-[150px] truncate" title={student.discipline}>{student.discipline}</TableCell>
                      <TableCell className="text-slate-500">{student.gmailId}</TableCell>
                      <TableCell className="text-slate-500">{student.outlookId}</TableCell>
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


function RoomsManagementView() {
  const queryClient = useQueryClient()
  const [selectedHostelId, setSelectedHostelId] = useState<string>('')
  
  // Fetch hostels
  const { data: hostelsResponse, isLoading: hostelsLoading } = useQuery({
    queryKey: ['superadmin', 'hostels'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/v1/hostels')
      return data.data
    }
  })
  
  const hostels = hostelsResponse || []

  // Fetch rooms for selected hostel
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['superadmin', 'rooms', selectedHostelId],
    queryFn: async () => {
      const { data } = await superAdminApi.get(`/v1/rooms?hostelId=${selectedHostelId}`)
      return data.data
    },
    enabled: !!selectedHostelId
  })

  // Mutations
  const [createRoomError, setCreateRoomError] = useState<{ message: string, code?: string } | null>(null)

  const createRoomMutation = useMutation({
    mutationFn: async (input: any) => {
      await superAdminApi.post('/v1/rooms', input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'rooms', selectedHostelId] })
      setNewRoomNumber('')
      setNewRoomCapacity(2)
      setCreateRoomError(null)
    },
    onError: (err: any) => {
      setCreateRoomError({
        message: err.response?.data?.message || 'Failed to create room',
        code: err.response?.data?.errorCode
      })
    }
  })

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      await superAdminApi.patch(`/v1/rooms/${id}`, data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'rooms', selectedHostelId] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update room')
  })

  const deactivateRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await superAdminApi.delete(`/v1/rooms/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'rooms', selectedHostelId] })
      setRoomToDelete(null)
    },
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to deactivate room')
  })

  // Bulk upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isBulkPanelOpen, setIsBulkPanelOpen] = useState(false)

  const bulkUploadRoomsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await superAdminApi.post(`/v1/rooms/bulk-upload?hostelId=${selectedHostelId}`, formData)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'rooms', selectedHostelId] })
      setUploadResult(data)
      setUploadFile(null)
      setUploadError(null)
    },
    onError: (err: any) => {
      if (err.response?.data?.errors) {
        setUploadResult({ errors: err.response.data.errors, successCount: 0, skippedCount: 0, failureCount: err.response.data.errors.length, message: err.response.data.message })
      } else {
        setUploadError(err.response?.data?.message || 'Failed to upload rooms')
      }
    }
  })

  const handleBulkUpload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    bulkUploadRoomsMutation.mutate(uploadFile)
  }

  // State for new room
  const [newRoomNumber, setNewRoomNumber] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState(2)

  // State for editing room inline
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editCapacity, setEditCapacity] = useState<number>(2)
  const [editIsActive, setEditIsActive] = useState<boolean>(true)
  
  // State for deactivate confirm
  const [roomToDelete, setRoomToDelete] = useState<any>(null)

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHostelId || !newRoomNumber) return
    createRoomMutation.mutate({
      hostelId: selectedHostelId,
      roomNumber: newRoomNumber,
      capacity: newRoomCapacity,
      isAccessible: false
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <IconBed size={20} className="text-slate-500" />
          Room Inventory
        </h2>
        
        <div className="w-full md:w-80 mb-6">
          <Select value={selectedHostelId} onValueChange={setSelectedHostelId} disabled={hostelsLoading}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Select a hostel..." />
            </SelectTrigger>
            <SelectContent>
              {hostels.map((h: any) => (
                <SelectItem key={h.id} value={h.id}>
                  {HOSTEL_OPTIONS.find(opt => opt.value === h.name)?.label || h.code} ({h.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedHostelId && (
          <div className="space-y-6">
            {/* Bulk Upload Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6">
              <button 
                type="button" 
                onClick={() => setIsBulkPanelOpen(!isBulkPanelOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <IconUpload size={18} className="text-indigo-500" />
                  Bulk Upload Room Inventory
                </div>
                <Badge variant="outline" className="bg-white">{isBulkPanelOpen ? 'Collapse' : 'Expand'}</Badge>
              </button>
              
              {isBulkPanelOpen && (
                <div className="p-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600 mb-4">
                    Upload a CSV file containing <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">prefix, suffix, capacity</code>. 
                    Example: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">A, 101, 2</code> will create room <strong>A-101</strong> with capacity 2.
                  </div>
                  
                  <form onSubmit={handleBulkUpload} className="flex flex-col sm:flex-row items-start gap-4 mb-4">
                    <Input 
                      type="file" 
                      accept=".csv"
                      onChange={e => {
                        setUploadFile(e.target.files?.[0] || null)
                        setUploadResult(null)
                        setUploadError(null)
                      }}
                      className="max-w-md bg-white cursor-pointer"
                    />
                    <Button 
                      type="submit" 
                      disabled={!uploadFile || bulkUploadRoomsMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {bulkUploadRoomsMutation.isPending ? <IconLoader2 className="animate-spin mr-2" size={16} /> : <IconUpload size={16} className="mr-2" />}
                      Upload CSV
                    </Button>
                  </form>

                  {uploadError && (
                    <Alert variant="destructive" className="mb-4">
                      <IconAlertCircle className="h-4 w-4" />
                      <AlertTitle>Upload Failed</AlertTitle>
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  )}

                  {uploadResult && (
                    <div className="space-y-4 mt-6 border-t border-slate-200 pt-4">
                      <div className="flex gap-4">
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 flex-1">
                          <div className="font-semibold text-lg">{uploadResult.successCount || 0}</div>
                          <div className="text-xs">Successfully Created</div>
                        </div>
                        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200 flex-1">
                          <div className="font-semibold text-lg">{uploadResult.skippedCount || 0}</div>
                          <div className="text-xs">Skipped (Already Exists)</div>
                        </div>
                        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 flex-1">
                          <div className="font-semibold text-lg">{uploadResult.failureCount || 0}</div>
                          <div className="text-xs">Errors / Conflicts</div>
                        </div>
                      </div>

                      {uploadResult.errors?.length > 0 && (
                        <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
                          <div className="bg-red-50 px-3 py-2 font-medium text-sm text-red-800 border-b border-red-100 flex items-center gap-2">
                            <IconAlertCircle size={16} /> Errors
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Row</TableHead>
                                  <TableHead className="w-24">Room</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Reason</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {uploadResult.errors.map((err: any, i: number) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{err.row}</TableCell>
                                    <TableCell className="font-mono text-xs">{err.roomNumber}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs border-red-200 text-red-600 bg-red-50">{err.type}</Badge></TableCell>
                                    <TableCell className="text-xs text-red-600">{err.reason}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {uploadResult.skipped?.length > 0 && (
                        <div className="bg-white border border-yellow-200 rounded-lg overflow-hidden mt-4">
                          <div className="bg-yellow-50 px-3 py-2 font-medium text-sm text-yellow-800 border-b border-yellow-100 flex items-center gap-2">
                            <IconAlertTriangle size={16} /> Skipped Rooms
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Row</TableHead>
                                  <TableHead className="w-24">Room</TableHead>
                                  <TableHead>Reason</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {uploadResult.skipped.map((skip: any, i: number) => (
                                  <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{skip.row}</TableCell>
                                    <TableCell className="font-mono text-xs">{skip.roomNumber}</TableCell>
                                    <TableCell className="text-xs text-yellow-600">{skip.reason}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add Room Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-medium text-slate-800 mb-3">Add Single Room</h3>
              <form onSubmit={handleCreateRoom} className="flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Room Number</label>
                  <Input 
                    required 
                    placeholder="e.g. A-101" 
                    value={newRoomNumber} 
                    onChange={e => {
                      setNewRoomNumber(e.target.value)
                      setCreateRoomError(null)
                    }} 
                    className={`h-9 ${createRoomError?.code === 'ROOM_DUPLICATE' ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                  />
                  {createRoomError?.code === 'ROOM_DUPLICATE' && (
                    <p className="text-xs text-red-500 font-medium">{createRoomError.message}</p>
                  )}
                </div>
                <div className="w-full md:w-32 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Capacity</label>
                  <Input required type="number" min={1} max={10} value={newRoomCapacity} onChange={e => setNewRoomCapacity(parseInt(e.target.value))} className="h-9" />
                </div>
                <div className="pt-6">
                  <Button type="submit" disabled={createRoomMutation.isPending} className="h-9 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                    {createRoomMutation.isPending ? <IconLoader2 className="animate-spin mr-2" size={16} /> : <IconPlus size={16} className="mr-2" />}
                    Add
                  </Button>
                </div>
              </form>
              {createRoomError && createRoomError.code !== 'ROOM_DUPLICATE' && (
                <div className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                  <IconAlertCircle size={16} /> {createRoomError.message}
                </div>
              )}
            </div>

            {/* Room List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><IconLoader2 className="animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                  ) : !rooms || rooms.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No rooms configured for this hostel.</TableCell></TableRow>
                  ) : (
                    rooms.map((room: any) => (
                      <TableRow key={room.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-900">{room.roomNumber}</TableCell>
                        
                        {editingRoomId === room.id ? (
                          <>
                            <TableCell>
                              <Input type="number" min={Math.max(1, room.currentOccupancy)} max={10} value={editCapacity} onChange={e => setEditCapacity(parseInt(e.target.value) || room.capacity)} className="w-20 h-8" />
                            </TableCell>
                            <TableCell>{room.currentOccupancy}</TableCell>
                            <TableCell>
                              <Select value={editIsActive ? 'active' : 'inactive'} onValueChange={v => setEditIsActive(v === 'active')}>
                                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive" disabled={room.currentOccupancy > 0}>Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => {
                                updateRoomMutation.mutate({ id: room.id, data: { capacity: editCapacity, isActive: editIsActive } });
                                setEditingRoomId(null);
                              }}>
                                <IconCheck size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setEditingRoomId(null)}>
                                <IconX size={16} />
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-slate-600">{room.capacity}</TableCell>
                            <TableCell className="text-slate-600">{room.currentOccupancy}</TableCell>
                            <TableCell>
                              <Badge variant={room.isActive ? 'default' : 'secondary'} className={room.isActive ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}>
                                {room.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900" onClick={() => {
                                setEditingRoomId(room.id);
                                setEditCapacity(room.capacity);
                                setEditIsActive(room.isActive);
                              }}>
                                <IconEdit size={16} />
                              </Button>
                              {room.isActive && room.currentOccupancy === 0 && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                  setRoomToDelete(room)
                                }}>
                                  <IconTrash size={16} />
                                </Button>
                              )}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate room <strong>{roomToDelete?.roomNumber}</strong>?
              <br/><br/>
              This room has 0 occupants. Deactivating will remove it from the allocation pool so no further allocations can be made to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (roomToDelete) deactivateRoomMutation.mutate(roomToDelete.id)
              }}
            >
              {deactivateRoomMutation.isPending ? <IconLoader2 className="animate-spin mr-2" size={16} /> : null}
              Deactivate Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DataDownloadView() {
  const { data: students, isLoading } = useQuery({
    queryKey: ['superadmin', 'students', 'export'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/v1/users/students/export')
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const saved = localStorage.getItem('dataDownloadCols')
    if (saved) return JSON.parse(saved)
    return {
      id: false,
      userId: false,
      academicYearId: false,
      createdAt: false,
      updatedAt: false,
      onboardingSubmittedAt: false,
      contactNumber: false,
      alternateContactNumber: false,
      permanentAddress: false,
      country: false,
      state: false,
      emergencyContactName: false,
      emergencyContactNumber: false,
      emergencyContactRelation: false,
      bloodGroup: false,
      medicalConditions: false,
      identificationMark: false,
      allergies: false,
      dob: false,
      gender: false,
      isHandicapped: false,
      handicapDetails: false,
      consentGiven: false,
      editAllowedByAdmin: false,
      isVerified: false,
      needsReview: false,
    }
  })
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')

  useEffect(() => {
    localStorage.setItem('dataDownloadCols', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  const columns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    { accessorKey: 'name', header: 'Name', enablePinning: true },
    { accessorKey: 'rollNumber', header: 'Roll No.', enablePinning: true },
    { accessorKey: 'discipline', header: 'Discipline' },
    { accessorKey: 'programme', header: 'Programme' },
    { accessorFn: row => HOSTEL_OPTIONS.find((h: any) => h.value === row.hostel?.name)?.label || 'Unassigned', id: 'hostel', header: 'Hostel' },
    { accessorFn: row => row.user?.email, id: 'email', header: 'Email' },
    { accessorKey: 'outlookId', header: 'Outlook ID' },
    { accessorKey: 'onboardingStatus', header: 'Status' },
    { accessorFn: row => row.allocation ? 'Allocated' : 'Unallocated', id: 'allocation', header: 'Allocation' },
    { accessorKey: 'gender', header: 'Gender' },
    { accessorKey: 'bloodGroup', header: 'Blood Group' },
    { accessorKey: 'contactNumber', header: 'Contact No.' },
    { accessorKey: 'alternateContactNumber', header: 'Alt Contact No.' },
    { accessorKey: 'permanentAddress', header: 'Address' },
    { accessorKey: 'country', header: 'Country' },
    { accessorKey: 'state', header: 'State' },
    { accessorKey: 'emergencyContactName', header: 'Emerg. Contact Name' },
    { accessorKey: 'emergencyContactNumber', header: 'Emerg. Contact No.' },
    { accessorKey: 'emergencyContactRelation', header: 'Emerg. Relation' },
    { accessorKey: 'medicalConditions', header: 'Medical Conditions' },
    { accessorKey: 'identificationMark', header: 'Identification Mark' },
    { accessorKey: 'allergies', header: 'Allergies' },
    { accessorKey: 'dob', header: 'DOB' },
    { accessorFn: row => row.isHandicapped ? 'Yes' : 'No', id: 'isHandicapped', header: 'Handicapped' },
    { accessorKey: 'handicapDetails', header: 'Handicap Details' },
    { accessorFn: row => row.consentGiven ? 'Yes' : 'No', id: 'consentGiven', header: 'Consent Given' },
    { accessorFn: row => row.editAllowedByAdmin ? 'Yes' : 'No', id: 'editAllowedByAdmin', header: 'Edit Allowed' },
    { accessorFn: row => row.isVerified ? 'Yes' : 'No', id: 'isVerified', header: 'Verified' },
    { accessorFn: row => row.needsReview ? 'Yes' : 'No', id: 'needsReview', header: 'Needs Review' },
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'userId', header: 'User ID' },
    { accessorKey: 'academicYearId', header: 'Academic Year ID' },
    { accessorKey: 'createdAt', header: 'Created At' },
    { accessorKey: 'updatedAt', header: 'Updated At' },
    { accessorKey: 'onboardingSubmittedAt', header: 'Submitted At' },
  ]

  const table = useReactTable({
    data: students || [],
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const exportData = (format: 'csv' | 'xlsx') => {
    const rows = table.getFilteredSelectedRowModel().rows
    if (rows.length === 0) {
      alert('Select at least one row to export')
      return
    }

    const exportCols = table.getVisibleLeafColumns().filter(c => c.id !== 'select')
    
    const data = rows.map(row => {
      const obj: any = {}
      exportCols.forEach(col => {
        obj[col.columnDef.header as string] = row.getValue(col.id)
      })
      return obj
    })

    if (format === 'csv') {
      const header = exportCols.map(c => c.columnDef.header as string).join(',')
      const csvRows = data.map(row => 
        exportCols.map(c => {
          let val = row[c.columnDef.header as string]
          if (val === null || val === undefined) val = ''
          val = String(val).replace(/"/g, '""')
          if (val.includes(',') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`
          }
          return val
        }).join(',')
      )
      const csvStr = [header, ...csvRows].join('\n')
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students")
      XLSX.writeFile(workbook, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`)
    }
  }

  const selectedCount = Object.keys(rowSelection).length
  const totalCount = students?.length || 0
  const filteredCount = table.getFilteredRowModel().rows.length
  const pendingCount = table.getFilteredRowModel().rows.filter(r => r.getValue('onboardingStatus') === 'PENDING').length
  const submittedCount = table.getFilteredRowModel().rows.filter(r => r.getValue('onboardingStatus') === 'SUBMITTED').length

  return (
    <div className="space-y-6 min-w-0">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-w-0">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <IconDownload size={20} className="text-slate-500" />
            Data Download Center
          </h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => exportData('csv')} className="border-slate-300">
              <IconDownload size={16} className="mr-2" /> Export CSV
            </Button>
            <Button variant="default" size="sm" onClick={() => exportData('xlsx')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <IconDownload size={16} className="mr-2" /> Export Excel
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="relative w-full md:w-80">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <Input 
              placeholder="Search all data..." 
              className="pl-9 h-10 w-full"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => {
                if (v === 'ALL') table.getColumn('onboardingStatus')?.setFilterValue(undefined)
                else table.getColumn('onboardingStatus')?.setFilterValue(v)
            }}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => {
                if (v === 'ALL') table.getColumn('allocation')?.setFilterValue(undefined)
                else table.getColumn('allocation')?.setFilterValue(v)
            }}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Allocation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Allocation</SelectItem>
                <SelectItem value="Allocated">Allocated</SelectItem>
                <SelectItem value="Unallocated">Unallocated</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10">
                  <IconFilter size={16} className="mr-2" /> Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                {table.getAllLeafColumns().filter(col => col.id !== 'select').map(column => (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={(e) => {
                      e.preventDefault()
                      column.toggleVisibility(!column.getIsVisible())
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      readOnly
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 pointer-events-none"
                    />
                    <span>{column.id}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {columnFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
             {columnFilters.map(f => (
               <Badge key={f.id} variant="secondary" className="flex items-center gap-1 bg-slate-100">
                 {f.id}: {String(f.value)}
                 <IconX size={14} className="cursor-pointer hover:text-slate-900" onClick={() => table.getColumn(f.id)?.setFilterValue(undefined)} />
               </Badge>
             ))}
          </div>
        )}

        <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
          <span>Showing <strong>{filteredCount}</strong> of <strong>{totalCount}</strong> students</span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-600 font-medium">{selectedCount} selected</span>
          <span className="text-slate-300">|</span>
          <span>{pendingCount} Pending</span>
          <span>·</span>
          <span>{submittedCount} Submitted</span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden relative min-w-0">
          <div className="overflow-x-auto max-h-[60vh] w-full">
            <Table className="relative w-full text-sm">
              <TableHeader className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      const isPinned = header.column.getIsPinned()
                      return (
                        <TableHead 
                          key={header.id}
                          className={`whitespace-nowrap transition-colors hover:bg-slate-100 cursor-pointer select-none ${isPinned ? 'sticky bg-slate-50 z-10 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)]' : ''}`}
                          style={{ left: isPinned === 'left' ? `${header.column.getStart('left')}px` : undefined }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {{
                              asc: ' 🔼',
                              desc: ' 🔽',
                            }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-32 text-center text-slate-500">
                       <IconLoader2 className="animate-spin mx-auto size-6 text-emerald-500" />
                     </TableCell>
                   </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-slate-50/50"
                    >
                      {row.getVisibleCells().map(cell => {
                        const isPinned = cell.column.getIsPinned()
                        return (
                          <TableCell 
                            key={cell.id} 
                            className={`whitespace-nowrap max-w-[200px] truncate ${isPinned ? 'sticky bg-white z-10 drop-shadow-[2px_0_2px_rgba(0,0,0,0.02)] group-hover:bg-slate-50/50' : ''}`}
                            style={{ left: isPinned === 'left' ? `${cell.column.getStart('left')}px` : undefined }}
                            title={String(cell.getValue() || '')}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

function SetupDbView() {
  const currentYear = new Date().getFullYear();
  const exampleFormat = `${currentYear}-${currentYear + 1}`;
  const [academicYear, setAcademicYear] = useState(exampleFormat);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const seedMutation = useMutation({
    mutationFn: async (year: string) => {
      const { data } = await superAdminApi.post('/v1/users/seed-personas', { academicYear: year });
      return data.data;
    },
    onSuccess: (data) => {
      setErrorMsg('');
      setSuccessMsg(`${data.personsSeeded} personas seeded for ${data.academicYear}. Login with test1@iitg.ac.in / Swc_password.`);
    },
    onError: (error: any) => {
      setSuccessMsg('');
      setErrorMsg(error.response?.data?.message || 'Failed to seed database.');
    }
  });

  const handleSeed = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      setErrorMsg('Invalid format. Must be YYYY-YYYY (e.g. 2026-2027)');
      return;
    }
    seedMutation.mutate(academicYear);
  };

  return (
    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
        <IconDatabase size={20} className="text-slate-500" />
        Setup Test Database
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
          <Input 
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder={exampleFormat}
            className="max-w-[200px]"
          />
          <p className="text-xs text-slate-500 mt-1">Format: YYYY-YYYY (e.g. {exampleFormat}), [Current Year - Next year]</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 space-y-2">
          <p className="font-medium">This will seed 10 test persona accounts:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>test1@iitg.ac.in through test10@iitg.ac.in</li>
            <li>Default password: <strong>Swc_password</strong></li>
            <li>Outlook ID = @iitg.ac.in, Gmail ID = @gmail.com</li>
          </ul>
        </div>

        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <IconAlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Existing test personas  and their allocations will be wiped and re-created.
          </AlertDescription>
        </Alert>

        {errorMsg && (
          <Alert variant="destructive">
            <IconAlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {successMsg && (
          <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
            <IconCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800">Success</AlertTitle>
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSeed} 
          disabled={seedMutation.isPending}
        >
          {seedMutation.isPending ? <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> : <IconDatabase className="mr-2 h-4 w-4" />}
          Seed Database
        </Button>
      </div>
    </section>
  );
}
