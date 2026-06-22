import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { GeneralDetailsStep } from '@/components/onboarding/GeneralDetailsStep'
import { MedicalDetailsStep } from '@/components/onboarding/MedicalDetailsStep'
import { ReviewStep } from '@/components/onboarding/ReviewStep'
import { initialOnboardingData, type OnboardingData } from '@/components/onboarding/types'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const STEPS = ["General Details", "Medical Details", "Review & Submit"];

function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [isConsented, setIsConsented] = useState(false);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleSubmit = () => {
    if (!isConsented) return;
    console.log("Submitting Onboarding Data:", data);
    alert("Onboarding submitted successfully! Check console for data.");
    navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col min-h-screen pb-12">
      <header className="flex items-center px-6 py-4 bg-white border-b sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
            IITG
          </div>
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

          <div className="mt-8 mb-10">
            {currentStep === 0 && (
              <GeneralDetailsStep data={data} updateData={updateData} />
            )}
            {currentStep === 1 && (
              <MedicalDetailsStep data={data} updateData={updateData} />
            )}
            {currentStep === 2 && (
              <ReviewStep data={data} isConsented={isConsented} setIsConsented={setIsConsented} />
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <Button variant="outline" onClick={handleBack}>
              {currentStep === 0 ? "Cancel" : "Back"}
            </Button>
            
            {currentStep === STEPS.length - 1 ? (
              <Button onClick={handleSubmit} disabled={!isConsented}>
                Submit Profile
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next Step
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
