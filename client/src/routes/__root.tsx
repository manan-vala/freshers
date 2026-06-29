import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { authKeys, fetchMe, type User } from '@/lib/auth'
import { TooltipProvider } from '@/components/ui/tooltip'

export interface RouterContext {
  queryClient: QueryClient
  user: User | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context: { queryClient } }) => {
    try {
      const user = await queryClient.fetchQuery({
        queryKey: authKeys.me,
        queryFn: fetchMe,
        staleTime: 1000 * 60 * 5,
      })
      return { user }
    } catch (e) {
      return { user: null }
    }
  },
  component: () => (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Outlet />
      </div>
    </TooltipProvider>
  ),
})
