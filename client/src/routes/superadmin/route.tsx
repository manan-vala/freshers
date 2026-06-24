import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useSuperAdminStore } from '@/lib/superadmin'

export const Route = createFileRoute('/superadmin')({
  beforeLoad: ({ location }) => {
    // If we're not on the login page and we don't have a token, redirect to login
    const token = useSuperAdminStore.getState().accessToken;
    if (!token && location.pathname !== '/superadmin/login') {
      throw redirect({ to: '/superadmin/login' })
    }
  },
  component: SuperAdminLayout,
})

function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
    </div>
  )
}
