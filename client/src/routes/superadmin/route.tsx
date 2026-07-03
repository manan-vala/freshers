import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { fetchMe } from '@/lib/auth'

export const Route = createFileRoute('/superadmin')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    if (location.pathname === '/superadmin/login') return;

    // Server-verified: calls GET /v1/auth/me — cannot be bypassed client-side
    const user = await queryClient.fetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: fetchMe,
    }).catch(() => null);

    if (!user || user.role !== 'ADMIN') {
      throw redirect({ to: '/superadmin/login' });
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
