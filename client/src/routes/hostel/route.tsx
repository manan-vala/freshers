import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router'
import { useLogout } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { IconLogout } from '@tabler/icons-react'

export const Route = createFileRoute('/hostel')({
  beforeLoad: ({ context }) => {
    if (!context.user || context.user.role !== 'HMC') {
      throw redirect({ to: '/' })
    }
  },
  component: HostelLayout,
})

function HostelLayout() {
  const logout = useLogout()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/hostel/dashboard" className="text-xl font-bold text-slate-900">
              Hostel Admin Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <IconLogout className="h-4 w-4 mr-2" />
              {logout.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
