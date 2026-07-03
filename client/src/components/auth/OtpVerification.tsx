import { useState } from 'react'
import { IconLoader2, IconEye, IconEyeOff } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp' // adjust path if needed

export function OtpVerification({ email }: { email: string }) {
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsPending(true)
    try {
      // 1. Hit the correct endpoint: /change-password
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/v1/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 👈 CRITICAL: This sends the auth cookie so the backend knows WHO is changing the password
        body: JSON.stringify({ otp, newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP or password')
      }

      // 2. The backend changePasswordHandler automatically logs the user out (clears cookies) 
      // so they can securely log in with their brand new password.
      // We will reload the page to reset the UI back to the main login screen.
      window.location.reload(); 
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Account</h2>
        <p className="text-slate-500 text-sm">
          We sent a 6-digit code to <strong>{email}</strong>. Please enter it below and set your permanent password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Manan's OTP Component */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            One-Time Password
          </label>
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

        {/* New Password Input */}
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
          {isPending ? (
            <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
          ) : (
            "Verify & Login"
          )}
        </Button>
      </form>
    </div>
  )
}