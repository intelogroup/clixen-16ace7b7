import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for Clixen MVP Testing
 * Comprehensive E2E testing configuration with multiple environments and devices
 */
export default defineConfig({
  testDir: '../e2e',
  
  // Test execution configuration
  fullyParallel: !process.env.CI, // Parallel in development, sequential in CI
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60000, // 1 minute per test
  
  // Reporting configuration
  reporter: [
    ['html', { 
      outputFolder: '../test-reports/e2e',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { 
      outputFile: '../test-reports/e2e/results.json' 
    }],
    ['junit', { 
      outputFile: '../test-reports/e2e/junit.xml' 
    }],
    ['line'],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  // Global test configuration
  use: {
    // Base URL configuration
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Browser configuration
    headless: process.env.HEADLESS !== 'false',
    
    // Timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Additional options
    ignoreHTTPSErrors: true,
    
    // Test context options
    contextOptions: {
      permissions: ['clipboard-read', 'clipboard-write'],
      geolocation: { longitude: -122.4194, latitude: 37.7749 }, // San Francisco
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles'
    }
  },
  
  // Output directory
  outputDir: '../test-results/e2e',
  
  // Global setup and teardown
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
  
  // Test projects for different browsers and scenarios
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/
    },
    
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    // Tablet testing
    {
      name: 'tablet-portrait',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'tablet-landscape',
      use: { 
        ...devices['iPad Pro Landscape'],
        viewport: { width: 1366, height: 1024 }
      },
      dependencies: ['setup']
    },
    
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      },
      dependencies: ['setup']
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 }
      },
      dependencies: ['setup']
    },
    
    // Performance testing project
    {
      name: 'performance',
      testMatch: /.*performance.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    // Accessibility testing project
    {
      name: 'accessibility',
      testMatch: /.*accessibility.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup']
    },
    
    // API testing project (headless)
    {
      name: 'api',
      testMatch: /.*api.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api'
      },
      dependencies: ['setup']
    }
  ],
  
  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-key',
      VITE_N8N_API_URL: process.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1',
      VITE_N8N_API_KEY: process.env.VITE_N8N_API_KEY || 'test-n8n-key'
    }
  },
  
  // Expect configuration
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      mode: 'local',
      threshold: 0.2
    },
    toMatchSnapshot: {
      threshold: 0.2
    }
  }
});