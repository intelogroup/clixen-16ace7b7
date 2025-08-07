/**
 * Global Setup for E2E Tests
 * Prepares test environment and creates test data
 */
import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  const startTime = Date.now();
  
  try {
    // Environment validation
    console.log('🔧 Validating test environment...');
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(
      envVar => !process.env[envVar]
    );
    
    if (missingEnvVars.length > 0) {
      console.warn('⚠️  Missing environment variables:', missingEnvVars);
      // Set default test values
      process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
    }
    
    // Test database connection (if available)
    console.log('🗃️  Testing database connection...');
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
      );
      
      // Try to perform a simple query
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .single();
        
      if (error && !error.message.includes('relation "users" does not exist')) {
        console.warn('⚠️  Database connection issue:', error.message);
      } else {
        console.log('✅ Database connection verified');
      }
    } catch (dbError) {
      console.warn('⚠️  Database connection test failed:', dbError);
    }
    
    // Setup test users and data
    console.log('👥 Setting up test data...');
    await setupTestData();
    
    // Verify application accessibility
    console.log('🌐 Checking application availability...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      const baseUrl = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
      console.log(`📍 Testing URL: ${baseUrl}`);
      
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const title = await page.title();
      console.log(`📄 Application title: "${title}"`);
      
      // Take a screenshot of the initial state
      await page.screenshot({ 
        path: 'test-results/global-setup-screenshot.png',
        fullPage: true 
      });
      
      console.log('✅ Application is accessible');
    } catch (appError) {
      console.error('❌ Application accessibility check failed:', appError);
      throw new Error(`Application is not accessible: ${appError}`);
    } finally {
      await browser.close();
    }
    
    // Performance baseline measurement
    console.log('⚡ Measuring performance baseline...');
    await measurePerformanceBaseline();
    
    const setupTime = Date.now() - startTime;
    console.log(`🎉 Global setup completed in ${setupTime}ms`);
    
    // Save setup metadata
    const setupInfo = {
      timestamp: new Date().toISOString(),
      duration: setupTime,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CI: !!process.env.CI,
        baseURL: config.projects[0]?.use?.baseURL
      },
      testUsers: await getTestUserInfo()
    };
    
    // Write setup info to file for other tests to use
    await require('fs/promises').writeFile(
      'test-results/setup-info.json',
      JSON.stringify(setupInfo, null, 2)
    );
    
    console.log('📋 Setup information saved to test-results/setup-info.json');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupTestData() {
  try {
    // Create test users
    const testUsers = [
      {
        email: 'test-user-1@example.com',
        password: 'TestPassword123!',
        role: 'basic'
      },
      {
        email: 'test-user-2@example.com', 
        password: 'TestPassword456!',
        role: 'pro'
      }
    ];
    
    console.log(`👥 Created ${testUsers.length} test user configurations`);
    
    // Create test projects
    const testProjects = [
      {
        name: 'Test Project 1',
        description: 'Sample project for testing basic workflows'
      },
      {
        name: 'Test Project 2',
        description: 'Sample project for testing advanced features'
      }
    ];
    
    console.log(`📁 Created ${testProjects.length} test project configurations`);
    
    // Create test workflow templates
    const testWorkflows = [
      {
        name: 'Simple Test Workflow',
        description: 'A basic workflow for testing deployment',
        template: {
          nodes: [
            {
              id: '1',
              type: 'trigger',
              typeVersion: 1,
              position: [100, 100]
            }
          ],
          connections: {}
        }
      }
    ];
    
    console.log(`🔄 Created ${testWorkflows.length} test workflow templates`);
    
    // Save test data to fixtures
    const testData = {
      users: testUsers,
      projects: testProjects,
      workflows: testWorkflows,
      generatedAt: new Date().toISOString()
    };
    
    await require('fs/promises').writeFile(
      'tests/fixtures/test-data.json',
      JSON.stringify(testData, null, 2)
    );
    
    console.log('💾 Test data saved to fixtures');
    
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    throw error;
  }
}

async function measurePerformanceBaseline() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    
    // Measure initial page load
    const startTime = Date.now();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => ({
      loadEventEnd: performance.timing.loadEventEnd,
      navigationStart: performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      firstPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
    }));
    
    const baseline = {
      timestamp: new Date().toISOString(),
      loadTime,
      ...performanceMetrics
    };
    
    await require('fs/promises').writeFile(
      'test-results/performance-baseline.json',
      JSON.stringify(baseline, null, 2)
    );
    
    console.log(`⚡ Performance baseline recorded: ${loadTime}ms load time`);
    
  } catch (error) {
    console.warn('⚠️  Performance baseline measurement failed:', error);
  } finally {
    await browser.close();
  }
}

async function getTestUserInfo() {
  try {
    const testDataPath = 'tests/fixtures/test-data.json';
    const testDataExists = await require('fs/promises').access(testDataPath).then(() => true).catch(() => false);
    
    if (testDataExists) {
      const testData = JSON.parse(
        await require('fs/promises').readFile(testDataPath, 'utf-8')
      );
      return testData.users.map((user: any) => ({
        email: user.email,
        role: user.role
      }));
    }
  } catch (error) {
    console.warn('⚠️  Could not load test user info:', error);
  }
  
  return [];
}

export default globalSetup;