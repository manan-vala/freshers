import { createFileRoute, redirect, Outlet, Link } from '@tanstack/react-router'
import { useLogout } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { IconLogout, IconBuildingCommunity } from '@tabler/icons-react'
import { useHostelStats } from '@/hooks/useHostelDashboard'

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
  const { data: stats } = useHostelStats()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'oklch(0.98 0.005 91)' }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/hostel/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: 'oklch(0.852 0.199 91.936)' }}
            >
              <IconBuildingCommunity className="h-5 w-5" style={{ color: 'oklch(0.421 0.095 57.708)' }} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                HMC Admin Portal
              </p>
              {stats?.hostelName && (
                <p className="text-xs text-slate-400 font-medium leading-none mt-0.5">{stats.hostelName}</p>
              )}
            </div>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 gap-2"
            >
              <IconLogout className="h-4 w-4" />
              {logout.isPending ? 'Logging out…' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
