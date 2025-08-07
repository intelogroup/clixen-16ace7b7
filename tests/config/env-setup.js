/**
 * Environment Setup for Tests
 * Sets up environment variables for different test environments
 */

// Base test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_APP_ENV = 'test';

// Supabase test configuration
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// n8n test configuration
process.env.VITE_N8N_API_URL = process.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1';
process.env.VITE_N8N_API_KEY = process.env.VITE_N8N_API_KEY || 'test-n8n-key';

// OpenAI test configuration (optional for testing)
process.env.VITE_OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || 'test-openai-key';

// Test database configuration
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';

// Test-specific features
process.env.ENABLE_TEST_HELPERS = 'true';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.DISABLE_ANALYTICS = 'true'; // Disable analytics in tests

// Performance testing thresholds
process.env.TEST_TIMEOUT = '30000'; // 30 seconds default timeout
process.env.PERFORMANCE_THRESHOLD_MS = '3000'; // 3 seconds for performance tests
process.env.API_TIMEOUT_MS = '10000'; // 10 seconds for API calls

// Security test configuration
process.env.ENABLE_SECURITY_TESTS = 'true';
process.env.TEST_USER_EMAIL = 'test@example.com';
process.env.TEST_USER_PASSWORD = 'TestPassword123!';

// CI/CD specific configuration
if (process.env.CI) {
  process.env.TEST_TIMEOUT = '60000'; // Longer timeout in CI
  process.env.HEADLESS = 'true';
  process.env.WORKERS = '1'; // Single worker in CI for stability
}

console.log('🔧 Test environment configured:', {
  nodeEnv: process.env.NODE_ENV,
  ci: !!process.env.CI,
  timeout: process.env.TEST_TIMEOUT
});