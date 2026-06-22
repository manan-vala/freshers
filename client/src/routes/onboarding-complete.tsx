import { createFileRoute, redirect } from '@tanstack/react-router'
import { IconCheck, IconLogout } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/lib/auth'

export const Route = createFileRoute('/onboarding-complete')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    // If somehow not submitted, back to onboarding
    if (context.user.student?.onboardingStatus !== 'SUBMITTED') {
      throw redirect({ to: '/onboarding' })
    }
  },
  component: OnboardingCompletePage,
})

function OnboardingCompletePage() {
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/login'
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-xl border text-center animate-in fade-in zoom-in-95 duration-500">
        
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheck size={40} stroke={3} />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Onboarding Complete!
        </h1>
        
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          Thank you for providing your details. Your profile has been successfully submitted and is under review. You will be notified once your hostel allocation is confirmed.
        </p>

        <div className="bg-slate-50 p-6 rounded-2xl mb-10 text-left border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Next Steps</h3>
          <ul className="space-y-3 text-slate-600 text-sm">
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Await hostel allotment email</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Check the portal periodically for updates</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Keep your original documents ready for physical verification</li>
          </ul>
        </div>

        <Button 
          variant="outline" 
          size="lg" 
          onClick={handleLogout}
          className="w-full sm:w-auto px-8"
          disabled={logoutMutation.isPending}
        >
          <IconLogout className="mr-2 h-5 w-5" />
          Log Out Securely
        </Button>
      </div>

      <footer className="mt-12 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Indian Institute of Technology Guwahati
      </footer>
    </div>
  )
}
