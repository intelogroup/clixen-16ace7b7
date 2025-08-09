import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Root Vite config that points to the frontend app
export default defineConfig(() => ({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  envPrefix: 'VITE_',
}))
