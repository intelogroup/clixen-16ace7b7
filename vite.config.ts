import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from 'lovable-tagger'
import postcssConfig from './frontend/postcss.config.js'

// Root Vite config that serves the frontend app
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
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
  css: { postcss: postcssConfig },
  publicDir: 'frontend/public',
  envPrefix: 'VITE_',
}))
