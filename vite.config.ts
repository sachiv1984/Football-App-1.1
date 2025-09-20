import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // Add other aliases you might have been using
    }
  },
  // Environment variables prefix (change from REACT_APP_ to VITE_)
  envPrefix: 'VITE_',
  
  // Build configuration for production
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Adjust chunk size warnings if needed
    chunkSizeWarningLimit: 1600,
  },
  
  // Development server configuration
  server: {
    port: 3000,
    open: true,
  },
  
  // Preview server configuration
  preview: {
    port: 4173,
  }
})
