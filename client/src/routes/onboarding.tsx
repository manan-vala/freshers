import { useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authKeys } from '@/lib/auth'
import { AxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { GeneralDetailsStep } from '@/components/onboarding/GeneralDetailsStep'
import { MedicalDetailsStep } from '@/components/onboarding/MedicalDetailsStep'
import { ReviewStep } from '@/components/onboarding/ReviewStep'
import { initialOnboardingData, onboardingSchema, type OnboardingData } from '@/components/onboarding/types'
import { Navbar } from '@/components/onboarding/Navbar'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    if (context.user.student?.onboardingStatus === 'SUBMITTED') {
      throw redirect({ to: '/onboarding-complete' })
    }
  },
  component: OnboardingPage,
})

const STEPS = ["General Details", "Medical Details", "Review & Submit"];

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isConsented, setIsConsented] = useState(false);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      ...(initialOnboardingData as OnboardingData),
      fullName: user?.student?.name || '',
      email: user?.student?.gmailId || '',
    },
    mode: 'onChange',
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingData)[] = [];
    if (currentStep === 0) {
      fieldsToValidate = ['fullName', 'email', 'phone', 'emergencyPhone', 'emergencyContactName', 'emergencyContactRelation', 'programme', 'discipline', 'gender', 'permanentAddress', 'country', 'otherCountry', 'state'];
    } else if (currentStep === 1) {
      fieldsToValidate = ['dob', 'bloodGroup', 'medicalConditions', 'identificationMark', 'isHandicapped', 'handicapDetails'];
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate({ to: '/' });
    }
  };

  const submitMutation = useMutation({
    mutationFn: (data: OnboardingData) => {
      return api.post('/v1/onboarding/submit', data);
    },
    onSuccess: async () => {
      // Invalidate auth cache so the router context user is re-fetched with SUBMITTED status
      await queryClient.invalidateQueries({ queryKey: authKeys.me });
      navigate({ to: '/onboarding-complete' });
    },
    onError: (error: AxiosError<any>) => {
      const message = error.response?.data?.message ?? 'Submission failed. Please try again.';
      alert(`Onboarding submission failed: ${message}`);
    }
  });

  const onSubmit = (data: OnboardingData) => {
    if (!isConsented) return;
    submitMutation.mutate(data);
  };

  return (
    <div className="flex flex-col min-h-screen pb-12">
      <Navbar user={user} />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 mt-8">
        <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{STEPS[currentStep]}</h1>
            <p className="text-slate-500 text-sm">
              Please fill out the details below accurately.
            </p>
          </div>

          <StepIndicator steps={STEPS} currentStep={currentStep} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 mb-10 flex flex-col gap-8">
              <div>
                {currentStep === 0 && <GeneralDetailsStep />}
                {currentStep === 1 && <MedicalDetailsStep />}
                {currentStep === 2 && (
                  <ReviewStep 
                    isConsented={isConsented} 
                    setIsConsented={setIsConsented} 
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t">
                <Button type="button" variant="outline" onClick={handleBack}>
                  {currentStep === 0 ? "Cancel" : "Back"}
                </Button>
                
                {currentStep === STEPS.length - 1 ? (
                  <Button type="submit" disabled={!isConsented || submitMutation.isPending}>
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Profile'
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Next Step
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  )
}
