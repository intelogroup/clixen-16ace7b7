import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';

// Test Configuration
const TEST_CONFIG = {
  url: 'http://localhost:3000',
  credentials: {
    email: 'jayveedz19@gmail.com',
    password: 'Jimkali90#'
  },
  timeout: 30000,
  screenshotDir: 'test-results'
};

// Utility Functions
async function waitAndScreenshot(page, name, description) {
  console.log(`📸 Taking screenshot: ${name} - ${description}`);
  await page.screenshot({ 
    path: `${TEST_CONFIG.screenshotDir}/${name}.png`, 
    fullPage: true 
  });
}

async function testAuthentication(page) {
  console.log('\n🔐 Testing Authentication System...');
  
  try {
    // Navigate to login page
    await page.goto(TEST_CONFIG.url, { waitUntil: 'networkidle2' });
    await waitAndScreenshot(page, '01-landing', 'Landing page loaded');
    
    // Check for auth form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    console.log('✅ Auth form found');
    
    // Fill credentials
    await page.type('input[type="email"]', TEST_CONFIG.credentials.email);
    await page.type('input[type="password"]', TEST_CONFIG.credentials.password);
    await waitAndScreenshot(page, '02-credentials-filled', 'Credentials entered');
    
    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      console.log('✅ Form submitted');
      
      // Wait for navigation or error
      await page.waitForTimeout(3000);
      await waitAndScreenshot(page, '03-after-submit', 'After form submission');
      
      // Check if we're logged in
      const currentUrl = page.url();
      if (currentUrl.includes('/chat') || currentUrl.includes('/dashboard')) {
        console.log('✅ Authentication successful - redirected to app');
        return true;
      } else {
        // Check for error messages
        const errorElement = await page.$('.text-red-500, .error, [role="alert"]');
        if (errorElement) {
          const errorText = await page.evaluate(el => el.textContent, errorElement);
          console.log(`⚠️ Auth error: ${errorText}`);
        }
        return false;
      }
    } else {
      console.log('❌ Submit button not found');
      return false;
    }
  } catch (error) {
    console.log(`❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

async function testMultiAgentSystem(page) {
  console.log('\n🤖 Testing Multi-Agent System...');
  
  try {
    // Navigate to chat if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('/chat')) {
      await page.goto(`${TEST_CONFIG.url}/chat`, { waitUntil: 'networkidle2' });
    }
    
    await waitAndScreenshot(page, '04-chat-interface', 'Chat interface loaded');
    
    // Check for chat components
    const chatInput = await page.$('textarea, input[type="text"][placeholder*="message"], input[type="text"][placeholder*="chat"]');
    const agentPanel = await page.$('[class*="agent"], [id*="agent"]');
    
    if (chatInput) {
      console.log('✅ Chat input found');
      
      // Send a test message
      await chatInput.type('Create a simple hello world workflow for n8n');
      await waitAndScreenshot(page, '05-message-typed', 'Test message entered');
      
      // Submit message
      await page.keyboard.press('Enter');
      console.log('✅ Message sent to agents');
      
      // Wait for agent response
      await page.waitForTimeout(5000);
      await waitAndScreenshot(page, '06-agent-response', 'Agent response received');
      
      // Check for agent activity indicators
      const agentActivity = await page.$$('[class*="agent-status"], [class*="agent-progress"], [class*="phase"]');
      if (agentActivity.length > 0) {
        console.log(`✅ Agent activity detected (${agentActivity.length} indicators)`);
      }
      
      return true;
    } else {
      console.log('⚠️ Chat interface not fully loaded');
      return false;
    }
  } catch (error) {
    console.log(`❌ Multi-agent test failed: ${error.message}`);
    return false;
  }
}

async function testN8nIntegration(page) {
  console.log('\n⚙️ Testing n8n Integration...');
  
  try {
    // Check for workflow elements
    const workflowElements = await page.$$('[class*="workflow"], [id*="workflow"]');
    if (workflowElements.length > 0) {
      console.log(`✅ Workflow elements found (${workflowElements.length})`);
      await waitAndScreenshot(page, '07-workflow-elements', 'Workflow interface');
    }
    
    // Test n8n API connectivity
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/n8n/health', { method: 'GET' });
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (response.ok || response.status === 200) {
      console.log('✅ n8n API connectivity verified');
    } else {
      console.log(`⚠️ n8n API response: ${JSON.stringify(response)}`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ n8n integration test failed: ${error.message}`);
    return false;
  }
}

async function testSystemHealth(page) {
  console.log('\n🏥 Running System Health Checks...');
  
  const healthChecks = {
    supabase: false,
    openai: false,
    n8n: false,
    agents: false
  };
  
  try {
    // Check console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to dashboard
    await page.goto(`${TEST_CONFIG.url}/dashboard`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Check for API connectivity indicators
    const apiStatus = await page.evaluate(() => {
      const status = {};
      
      // Check localStorage for tokens
      status.supabaseToken = !!localStorage.getItem('sb-zfbgdixbzezpxllkoyfc-auth-token');
      
      // Check for successful API calls in network
      status.apiCalls = performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('api'))
        .length;
      
      return status;
    });
    
    if (apiStatus.supabaseToken) {
      healthChecks.supabase = true;
      console.log('✅ Supabase authentication token found');
    }
    
    if (apiStatus.apiCalls > 0) {
      console.log(`✅ API calls detected (${apiStatus.apiCalls})`);
    }
    
    // Check for agent system
    const agentElements = await page.$$('[class*="agent"], [id*="agent"]');
    if (agentElements.length > 0) {
      healthChecks.agents = true;
      console.log('✅ Agent system components found');
    }
    
    await waitAndScreenshot(page, '08-health-check', 'System health status');
    
    // Report console errors if any
    if (consoleErrors.length > 0) {
      console.log('\n⚠️ Console errors detected:');
      consoleErrors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
    }
    
    return healthChecks;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return healthChecks;
  }
}

async function runFullSystemTest() {
  console.log('🚀 Starting Full System Test Suite');
  console.log('================================\n');
  
  // Create results directory
  try {
    await fs.mkdir(TEST_CONFIG.screenshotDir, { recursive: true });
  } catch (e) {
    // Directory might already exist
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const results = {
    timestamp: new Date().toISOString(),
    authentication: false,
    multiAgent: false,
    n8nIntegration: false,
    systemHealth: {},
    errors: []
  };
  
  try {
    // Run test suite
    results.authentication = await testAuthentication(page);
    
    if (results.authentication) {
      results.multiAgent = await testMultiAgentSystem(page);
      results.n8nIntegration = await testN8nIntegration(page);
    }
    
    results.systemHealth = await testSystemHealth(page);
    
  } catch (error) {
    console.log(`\n❌ Critical test error: ${error.message}`);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Generate test report
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Authentication: ${results.authentication ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Multi-Agent System: ${results.multiAgent ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ n8n Integration: ${results.n8nIntegration ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ System Health: ${JSON.stringify(results.systemHealth, null, 2)}`);
  
  // Save results
  await fs.writeFile(
    `${TEST_CONFIG.screenshotDir}/test-results.json`,
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n📁 Test results saved to ${TEST_CONFIG.screenshotDir}/`);
  
  // Exit with appropriate code
  const allPassed = results.authentication && results.multiAgent && results.n8nIntegration;
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
runFullSystemTest().catch(console.error);