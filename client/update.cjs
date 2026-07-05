const fs = require('fs');
const path = require('path');
const file = path.join('src', 'routes', 'superadmin', 'dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace(
  /import \{ IconTrash.*?\} from '@tabler\/icons-react'/,
  `import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { IconTrash, IconPlus, IconLoader2, IconLogout, IconShieldCheck, IconUpload, IconUsers, IconHome, IconSearch, IconBed, IconEdit, IconCheck, IconX, IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react'`
);

// 2. Add 'rooms-management' to activeView state
content = content.replace(
  /useState<'hostel-admin' \| 'upload-data' \| 'students-data'>\('hostel-admin'\)/,
  `useState<'hostel-admin' | 'upload-data' | 'students-data' | 'rooms-management'>('hostel-admin')`
);

// 3. Add sidebar menu item
content = content.replace(
  /(\s*<SidebarMenuItem>\s*<SidebarMenuButton\s+isActive=\{activeView === 'students-data'\}.*?<\/SidebarMenuItem>)/s,
  `$1
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={activeView === 'rooms-management'}
                    onClick={() => setActiveView('rooms-management')}
                  >
                    <IconBed />
                    <span>Rooms Inventory</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>`
);

// 4. Add main view rendering
content = content.replace(
  /(\s*\{activeView === 'students-data' && \(\s*<StudentsDataView \/>\s*\)\})/,
  `$1

          {activeView === 'rooms-management' && (
            <RoomsManagementView />
          )}`
);

// 5. Append RoomsManagementView function
const roomsManagementView = `

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
      const { data } = await superAdminApi.get(\`/v1/rooms?hostelId=\${selectedHostelId}\`)
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
      await superAdminApi.patch(\`/v1/rooms/\${id}\`, data)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin', 'rooms', selectedHostelId] }),
    onError: (err: any) => alert(err.response?.data?.message || 'Failed to update room')
  })

  const deactivateRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await superAdminApi.delete(\`/v1/rooms/\${id}\`)
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
      const { data } = await superAdminApi.post(\`/v1/rooms/bulk-upload?hostelId=\${selectedHostelId}\`, formData)
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
                    className={\`h-9 \${createRoomError?.code === 'ROOM_DUPLICATE' ? 'border-red-500 focus-visible:ring-red-500' : ''}\`} 
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
                                  <SelectItem value="inactive">Inactive</SelectItem>
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
`;

content = content + roomsManagementView;
fs.writeFileSync(file, content);
