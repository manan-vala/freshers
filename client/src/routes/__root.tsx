import { createRootRouteWithContext, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const isAuthRoute = location.pathname === '/login'

    if (!isAuthRoute && location.pathname === '/') {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
