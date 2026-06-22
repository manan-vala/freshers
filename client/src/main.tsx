import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/queryClient'
import { Agentation } from "agentation"
import './index.css'

const router = createRouter({
  routeTree,
  basepath: import.meta.env.VITE_BASE_URL || '/',
  context: { 
    queryClient,
    user: null, 
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
    {import.meta.env.DEV && <Agentation />}
  </StrictMode>
)
