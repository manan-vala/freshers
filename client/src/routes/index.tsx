import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      if (context.user.role === 'HMC') {
        throw redirect({ to: '/hostel/dashboard' })
      }
      if (context.user.role === 'STUDENT') {
        if (context.user.student?.onboardingStatus === 'SUBMITTED') {
          throw redirect({ to: '/onboarding-complete' })
        }
        throw redirect({ to: '/onboarding' })
      }
      throw redirect({ to: '/' })
    }
    throw redirect({ to: '/login' })
  },
  component: () => null, // Never rendered due to redirect
})
