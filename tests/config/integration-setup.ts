/**
 * Integration Test Setup
 * Configures environment and utilities for integration testing
 */
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Integration test specific setup
beforeAll(async () => {
  console.log('🔧 Setting up integration test environment...');
  
  // Validate required environment variables for integration tests
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    console.warn('⚠️ Missing environment variables for integration tests:', missingEnvVars);
  }

  // Set integration test specific timeouts
  jest.setTimeout(30000); // 30 second timeout for integration tests

  console.log('✅ Integration test environment configured');
});

afterAll(async () => {
  console.log('🧹 Integration test cleanup completed');
});

beforeEach(() => {
  // Reset any per-test state if needed
});

afterEach(() => {
  // Clean up per-test resources if needed
});

// Make fetch available globally for integration tests
global.fetch = fetch;