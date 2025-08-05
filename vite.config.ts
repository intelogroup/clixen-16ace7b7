import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2015',
    minify: 'terser',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('@supabase') || id.includes('postgres')) {
              return 'supabase';
            }
            if (id.includes('lucide-react') || id.includes('@heroicons')) {
              return 'icons';
            }
            if (id.includes('framer-motion') || id.includes('react-hot-toast')) {
              return 'animations';
            }
            if (id.includes('zod') || id.includes('validation')) {
              return 'validation';
            }
            if (id.includes('openai') || id.includes('ai')) {
              return 'ai';
            }
            // Other node_modules go to a general vendor chunk
            return 'vendor-libs';
          }
          
          // App chunks based on functionality
          if (id.includes('/agents/')) {
            return 'agents';
          }
          if (id.includes('/auth/') || id.includes('Auth')) {
            return 'auth';
          }
          if (id.includes('/validation/')) {
            return 'validation';
          }
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  publicDir: 'public',
  envPrefix: 'VITE_',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}))