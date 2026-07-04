import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { IconCheck, IconLogout } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/lib/auth'
import { Navbar } from '@/components/onboarding/Navbar'

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
  const { user } = Route.useRouteContext()
  const logoutMutation = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate({ to: '/login' })
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white p-10 rounded-3xl shadow-xl border text-center animate-in fade-in zoom-in-95 duration-500">
        
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <IconCheck size={40} stroke={3} />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          Onboarding Complete!
        </h1>
        
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          Thank you for providing your details. Your profile has been successfully submitted and is under review.
        </p>

        {user?.student?.hostel && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-center">
            <p className="text-sm font-semibold text-blue-900 mb-1">Your Hostel Assignment</p>
            <p className="text-2xl font-bold text-blue-700">
              {user.student.hostel.name.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Report to your hostel on arrival. Room number will be assigned at the desk.
            </p>
          </div>
        )}

        <div className="bg-slate-50 p-6 rounded-2xl mb-10 text-left border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wider">Next Steps</h3>
          <ul className="space-y-3 text-slate-600 text-sm">
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Report to {user?.student?.hostel ? user.student.hostel.name.replace(/_/g, ' ') : 'your assigned hostel'} on arrival</li>
            <li className="flex gap-2"><span className="text-primary font-bold">•</span> Room number will be assigned at the hostel desk</li>
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

      </main>

      <footer className="py-6 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Indian Institute of Technology Guwahati
      </footer>
    </div>
  )
}
