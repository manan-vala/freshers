import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { RouterContext } from '@/routes/__root'

export const Route = createFileRoute('/admin/__layout')({
  beforeLoad: async ({ context }: { context: RouterContext }) => {
    const user = context.user
    if (!user || user.role !== 'ADMIN') {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
