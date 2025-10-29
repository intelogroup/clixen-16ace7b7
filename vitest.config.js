import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '*.config.js'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Optimize test execution
    isolate: false, // Run tests in same context for speed
    pool: 'threads', // Use worker threads for parallelization
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: false
      }
    },
    // Reduce overhead
    setupFiles: [],
    teardownTimeout: 5000
  }
});
