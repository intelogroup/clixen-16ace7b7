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
    host: "127.0.0.1",
    port: 8081,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    assetsInlineLimit: 4096, // Inline assets < 4KB
    chunkSizeWarningLimit: 1000, // Warn for chunks > 1MB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React and essential vendor libraries
          if (id.includes('node_modules')) {
            // Critical path - React ecosystem
            if (id.includes('react') && !id.includes('react-router') && !id.includes('react-hot-toast')) {
              return 'react-core';
            }
            
            // Supabase and database dependencies
            if (id.includes('@supabase') || id.includes('postgres') || id.includes('pg')) {
              return 'supabase';
            }
            
            // UI and icons - load on demand
            if (id.includes('lucide-react') || id.includes('@heroicons')) {
              return 'icons';
            }
            
            // Animation libraries - can be lazy loaded
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            
            // Routing and navigation
            if (id.includes('react-router')) {
              return 'routing';
            }
            
            // Utility libraries
            if (id.includes('zod') || id.includes('date-fns') || id.includes('clsx')) {
              return 'utilities';
            }
            
            // AI/ML related (lazy load)
            if (id.includes('openai') || id.includes('ai')) {
              return 'ai-libs';
            }
            
            // Toast and notifications
            if (id.includes('react-hot-toast')) {
              return 'notifications';
            }
            
            // Large libraries that can be split
            if (id.includes('react-markdown')) {
              return 'markdown';
            }
            
            // Remaining smaller libraries
            return 'vendor-misc';
          }
          
          // Application code chunks - optimized for lazy loading
          if (id.includes('/agents/')) {
            return 'agents';
          }
          if (id.includes('/auth/') || id.includes('Auth')) {
            return 'auth';
          }
          if (id.includes('/oauth/') || id.includes('OAuth')) {
            return 'oauth';  
          }
          if (id.includes('/api/') || id.includes('API')) {
            return 'api';
          }
          if (id.includes('/components/') && (id.includes('Modal') || id.includes('Workflow'))) {
            return 'workflow-ui';
          }
          if (id.includes('/pages/')) {
            return 'pages';
          }
        },
        chunkFileNames: (chunkInfo) => {
          // Add performance hints to chunk names
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${chunkInfo.name}-${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Organize assets by type
          const info = assetInfo.name!.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      },
      // External dependencies that should not be bundled
      external: (id) => {
        // Don't bundle these in edge functions
        return false; // Bundle everything for client-side
      }
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace'],
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Improve Safari compatibility
      }
    },
    reportCompressedSize: true,
    // Optimize for modern browsers
    cssCodeSplit: true,
  },
  publicDir: 'public',
  envPrefix: 'VITE_',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}))