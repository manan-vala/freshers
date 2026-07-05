import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconLoader2, IconEye, IconEyeOff } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSignUpInit, useSignUpVerifyOtp, useSignUpComplete } from '@/lib/auth';
import { signUpInitSchema, signUpCompleteSchema, type SignUpInitInput, type SignUpCompleteInput } from '@shared/auth';

interface SignUpPanelProps {
  onRegistrationComplete: () => void;
}

export function SignUpPanel({ onRegistrationComplete }: SignUpPanelProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [outlookId, setOutlookId] = useState('');
  const [otp, setOtp] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const initMutation = useSignUpInit();
  const verifyMutation = useSignUpVerifyOtp();
  const completeMutation = useSignUpComplete();

  // Step 1: Email Form
  const emailForm = useForm<SignUpInitInput>({
    resolver: zodResolver(signUpInitSchema),
    defaultValues: { outlookId: '' },
  });

  const onEmailSubmit = (data: SignUpInitInput) => {
    initMutation.mutate(data, {
      onSuccess: () => {
        setOutlookId(data.outlookId);
        setStep('otp');
      },
      onError: (error: any) => {
        emailForm.setError('root', {
          type: 'manual',
          message: error.response?.data?.message || 'Failed to initiate sign up',
        });
      },
    });
  };

  // Step 2: OTP Verification
  const [otpError, setOtpError] = useState('');
  const onOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (otp.length !== 6) {
      setOtpError('Please enter the full 6-digit OTP');
      return;
    }
    verifyMutation.mutate({ outlookId, otp }, {
      onSuccess: () => {
        setIsDialogOpen(true);
      },
      onError: (error: any) => {
        setOtpError(error.response?.data?.message || 'Invalid OTP');
      },
    });
  };

  // Step 3: Password Creation
  const passwordForm = useForm<SignUpCompleteInput>({
    resolver: zodResolver(signUpCompleteSchema),
    defaultValues: { outlookId: '', newPassword: '', confirmPassword: '' },
  });

  // Keep outlookId in sync for the password form
  if (passwordForm.getValues('outlookId') !== outlookId && outlookId) {
    passwordForm.setValue('outlookId', outlookId);
  }

  const onPasswordSubmit = (data: SignUpCompleteInput) => {
    completeMutation.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        onRegistrationComplete();
      },
      onError: (error: any) => {
        passwordForm.setError('root', {
          type: 'manual',
          message: error.response?.data?.message || 'Failed to set password',
        });
      },
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {step === 'email' && (
        <>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">First Time Login</h2>
            <p className="text-slate-500 text-sm">Enter your institute email to verify your account</p>
          </div>

          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
              <FormField
                control={emailForm.control}
                name="outlookId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institute Email</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. name@iitg.ac.in" {...field} className="h-11" type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {emailForm.formState.errors.root && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                  {emailForm.formState.errors.root.message}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={initMutation.isPending}>
                {initMutation.isPending ? <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP...</> : "Verify Email"}
              </Button>
            </form>
          </Form>
        </>
      )}

      {step === 'otp' && (
        <div className="animate-in zoom-in-95 duration-300">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Verification Code</h2>
            <p className="text-slate-500 text-sm">
              We sent a 6-digit code to your registered Gmail address linked to <strong>{outlookId}</strong>.
            </p>
          </div>

          <form onSubmit={onOtpSubmit} className="space-y-6">
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

            {otpError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                {otpError}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base" disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</> : "Verify & Continue"}
            </Button>
            <div className="text-center">
               <button type="button" onClick={() => setStep('email')} className="text-sm text-blue-600 hover:underline">Change Email</button>
            </div>
          </form>
        </div>
      )}

      {/* AlertDialog for setting password */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Your Password</AlertDialogTitle>
            <AlertDialogDescription>
              Your email has been verified! Please set a strong, permanent password for your portal account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 py-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" {...field} className="h-11 pr-10" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} placeholder="Confirm your password" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {passwordForm.formState.errors.root && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 font-medium text-center">
                  {passwordForm.formState.errors.root.message}
                </div>
              )}

              <AlertDialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={completeMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? <><IconLoader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : "Complete Registration"}
                </Button>
              </AlertDialogFooter>
            </form>
          </Form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
