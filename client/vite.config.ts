import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  // DEPLOYMENT: VITE_BASE_URL is the nginx route prefix (e.g. /freshers-onboarding).
  // Empty in development. Set at Docker build time in production.
  // Vite bakes this into the built assets as the base path for all file references.
  base: process.env.VITE_BASE_URL ? `${process.env.VITE_BASE_URL}/` : '/',

  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },

  server: {
    port: 3000,
    // DEV PROXY: In development, VITE_BASE_URL is empty so Axios baseURL is '/api'.
    // This proxy strips '/api' and forwards to the Express server.
    // Mirrors what nginx does in production with the /api/ location block.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/api/, ''),
      },
    },
  },
})
