/**
 * Comprehensive Test Environment Configuration for Clixen MVP Testing
 * Sets up environment variables and configurations for testing against production infrastructure
 */

// Base test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_APP_ENV = 'test';

// Production Clixen Infrastructure Configuration
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig';

// n8n Integration Configuration
process.env.VITE_N8N_API_URL = process.env.VITE_N8N_API_URL || 'http://18.221.12.50:5678/api/v1';
process.env.VITE_N8N_API_KEY = process.env.VITE_N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU';

// Database Configuration
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.zfbgdixbzezpxllkoyfc:Goldyear2023#@aws-0-us-east-2.pooler.supabase.com:5432/postgres';

// Test Environment Configuration
process.env.TEST_TIMEOUT = '60000'; // 1 minute default timeout
process.env.TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
process.env.API_BASE_URL = process.env.API_BASE_URL || 'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1';

// Test User Credentials (Production Verified)
process.env.TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'jayveedz19@gmail.com';
process.env.TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Goldyear2023#';

// Performance Testing Thresholds
process.env.MAX_RESPONSE_TIME_MS = '2000'; // 2 seconds for API responses
process.env.MAX_WORKFLOW_GENERATION_TIME_MS = '30000'; // 30 seconds for workflow generation
process.env.MAX_DEPLOYMENT_TIME_MS = '60000'; // 1 minute for n8n deployment

// Load Testing Configuration
process.env.LOAD_TEST_CONCURRENT_USERS = '50'; // Start with 50 concurrent users
process.env.LOAD_TEST_MAX_USERS = '500'; // Scale up to 500 users
process.env.LOAD_TEST_DURATION_MINUTES = '5'; // 5 minute load test

// MVP Success Metrics Validation Targets
process.env.TARGET_ONBOARDING_COMPLETION_RATE = '0.7'; // 70%
process.env.TARGET_WORKFLOW_PERSISTENCE_RATE = '0.9'; // 90%
process.env.TARGET_DEPLOYMENT_SUCCESS_RATE = '0.8'; // 80%
process.env.TARGET_SYSTEM_UPTIME = '0.99'; // 99%

// Test-specific features
process.env.ENABLE_TEST_HELPERS = 'true';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.DISABLE_ANALYTICS = 'true'; // Disable analytics in tests
process.env.SECURITY_SCAN_ENABLED = 'true';
process.env.AUTO_CLEANUP_TEST_DATA = 'true';
process.env.GENERATE_HTML_REPORTS = 'true';

// CI/CD specific configuration
if (process.env.CI) {
  process.env.TEST_TIMEOUT = '90000'; // Longer timeout in CI
  process.env.HEADLESS = 'true';
  process.env.WORKERS = '1'; // Single worker in CI for stability
  process.env.VIDEO_ON_FAILURE = 'true';
  process.env.GENERATE_JUNIT_REPORTS = 'true';
} else {
  process.env.VERBOSE_LOGGING = 'true';
  process.env.SCREENSHOT_ON_FAILURE = 'true';
  process.env.LOAD_TEST_ENABLED = 'true';
}

// Global test configuration object
global.testConfig = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  n8n: {
    apiUrl: process.env.VITE_N8N_API_URL,
    apiKey: process.env.VITE_N8N_API_KEY
  },
  testUser: {
    email: process.env.TEST_USER_EMAIL,
    password: process.env.TEST_USER_PASSWORD
  },
  thresholds: {
    maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME_MS),
    maxWorkflowGeneration: parseInt(process.env.MAX_WORKFLOW_GENERATION_TIME_MS),
    maxDeployment: parseInt(process.env.MAX_DEPLOYMENT_TIME_MS)
  },
  mvpTargets: {
    onboardingCompletion: parseFloat(process.env.TARGET_ONBOARDING_COMPLETION_RATE),
    workflowPersistence: parseFloat(process.env.TARGET_WORKFLOW_PERSISTENCE_RATE),
    deploymentSuccess: parseFloat(process.env.TARGET_DEPLOYMENT_SUCCESS_RATE),
    systemUptime: parseFloat(process.env.TARGET_SYSTEM_UPTIME)
  },
  features: {
    securityScanning: process.env.SECURITY_SCAN_ENABLED === 'true',
    autoCleanup: process.env.AUTO_CLEANUP_TEST_DATA === 'true',
    loadTesting: !process.env.CI && process.env.LOAD_TEST_ENABLED === 'true',
    verboseLogging: process.env.VERBOSE_LOGGING === 'true'
  }
};

// Test utilities
global.testUtils = {
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  
  waitWithTimeout: (condition, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout after ${timeout}ms waiting for condition`));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },
  
  measurePerformance: async (operation, expectedMaxTime) => {
    const startTime = Date.now();
    let result, error;
    
    try {
      result = await operation();
    } catch (err) {
      error = err;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      result,
      error,
      duration,
      withinThreshold: duration <= expectedMaxTime,
      performance: { startTime, endTime, duration, threshold: expectedMaxTime }
    };
  }
};

console.log('🔧 Clixen MVP Test Environment Configured:', {
  nodeEnv: process.env.NODE_ENV,
  ci: !!process.env.CI,
  timeout: process.env.TEST_TIMEOUT,
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  n8nUrl: process.env.VITE_N8N_API_URL,
  testUser: process.env.TEST_USER_EMAIL,
  performanceThresholds: `API ${process.env.MAX_RESPONSE_TIME_MS}ms, Workflow ${process.env.MAX_WORKFLOW_GENERATION_TIME_MS}ms`,
  mvpTargets: `Onboarding ${process.env.TARGET_ONBOARDING_COMPLETION_RATE * 100}%, Deployment ${process.env.TARGET_DEPLOYMENT_SUCCESS_RATE * 100}%`
});