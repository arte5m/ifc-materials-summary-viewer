import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    },
    // Headers removed to disable cross-origin isolation
    // This forces web-ifc to use single-threaded mode (no workers)
    // and eliminates worker loading errors
  },
  optimizeDeps: {
    exclude: ['@thatopen/components', '@thatopen/components-front', 'web-ifc', 'three']
  }
})
