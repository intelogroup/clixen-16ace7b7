/** @type {import('jest').Config} */
module.exports = {
  ...require('./jest.config.js'),
  
  // Integration test specific configuration
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{js,ts}',
    '<rootDir>/tests/api/**/*.test.{js,ts}'
  ],
  
  // Longer timeout for integration tests
  testTimeout: 30000,
  
  // Integration test specific setup
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/test-setup.ts',
    '<rootDir>/tests/config/integration-setup.ts'
  ],
  
  // Coverage configuration for integration tests
  collectCoverageFrom: [
    'supabase/functions/**/*.{js,ts}',
    'src/lib/services/**/*.{js,ts}',
    'src/lib/api/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.stories.{js,ts}'
  ],
  
  coverageDirectory: '<rootDir>/coverage/integration',
  
  // Integration test reporters
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports/integration',
      filename: 'integration-test-report.html',
      expand: true,
      hideIcon: false
    }],
    ['jest-junit', {
      outputDirectory: './test-reports/integration',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ],
  
  // Environment variables specific to integration tests
  testEnvironment: 'node',
  
  // Global variables for integration tests
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Module resolution for integration tests
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Transform configuration for ESM
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        target: 'esnext',
        module: 'esnext'
      }
    }]
  },
  
  // Module name mapping for integration tests
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1'
  }
};