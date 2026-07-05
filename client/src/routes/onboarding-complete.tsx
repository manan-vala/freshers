import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { IconCheck, IconLogout, IconBuilding, IconCircleCheck } from '@tabler/icons-react'
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

  const hostelName = user?.student?.hostel?.name.replace(/_/g, ' ') ?? null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar user={user} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Top accent strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-green-400 to-emerald-500" />

            <div className="px-8 pt-8 pb-6 text-center">
              {/* Success icon */}
              <div className="relative inline-flex items-center justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-green-50 ring-8 ring-green-50/60 flex items-center justify-center">
                  <IconCheck size={30} stroke={2.5} className="text-green-600" />
                </div>
              </div>

              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Onboarding Complete
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                Your profile has been submitted successfully and is now under review by the hostel administration.
              </p>
            </div>

            {/* Hostel assignment */}
            {hostelName && (
              <div className="mx-6 mb-5 rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <IconBuilding size={18} className="text-blue-600" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-0.5">Hostel Assignment</p>
                  <p className="text-sm font-semibold text-blue-900 truncate">{hostelName}</p>
                </div>
              </div>
            )}

            {/* Next steps */}
            <div className="mx-6 mb-6 rounded-xl bg-slate-50 border border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Next Steps</p>
              <ul className="space-y-2.5">
                {[
                  `Report to ${hostelName ?? 'your assigned hostel'} on arrival`,
                  'Room number will be assigned at the hostel desk',
                  'Keep original documents ready for physical verification',
                ].map((step) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <IconCircleCheck size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action */}
            <div className="px-6 pb-7">
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="w-full gap-2 text-slate-600"
              >
                <IconLogout size={16} />
                {logoutMutation.isPending ? 'Logging out…' : 'Log Out Securely'}
              </Button>
            </div>

          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-5">
            © {new Date().getFullYear()} Indian Institute of Technology Guwahati
          </p>

        </div>
      </main>
    </div>
  )
}
