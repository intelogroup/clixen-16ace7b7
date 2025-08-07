/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/integration/**/*.test.ts',
    '**/tests/integration/**/*.spec.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/test-setup.ts'
  ],
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@backend/(.*)$': '<rootDir>/backend/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'frontend/src/lib/services/**/*.ts',
    'frontend/src/lib/validation/**/*.ts',
    'backend/mcp/**/*.js',
    'backend/supabase/functions/**/*.ts',
    '!**/*.d.ts',
    '!**/*.config.ts',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  bail: false,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/config/global-setup.ts',
  globalTeardown: '<rootDir>/tests/config/global-teardown.ts',
  
  // Environment variables
  setupFiles: ['<rootDir>/tests/config/env-setup.js'],
  
  // Report configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/integration/html-report',
      filename: 'integration-test-report.html',
      pageTitle: 'n8n Integration System Tests'
    }]
  ],
  
  // Handle ES modules
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

module.exports = config;