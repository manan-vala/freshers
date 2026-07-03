import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconEye, IconEyeOff, IconLoader2, IconShieldLock } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { loginSchema, type LoginInput } from '@shared/auth'
import { superAdminApi } from '@/lib/superadmin'
import { authKeys } from '@/lib/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/superadmin/login')({
  beforeLoad: async ({ context: { queryClient } }) => {
    // If a valid admin session cookie already exists, skip login
    const user = await queryClient.fetchQuery({
      queryKey: authKeys.me,
      queryFn: () => superAdminApi.get('/v1/auth/me').then(r => r.data.data).catch(() => null),
    }).catch(() => null);
    if (user?.role === 'ADMIN') throw redirect({ to: '/superadmin/dashboard' });
  },
  component: SuperAdminLoginPage,
})

function SuperAdminLoginPage() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const navigate = Route.useNavigate()
  
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const { data } = await superAdminApi.post('/v1/auth/admin-login', credentials);
      return data.data; // Returns { role, mustChangePassword } — NO token
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
      // Cookie is already set by the server. Just navigate.
      navigate({ to: '/superadmin/dashboard' });
    },
    onError: (error: any) => {
      form.setError('root', {
        type: 'manual',
        message: error.response?.data?.message || 'Invalid admin credentials.',
      })
    }
  })

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800 text-slate-300">
            <IconShieldLock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Super Admin Portal</h2>
          <p className="text-slate-400 text-sm">Secure, transient access session</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Master Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="superadmin@iitg.ac.in" 
                      {...field} 
                      className="h-11 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-slate-700"
                      autoComplete="email"
                      type="email"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Master Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        {...field} 
                        className="h-11 pr-10 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-slate-700"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                      >
                        {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-900/50 text-sm text-red-400 font-medium text-center">
                {form.formState.errors.root.message}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-base mt-2 bg-slate-100 text-slate-900 hover:bg-white" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Establish Secure Session"
              )}
            </Button>
            
            <p className="text-xs text-center text-slate-500 mt-4 flex items-center justify-center gap-1">
              <IconShieldLock size={12} />
              Session ends immediately upon refresh or navigation.
            </p>
          </form>
        </Form>
      </div>
    </div>
  )
}
