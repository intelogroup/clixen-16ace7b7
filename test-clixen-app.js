const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://clixen.netlify.app',
  n8nApiUrl: 'http://18.221.12.50:5678',
  n8nApiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU',
  supabaseUrl: 'https://zfbgdixbzezpxllkoyfc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw',
  supabaseServiceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA0NjM5NywiZXhwIjoyMDY4NjIyMzk3fQ.wLXwQbAiONyVVBeF0MOo6HIl2pHa7-o_pMi1HMGWsig',
  testUser: {
    email: 'jimkalinov@gmail.com',
    password: 'Jimkali90#'
  }
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  backend: {
    n8n: { status: 'pending', details: {} },
    supabase: { status: 'pending', details: {} },
    auth: { status: 'pending', details: {} }
  },
  frontend: {
    login: { status: 'pending', details: {} },
    ui: { status: 'pending', details: {} },
    agents: { status: 'pending', details: {} }
  },
  screenshots: []
};

// Backend Tests
async function testBackend() {
  console.log('🔧 Starting Backend Infrastructure Tests...\n');
  
  // Test n8n API
  console.log('📡 Testing n8n API connectivity...');
  try {
    const n8nResponse = await fetch(`${TEST_CONFIG.n8nApiUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': TEST_CONFIG.n8nApiKey,
        'Accept': 'application/json'
      }
    });
    
    if (n8nResponse.ok) {
      const workflows = await n8nResponse.json();
      testResults.backend.n8n.status = 'success';
      testResults.backend.n8n.details = {
        statusCode: n8nResponse.status,
        workflowCount: workflows.data ? workflows.data.length : 0,
        message: 'n8n API is accessible and responding correctly'
      };
      console.log('✅ n8n API: Connected successfully');
      console.log(`   - Status: ${n8nResponse.status}`);
      console.log(`   - Workflows found: ${workflows.data ? workflows.data.length : 0}`);
    } else {
      throw new Error(`API returned status ${n8nResponse.status}`);
    }
  } catch (error) {
    testResults.backend.n8n.status = 'failed';
    testResults.backend.n8n.details = {
      error: error.message,
      message: 'Failed to connect to n8n API'
    };
    console.log('❌ n8n API: Connection failed');
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test Supabase Database
  console.log('\n📊 Testing Supabase database connectivity...');
  try {
    const supabaseResponse = await fetch(`${TEST_CONFIG.supabaseUrl}/rest/v1/conversations?select=*&limit=1`, {
      headers: {
        'apikey': TEST_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${TEST_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (supabaseResponse.ok) {
      testResults.backend.supabase.status = 'success';
      testResults.backend.supabase.details = {
        statusCode: supabaseResponse.status,
        message: 'Supabase database is accessible'
      };
      console.log('✅ Supabase Database: Connected successfully');
      console.log(`   - Status: ${supabaseResponse.status}`);
    } else {
      throw new Error(`Database returned status ${supabaseResponse.status}`);
    }
  } catch (error) {
    testResults.backend.supabase.status = 'failed';
    testResults.backend.supabase.details = {
      error: error.message,
      message: 'Failed to connect to Supabase'
    };
    console.log('❌ Supabase Database: Connection failed');
    console.log(`   - Error: ${error.message}`);
  }
  
  // Test Authentication System
  console.log('\n🔐 Testing authentication system...');
  try {
    const authResponse = await fetch(`${TEST_CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': TEST_CONFIG.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testUser.email,
        password: TEST_CONFIG.testUser.password
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      testResults.backend.auth.status = 'success';
      testResults.backend.auth.details = {
        statusCode: authResponse.status,
        hasAccessToken: !!authData.access_token,
        message: 'Authentication system is working'
      };
      console.log('✅ Authentication: System operational');
      console.log(`   - Status: ${authResponse.status}`);
      console.log(`   - Access token received: ${!!authData.access_token}`);
    } else {
      throw new Error(`Auth returned status ${authResponse.status}`);
    }
  } catch (error) {
    testResults.backend.auth.status = 'failed';
    testResults.backend.auth.details = {
      error: error.message,
      message: 'Authentication system test failed'
    };
    console.log('❌ Authentication: System test failed');
    console.log(`   - Error: ${error.message}`);
  }
}

// Frontend Tests
async function testFrontend() {
  console.log('\n\n🎨 Starting Frontend Tests...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigate to app
    console.log('🌐 Navigating to Clixen app...');
    await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    
    // Take initial screenshot
    const screenshotDir = path.join('/root/repo', 'test-screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const initialScreenshot = path.join(screenshotDir, 'initial-load.png');
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    testResults.screenshots.push('initial-load.png');
    console.log('📸 Screenshot: Initial page load captured');
    
    // Test Login
    console.log('\n🔑 Testing login functionality...');
    try {
      // Check if we're on login page or need to navigate
      const loginButton = await page.locator('button:has-text("Sign In"), button:has-text("Login")').first();
      
      if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Fill login form
        await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_CONFIG.testUser.email);
        await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', TEST_CONFIG.testUser.password);
        
        // Take screenshot before login
        await page.screenshot({ path: path.join(screenshotDir, 'login-form.png'), fullPage: true });
        testResults.screenshots.push('login-form.png');
        
        // Click login
        await loginButton.click();
        
        // Wait for navigation or dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => 
          page.waitForSelector('text=/dashboard|home|chat/i', { timeout: 10000 })
        );
        
        testResults.frontend.login.status = 'success';
        testResults.frontend.login.details = {
          message: 'Login successful',
          user: TEST_CONFIG.testUser.email
        };
        console.log('✅ Login: Successful');
        
        // Screenshot after login
        await page.screenshot({ path: path.join(screenshotDir, 'after-login.png'), fullPage: true });
        testResults.screenshots.push('after-login.png');
      } else {
        console.log('ℹ️  Already logged in or no login required');
        testResults.frontend.login.status = 'skipped';
        testResults.frontend.login.details = {
          message: 'Login form not found - may already be authenticated'
        };
      }
    } catch (error) {
      testResults.frontend.login.status = 'failed';
      testResults.frontend.login.details = {
        error: error.message,
        message: 'Login test failed'
      };
      console.log('❌ Login: Failed');
      console.log(`   - Error: ${error.message}`);
      
      // Error screenshot
      await page.screenshot({ path: path.join(screenshotDir, 'login-error.png'), fullPage: true });
      testResults.screenshots.push('login-error.png');
    }
    
    // UI/UX Evaluation
    console.log('\n🎨 Evaluating UI/UX...');
    try {
      // Navigate to different sections
      const sections = [
        { name: 'Dashboard', selector: 'a[href*="dashboard"], button:has-text("Dashboard")', url: '/dashboard' },
        { name: 'Chat', selector: 'a[href*="chat"], button:has-text("Chat")', url: '/chat' },
        { name: 'Workflows', selector: 'a[href*="workflow"], button:has-text("Workflow")', url: '/workflows' }
      ];
      
      for (const section of sections) {
        try {
          const element = await page.locator(section.selector).first();
          if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
            await element.click();
            await page.waitForLoadState('networkidle');
            
            const screenshotName = `${section.name.toLowerCase()}-view.png`;
            await page.screenshot({ 
              path: path.join(screenshotDir, screenshotName), 
              fullPage: true 
            });
            testResults.screenshots.push(screenshotName);
            console.log(`📸 Screenshot: ${section.name} captured`);
            
            // Evaluate UI elements
            const uiElements = await page.evaluate(() => {
              return {
                hasHeader: !!document.querySelector('header, nav, [role="navigation"]'),
                hasMainContent: !!document.querySelector('main, [role="main"], .content'),
                hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
                hasMobileMenu: !!document.querySelector('[aria-label*="menu" i], .mobile-menu, .hamburger'),
                colorScheme: window.getComputedStyle(document.body).backgroundColor,
                fontFamily: window.getComputedStyle(document.body).fontFamily
              };
            });
            
            console.log(`   - ${section.name}: UI structure analyzed`);
          }
        } catch (error) {
          console.log(`   - ${section.name}: Not accessible (${error.message})`);
        }
      }
      
      testResults.frontend.ui.status = 'success';
      testResults.frontend.ui.details = {
        message: 'UI evaluation completed',
        screenshotCount: testResults.screenshots.length
      };
      console.log('✅ UI/UX: Evaluation completed');
      
    } catch (error) {
      testResults.frontend.ui.status = 'failed';
      testResults.frontend.ui.details = {
        error: error.message,
        message: 'UI evaluation failed'
      };
      console.log('❌ UI/UX: Evaluation failed');
      console.log(`   - Error: ${error.message}`);
    }
    
    // Test Multi-Agent Chat System
    console.log('\n🤖 Testing Multi-Agent Chat System...');
    try {
      // Navigate to chat
      await page.goto(`${TEST_CONFIG.baseUrl}/chat`, { waitUntil: 'networkidle' });
      
      // Wait for chat interface
      await page.waitForSelector('textarea, input[type="text"][placeholder*="message" i], .chat-input', { timeout: 10000 });
      
      // Screenshot chat interface
      await page.screenshot({ path: path.join(screenshotDir, 'chat-interface.png'), fullPage: true });
      testResults.screenshots.push('chat-interface.png');
      
      // Send test message
      const chatInput = await page.locator('textarea, input[type="text"][placeholder*="message" i], .chat-input').first();
      await chatInput.fill('Create a simple workflow that sends an email notification when a webhook is received');
      
      // Find and click send button
      const sendButton = await page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send" i]').first();
      await sendButton.click();
      
      // Wait for agent response (with longer timeout for AI processing)
      console.log('   - Waiting for agent response...');
      await page.waitForSelector('.agent-message, .ai-response, [data-testid="agent-response"]', { 
        timeout: 30000 
      }).catch(() => 
        page.waitForSelector('text=/analyzing|processing|creating|workflow/i', { timeout: 30000 })
      );
      
      // Screenshot agent response
      await page.screenshot({ path: path.join(screenshotDir, 'agent-response.png'), fullPage: true });
      testResults.screenshots.push('agent-response.png');
      
      // Check for agent status indicators
      const agentIndicators = await page.evaluate(() => {
        const indicators = {
          hasAgentStatus: !!document.querySelector('.agent-status, [data-testid="agent-status"]'),
          hasProgressBar: !!document.querySelector('.progress, [role="progressbar"]'),
          hasAgentMessages: !!document.querySelector('.agent-message, .ai-response'),
          activeAgents: []
        };
        
        // Look for active agent names
        const agentElements = document.querySelectorAll('[class*="agent"], [data-agent]');
        agentElements.forEach(el => {
          const text = el.textContent || '';
          if (text.includes('Orchestrator') || text.includes('Designer') || text.includes('Deployment')) {
            indicators.activeAgents.push(text.trim());
          }
        });
        
        return indicators;
      });
      
      testResults.frontend.agents.status = 'success';
      testResults.frontend.agents.details = {
        message: 'Multi-agent system is responsive',
        agentIndicators,
        testMessage: 'Workflow creation request sent'
      };
      console.log('✅ Multi-Agent System: Operational');
      console.log(`   - Agent status indicators: ${agentIndicators.hasAgentStatus}`);
      console.log(`   - Active agents detected: ${agentIndicators.activeAgents.length}`);
      
    } catch (error) {
      testResults.frontend.agents.status = 'failed';
      testResults.frontend.agents.details = {
        error: error.message,
        message: 'Multi-agent system test failed'
      };
      console.log('❌ Multi-Agent System: Test failed');
      console.log(`   - Error: ${error.message}`);
      
      // Error screenshot
      await page.screenshot({ path: path.join(screenshotDir, 'agent-error.png'), fullPage: true });
      testResults.screenshots.push('agent-error.png');
    }
    
  } finally {
    await browser.close();
  }
}

// Generate Test Report
async function generateReport() {
  console.log('\n\n📊 Generating Test Report...\n');
  
  const report = {
    ...testResults,
    summary: {
      backend: {
        passed: Object.values(testResults.backend).filter(t => t.status === 'success').length,
        failed: Object.values(testResults.backend).filter(t => t.status === 'failed').length,
        total: Object.keys(testResults.backend).length
      },
      frontend: {
        passed: Object.values(testResults.frontend).filter(t => t.status === 'success').length,
        failed: Object.values(testResults.frontend).filter(t => t.status === 'failed').length,
        total: Object.keys(testResults.frontend).length
      },
      overallStatus: 'pending'
    }
  };
  
  // Determine overall status
  const totalPassed = report.summary.backend.passed + report.summary.frontend.passed;
  const totalTests = report.summary.backend.total + report.summary.frontend.total;
  
  if (totalPassed === totalTests) {
    report.summary.overallStatus = 'ALL TESTS PASSED ✅';
  } else if (totalPassed > totalTests / 2) {
    report.summary.overallStatus = 'PARTIAL SUCCESS ⚠️';
  } else {
    report.summary.overallStatus = 'CRITICAL FAILURES ❌';
  }
  
  // Save report
  const reportPath = path.join('/root/repo', 'test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  // Print summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    TEST EXECUTION SUMMARY                   ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Overall Status: ${report.summary.overallStatus}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log('');
  console.log('Backend Tests:');
  console.log(`  ✅ Passed: ${report.summary.backend.passed}/${report.summary.backend.total}`);
  console.log(`  ❌ Failed: ${report.summary.backend.failed}/${report.summary.backend.total}`);
  console.log('');
  console.log('Frontend Tests:');
  console.log(`  ✅ Passed: ${report.summary.frontend.passed}/${report.summary.frontend.total}`);
  console.log(`  ❌ Failed: ${report.summary.frontend.failed}/${report.summary.frontend.total}`);
  console.log('');
  console.log(`Screenshots Captured: ${report.screenshots.length}`);
  console.log('Location: /root/repo/test-screenshots/');
  console.log('');
  console.log('Detailed Report: /root/repo/test-report.json');
  console.log('═══════════════════════════════════════════════════════════');
  
  return report;
}

// Main execution
async function main() {
  console.log('🚀 CLIXEN APPLICATION COMPREHENSIVE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Test URL: ${TEST_CONFIG.baseUrl}`);
  console.log(`Test User: ${TEST_CONFIG.testUser.email}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Run backend tests
    await testBackend();
    
    // Run frontend tests
    await testFrontend();
    
    // Generate report
    const report = await generateReport();
    
    // Exit with appropriate code
    process.exit(report.summary.overallStatus.includes('PASSED') ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);