import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { superAdminApi, useSuperAdminStore } from '@/lib/superadmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { IconTrash, IconPlus, IconLoader2, IconLogout, IconShieldCheck } from '@tabler/icons-react'

export const Route = createFileRoute('/superadmin/dashboard')({
  component: SuperAdminDashboard,
})

const createAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  loginId: z.string().min(3, 'Must be at least 3 characters'),
  hostelId: z.string().min(1, 'Hostel ID is required'),
})
type CreateAdminInput = z.infer<typeof createAdminSchema>

function SuperAdminDashboard() {
  const queryClient = useQueryClient()
  const clearAccessToken = useSuperAdminStore((state) => state.clearAccessToken)
  const navigate = Route.useNavigate()

  const { data: users, isLoading } = useQuery({
    queryKey: ['superadmin', 'hmc-users'],
    queryFn: async () => {
      const { data } = await superAdminApi.get('/v1/users/hmc')
      return data.data
    }
  })

  const hostelsList = [
    "Umiam", "Dhansiri", "Manas", "Kameng", "Subansiri", 
    "Disang", "Lohit", "Gaurang", "Barak", "Brahmaputra", 
    "Dihing", "Kapili", "Siang", "Married Scholar"
  ]

  const form = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { email: '', loginId: '', hostelId: '' },
  })

  const createMutation = useMutation({
    mutationFn: async (input: CreateAdminInput) => {
      await superAdminApi.post('/v1/users/admin', { ...input, role: 'HMC' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'hmc-users'] })
      form.reset()
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

  const onSubmit = (data: CreateAdminInput) => {
    createMutation.mutate(data)
  }

  const handleLogout = () => {
    clearAccessToken()
    navigate({ to: '/superadmin/login' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-slate-950 text-slate-100 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <IconShieldCheck className="text-emerald-400" size={28} />
          <div>
            <h1 className="font-bold text-lg leading-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Transient Session Active</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <IconLogout size={16} className="mr-2" />
          End Session
        </Button>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Create Form */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <IconPlus size={20} className="text-slate-500" />
            Provision New Hostel Admin
          </h2>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

              <FormField control={form.control} name="hostelId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Hostel</FormLabel>
                  <FormControl>
                    <select 
                      {...field} 
                      className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>Select a hostel...</option>
                      {hostelsList.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button 
                type="submit" 
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <IconLoader2 className="animate-spin" size={20} /> : "Provision"}
              </Button>
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

      </main>
    </div>
  )
}
