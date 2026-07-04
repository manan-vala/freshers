import { createFileRoute, redirect , Link} from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useLogin } from '@/lib/auth'
import { loginSchema, type LoginInput } from '@shared/auth'

// 👇 Import the new OTP component we just created
import { OtpVerification } from '@/components/auth/OtpVerification'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // If the user is already logged in, redirect them
    if (context.user) {
      if (context.user.role === 'HMC') {
        throw redirect({ to: '/hostel/dashboard' })
      }
      if (context.user.role === 'ADMIN') {
        throw redirect({ to: '/superadmin/dashboard' })
      }
      if (context.user.role === 'STUDENT') {
        if (context.user.student?.onboardingStatus === 'SUBMITTED') {
          throw redirect({ to: '/onboarding-complete' })
        }
        throw redirect({ to: '/onboarding' })
      }
      
      // Fallback
      return
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const loginMutation = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  
  // 👇 State to track if we need to show the OTP screen
  const [requiresOtp, setRequiresOtp] = useState(false)
  
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (data: LoginInput) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        // 👇 Intercept the login if they need to change their password
        if (user.mustChangePassword) {
          setRequiresOtp(true)
          return
        }

        // Otherwise, redirect as normal
        window.location.href = user.student?.onboardingStatus === 'SUBMITTED' 
          ? '/onboarding-complete' 
          : '/onboarding';
      },
      onError: (error: any) => {
        form.setError('root', {
          type: 'manual',
          message: error.response?.data?.message || 'Invalid login ID or password. Please try again.',
        })
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Panel: Branding & Info */}
      <div className="w-full md:w-[45%] lg:w-[40%] bg-primary flex flex-col justify-between p-8 md:p-12 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-primary font-black text-xl border-3 border-white">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="font-bold text-2xl tracking-tight">Fresher Portal</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Welcome to <br /> IIT Guwahati
          </h1>
          
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-md leading-relaxed">
            Please log in with your provided credentials to complete your onboarding process.
          </p>

          <ul className="space-y-6">
            {[
              "Update your academic & personal profile",
              "Submit required medical details",
              "View hostel and room allocations"
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-primary-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-12 text-primary-foreground/60 text-sm">
          &copy; {new Date().getFullYear()} Students' Web Committee. All rights reserved.
        </div>
      </div>

      {/* Right Panel: Login Form / OTP Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* 👇 Conditional Rendering Starts Here 👇 */}
          {requiresOtp ? (
            <OtpVerification email={form.getValues('email')} />
          ) : (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Student Login</h2>
                <p className="text-slate-500 text-sm">Enter your IITG email and password to access your portal</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Institute Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. name@iitg.ac.in" 
                            {...field} 
                            className="h-11"
                            autoComplete="email"
                            type="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
  <FormLabel>Password</FormLabel>
  {/* 👇 Added the Forgot Password link here 👇 */}
  <Link 
  to="/forgot-password" 
  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
>
  Forgot password?
</Link>
</div>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              {...field} 
                              className="h-11 pr-10"
                              autoComplete="current-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                            >
                              {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.formState.errors.root && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                      {form.formState.errors.root.message}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base mt-2" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <IconLoader2 className="mr-2 h-5 w-5 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Log in to Portal"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-8">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Hostel Administration</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full h-11 text-base mt-6 text-slate-700 font-medium"
                  onClick={() => {
                    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/v1/auth/microsoft`;
                  }}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="MS Logo" className="w-5 h-5 mr-3" />
                  Login as Hostel Admin
                </Button>
              </div>
            </>
          )}
          {/* 👆 Conditional Rendering Ends Here 👆 */}

        </div>
      </div>
    </div>
  )
}