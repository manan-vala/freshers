import { useState } from 'react'
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { GeneralDetailsStep } from '@/components/onboarding/GeneralDetailsStep'
import { MedicalDetailsStep } from '@/components/onboarding/MedicalDetailsStep'
import { ReviewStep } from '@/components/onboarding/ReviewStep'
import { initialOnboardingData, onboardingSchema, type OnboardingData } from '@/components/onboarding/types'

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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isConsented, setIsConsented] = useState(false);

  const form = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: initialOnboardingData as OnboardingData,
    mode: 'onChange',
  });

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingData)[] = [];
    if (currentStep === 0) {
      fieldsToValidate = ['fullName', 'email', 'phone', 'emergencyPhone', 'stream', 'department', 'gender'];
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

  const onSubmit = (data: any) => {
    if (!isConsented) return;
    console.log("Submitting Onboarding Data:", data);
    alert("Onboarding submitted successfully! Check console for data.");
    navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col min-h-screen pb-12">
      <header className="flex items-center px-6 py-4 bg-white border-b sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="IITG Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg text-slate-800">Fresher Onboarding</span>
        </div>
      </header>

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
                  <Button type="submit" disabled={!isConsented}>
                    Submit Profile
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
