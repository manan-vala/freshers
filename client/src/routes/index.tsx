import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
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
      // Fallback: If role is somehow unknown, log them out or just go to login to avoid infinite loop
      throw redirect({ to: '/login' })
    }
    throw redirect({ to: '/login' })
  },
  component: () => null, // Never rendered due to redirect
})
