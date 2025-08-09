import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from 'lovable-tagger'

// Root Vite config that points to the frontend app
export default defineConfig(({ mode }) => ({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'frontend/src')
    }
  },
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  envPrefix: 'VITE_',
}))
