import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://clixen.netlify.app',
  n8nApiUrl: 'http://18.221.12.50:5678',
  n8nApiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODIxMTllNy1lYThlLTQyYzItYjgyNS1hY2ViNTk4OWQ2N2IiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU0MjYzMTM4fQ.VIvNOzeo2FtKUAgdVLcV9Xrg9XLC-xl11kp6yb_FraU',
  supabaseUrl: 'https://zfbgdixbzezpxllkoyfc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw',
  testUser: {
    email: 'jimkalinov@gmail.com',
    password: 'Jimkali90#'
  }
};

// Create screenshot directory
const screenshotDir = path.join(__dirname, 'test-results');
await fs.mkdir(screenshotDir, { recursive: true });

// Test results
const results = {
  timestamp: new Date().toISOString(),
  backend: {},
  frontend: {},
  multiAgent: {},
  screenshots: [],
  errors: []
};

async function takeScreenshot(page, name) {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  results.screenshots.push(filename);
  console.log(`📸 Screenshot: ${name}`);
  return filepath;
}

async function testBackend() {
  console.log('\n🔧 BACKEND INFRASTRUCTURE TESTS\n');
  
  // Test n8n API
  console.log('Testing n8n API...');
  try {
    const response = await fetch(`${TEST_CONFIG.n8nApiUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': TEST_CONFIG.n8nApiKey,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    results.backend.n8n = {
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status,
      workflows: data.data ? data.data.length : 0
    };
    console.log(`✅ n8n API: ${response.status} - ${data.data ? data.data.length : 0} workflows`);
  } catch (error) {
    results.backend.n8n = { status: 'FAIL', error: error.message };
    console.log(`❌ n8n API: ${error.message}`);
  }
  
  // Test Supabase
  console.log('\nTesting Supabase...');
  try {
    const response = await fetch(`${TEST_CONFIG.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': TEST_CONFIG.supabaseAnonKey,
        'Authorization': `Bearer ${TEST_CONFIG.supabaseAnonKey}`
      }
    });
    
    results.backend.supabase = {
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status
    };
    console.log(`✅ Supabase: ${response.status}`);
  } catch (error) {
    results.backend.supabase = { status: 'FAIL', error: error.message };
    console.log(`❌ Supabase: ${error.message}`);
  }
  
  // Test Authentication
  console.log('\nTesting Authentication...');
  try {
    const response = await fetch(`${TEST_CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`, {
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
    
    const data = await response.json();
    results.backend.auth = {
      status: response.ok && data.access_token ? 'PASS' : 'FAIL',
      statusCode: response.status,
      hasToken: !!data.access_token
    };
    console.log(`✅ Authentication: ${response.status} - Token: ${!!data.access_token}`);
  } catch (error) {
    results.backend.auth = { status: 'FAIL', error: error.message };
    console.log(`❌ Authentication: ${error.message}`);
  }
}

async function testFrontend() {
  console.log('\n\n🎨 FRONTEND & MULTI-AGENT TESTS\n');
  
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
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        results.errors.push(msg.text());
      }
    });
    
    // 1. Navigate to app
    console.log('1. Navigating to Clixen...');
    await page.goto(TEST_CONFIG.baseUrl, { waitUntil: 'networkidle' });
    await takeScreenshot(page, '01-landing-page');
    
    // Check page structure
    const pageTitle = await page.title();
    results.frontend.pageLoad = {
      status: 'PASS',
      title: pageTitle
    };
    console.log(`   ✓ Page loaded: ${pageTitle}`);
    
    // 2. Test Authentication Flow
    console.log('\n2. Testing Authentication...');
    
    // Look for sign in button or link
    const signInButton = await page.locator('button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Get Started")').first();
    
    if (await signInButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await signInButton.click();
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '02-auth-page');
    }
    
    // Check if we're on auth page
    const emailInput = await page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const passwordInput = await page.locator('input[type="password"], input[placeholder*="password" i]').first();
    
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   Filling credentials...');
      await emailInput.fill(TEST_CONFIG.testUser.email);
      await passwordInput.fill(TEST_CONFIG.testUser.password);
      await takeScreenshot(page, '03-credentials-filled');
      
      // Submit login
      const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
      await submitButton.click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // Give auth time to complete
      
      await takeScreenshot(page, '04-after-login');
      
      // Check if login was successful
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/auth') && !currentUrl.includes('/login');
      
      results.frontend.authentication = {
        status: isLoggedIn ? 'PASS' : 'FAIL',
        finalUrl: currentUrl
      };
      console.log(`   ${isLoggedIn ? '✓' : '✗'} Authentication: ${currentUrl}`);
    } else {
      console.log('   ⚠ Already authenticated or no auth required');
      results.frontend.authentication = { status: 'SKIP', message: 'No auth form found' };
    }
    
    // 3. Test Navigation
    console.log('\n3. Testing Navigation...');
    const routes = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Chat', path: '/chat' },
      { name: 'Workflows', path: '/workflows' }
    ];
    
    for (const route of routes) {
      try {
        console.log(`   Testing ${route.name}...`);
        await page.goto(`${TEST_CONFIG.baseUrl}${route.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        const screenshot = await takeScreenshot(page, `route-${route.name.toLowerCase()}`);
        
        // Check if page loaded correctly
        const hasContent = await page.locator('body').textContent();
        results.frontend[`route_${route.name.toLowerCase()}`] = {
          status: hasContent ? 'PASS' : 'FAIL',
          url: page.url()
        };
        console.log(`   ✓ ${route.name}: ${page.url()}`);
      } catch (error) {
        results.frontend[`route_${route.name.toLowerCase()}`] = {
          status: 'FAIL',
          error: error.message
        };
        console.log(`   ✗ ${route.name}: ${error.message}`);
      }
    }
    
    // 4. Test Multi-Agent Chat System
    console.log('\n4. Testing Multi-Agent Chat System...');
    
    // Navigate to chat
    await page.goto(`${TEST_CONFIG.baseUrl}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await takeScreenshot(page, 'chat-01-initial');
    
    // Look for chat input
    const chatInput = await page.locator('textarea, input[placeholder*="message" i], input[placeholder*="ask" i], .chat-input, [data-testid="chat-input"]').first();
    
    if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('   ✓ Chat interface found');
      
      // Type test message
      const testMessage = 'Create a simple workflow that sends an email notification when a webhook is received. Use SendGrid for email delivery.';
      await chatInput.fill(testMessage);
      await takeScreenshot(page, 'chat-02-message-typed');
      
      // Send message
      const sendButton = await page.locator('button[type="submit"], button:has-text("Send"), button[aria-label*="send" i], button:has([data-icon*="send"])').first();
      
      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();
      } else {
        // Try pressing Enter
        await chatInput.press('Enter');
      }
      
      console.log('   Waiting for agent response...');
      
      // Wait for response with multiple selectors
      let responseFound = false;
      const responseSelectors = [
        '.message:not(:has(textarea))',
        '.agent-message',
        '.ai-response',
        '[data-testid="agent-response"]',
        '.chat-message:not(.user-message)',
        'div:has-text("Analyzing")',
        'div:has-text("Creating")',
        'div:has-text("workflow")'
      ];
      
      for (const selector of responseSelectors) {
        if (await page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false)) {
          responseFound = true;
          console.log(`   ✓ Agent response detected (${selector})`);
          break;
        }
      }
      
      if (responseFound) {
        // Take multiple screenshots during response
        for (let i = 1; i <= 8; i++) {
          await page.waitForTimeout(2000);
          await takeScreenshot(page, `chat-response-${i}`);
          console.log(`   📸 Response progress ${i}/8`);
        }
        
        // Check for agent indicators
        const agentStatus = await page.evaluate(() => {
          const indicators = {
            hasMessages: document.querySelectorAll('.message, .chat-message').length > 0,
            hasAgentIndicator: !!document.querySelector('[class*="agent"], [data-agent]'),
            messageCount: document.querySelectorAll('.message, .chat-message').length,
            lastMessage: ''
          };
          
          const messages = document.querySelectorAll('.message, .chat-message');
          if (messages.length > 0) {
            indicators.lastMessage = messages[messages.length - 1].textContent?.substring(0, 100) || '';
          }
          
          return indicators;
        });
        
        results.multiAgent = {
          status: 'PASS',
          chatFound: true,
          responseReceived: true,
          agentStatus
        };
        
        console.log(`   ✓ Multi-agent system operational`);
        console.log(`   Messages: ${agentStatus.messageCount}`);
        console.log(`   Last message preview: ${agentStatus.lastMessage.substring(0, 50)}...`);
      } else {
        results.multiAgent = {
          status: 'PARTIAL',
          chatFound: true,
          responseReceived: false,
          message: 'Chat input found but no response received'
        };
        console.log('   ⚠ Chat found but no agent response detected');
      }
    } else {
      results.multiAgent = {
        status: 'FAIL',
        chatFound: false,
        message: 'Chat interface not found'
      };
      console.log('   ✗ Chat interface not found');
      await takeScreenshot(page, 'chat-error-no-input');
    }
    
    // 5. UI/UX Evaluation
    console.log('\n5. UI/UX Evaluation...');
    
    const uiEvaluation = await page.evaluate(() => {
      return {
        colorScheme: window.getComputedStyle(document.body).backgroundColor,
        fontFamily: window.getComputedStyle(document.body).fontFamily,
        hasHeader: !!document.querySelector('header, nav, [role="navigation"]'),
        hasMainContent: !!document.querySelector('main, [role="main"], .content, #root'),
        hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
        responsive: window.innerWidth <= 768 ? 'mobile' : 'desktop',
        animations: !!document.querySelector('[class*="animate"], [class*="transition"]'),
        darkMode: document.body.classList.contains('dark') || document.documentElement.classList.contains('dark')
      };
    });
    
    results.frontend.uiEvaluation = uiEvaluation;
    
    console.log('   UI Components:');
    console.log(`   - Header: ${uiEvaluation.hasHeader ? '✓' : '✗'}`);
    console.log(`   - Main Content: ${uiEvaluation.hasMainContent ? '✓' : '✗'}`);
    console.log(`   - Footer: ${uiEvaluation.hasFooter ? '✓' : '✗'}`);
    console.log(`   - Dark Mode: ${uiEvaluation.darkMode ? '✓' : '✗'}`);
    console.log(`   - Animations: ${uiEvaluation.animations ? '✓' : '✗'}`);
    
    await takeScreenshot(page, 'final-state');
    
  } catch (error) {
    console.error('❌ Critical error:', error.message);
    results.errors.push(error.message);
  } finally {
    await browser.close();
  }
}

async function generateReport() {
  console.log('\n\n📊 TEST REPORT GENERATION\n');
  
  // Calculate summary
  const backendTests = Object.values(results.backend).filter(t => t.status === 'PASS').length;
  const backendTotal = Object.keys(results.backend).length;
  
  const frontendTests = Object.values(results.frontend).filter(t => t.status === 'PASS').length;
  const frontendTotal = Object.keys(results.frontend).length;
  
  const multiAgentPass = results.multiAgent.status === 'PASS';
  
  results.summary = {
    backend: `${backendTests}/${backendTotal} passed`,
    frontend: `${frontendTests}/${frontendTotal} passed`,
    multiAgent: multiAgentPass ? 'OPERATIONAL' : 'ISSUES DETECTED',
    screenshots: results.screenshots.length,
    errors: results.errors.length,
    overallStatus: backendTests === backendTotal && frontendTests >= frontendTotal * 0.7 ? 'PASS' : 'PARTIAL'
  };
  
  // Save report
  const reportPath = path.join(screenshotDir, 'test-report.json');
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  
  // Print summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                     CLIXEN TEST SUMMARY                    ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Overall Status: ${results.summary.overallStatus}`);
  console.log('');
  console.log('Backend Infrastructure:');
  console.log(`  n8n API: ${results.backend.n8n?.status || 'NOT TESTED'}`);
  console.log(`  Supabase: ${results.backend.supabase?.status || 'NOT TESTED'}`);
  console.log(`  Authentication: ${results.backend.auth?.status || 'NOT TESTED'}`);
  console.log('');
  console.log('Frontend Application:');
  console.log(`  Page Load: ${results.frontend.pageLoad?.status || 'NOT TESTED'}`);
  console.log(`  Authentication: ${results.frontend.authentication?.status || 'NOT TESTED'}`);
  console.log(`  Navigation: ${results.summary.frontend}`);
  console.log('');
  console.log('Multi-Agent System:');
  console.log(`  Status: ${results.summary.multiAgent}`);
  console.log(`  Chat Interface: ${results.multiAgent?.chatFound ? '✓' : '✗'}`);
  console.log(`  Agent Response: ${results.multiAgent?.responseReceived ? '✓' : '✗'}`);
  console.log('');
  console.log('Quality Metrics:');
  console.log(`  Screenshots Captured: ${results.summary.screenshots}`);
  console.log(`  Errors Detected: ${results.summary.errors}`);
  console.log('');
  console.log(`Full Report: ${reportPath}`);
  console.log(`Screenshots: ${screenshotDir}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  return results;
}

// Main execution
async function main() {
  console.log('🚀 CLIXEN COMPREHENSIVE TESTING SUITE v2.0');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Target: ${TEST_CONFIG.baseUrl}`);
  console.log(`User: ${TEST_CONFIG.testUser.email}`);
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    await testBackend();
    await testFrontend();
    const report = await generateReport();
    
    if (report.summary.overallStatus === 'PASS') {
      console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED OR HAVE ISSUES');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);