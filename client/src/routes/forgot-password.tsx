import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IconLoader2, IconEye, IconEyeOff, IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  
  // State for the flow
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // UI states
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Please enter your registered email.')
      return
    }

    setIsPending(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to send reset link')

      setSuccessMsg('OTP sent to your email!')
      setStep(2) // Move to OTP entry screen
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPending(false)
    }
  }

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit OTP.')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsPending(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Invalid OTP')

      // Success! Send them back to the login page
      navigate({ to: '/login' })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        
        <Link to="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          <IconArrowLeft size={16} className="mr-2" />
          Back to login
        </Link>

        {step === 1 ? (
          // ─── STEP 1: EMAIL ENTRY ───
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h2>
              <p className="text-slate-500 text-sm">Enter your registered email and we will send you a 6-digit code.</p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Institute Email</label>
                <Input 
                  type="email" 
                  placeholder="e.g. name@iitg.ac.in" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={isPending}>
                {isPending ? <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</> : "Send Reset Code"}
              </Button>
            </form>
          </>
        ) : (
          // ─── STEP 2: OTP & NEW PASSWORD ───
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Reset Code</h2>
              <p className="text-slate-500 text-sm">
                We sent a 6-digit code to your registered <strong>Gmail address</strong> linked to {email}.
              </p>
            </div>

            {successMsg && (
              <div className="mb-6 p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700 font-medium text-center">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium leading-none">One-Time Password</label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">New Permanent Password</label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Min. 8 characters" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11" disabled={isPending}>
                {isPending ? <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : "Reset Password"}
              </Button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}