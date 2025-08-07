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
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') && !id.includes('react-router') && !id.includes('react-hot-toast')) {
              return 'react-core';
            }
            if (id.includes('@supabase') || id.includes('postgres') || id.includes('pg')) {
              return 'supabase';
            }
            if (id.includes('lucide-react') || id.includes('@heroicons')) {
              return 'icons';
            }
            if (id.includes('framer-motion')) {
              return 'animations';
            }
            if (id.includes('react-router')) {
              return 'routing';
            }
            if (id.includes('zod') || id.includes('date-fns') || id.includes('clsx')) {
              return 'utilities';
            }
            if (id.includes('openai') || id.includes('ai')) {
              return 'ai-libs';
            }
            if (id.includes('react-hot-toast')) {
              return 'notifications';
            }
            if (id.includes('react-markdown')) {
              return 'markdown';
            }
            return 'vendor-misc';
          }
          
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
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${chunkInfo.name}-${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
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
      external: (id) => {
        return false;
      }
    },
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      }
    },
    reportCompressedSize: true,
    cssCodeSplit: true,
  },
  publicDir: 'public',
  envPrefix: 'VITE_',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}))