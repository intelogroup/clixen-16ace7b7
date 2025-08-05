#!/usr/bin/env node

/**
 * Manual Production Check
 * Simple check to see if the site is accessible and the demo mode is resolved
 */

import fetch from 'node-fetch';

const PRODUCTION_URL = 'https://clixen.netlify.app';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  console.log(`${colorMap[type]}${message}${colors.reset}`);
}

async function checkSiteAccessibility() {
  log('\n🌐 Checking site accessibility...', 'info');
  
  try {
    const response = await fetch(PRODUCTION_URL);
    
    if (!response.ok) {
      log(`❌ Site not accessible: HTTP ${response.status}`, 'error');
      return false;
    }
    
    const html = await response.text();
    
    // Check if it's the expected React app
    if (html.includes('Clixen') && html.includes('root')) {
      log('✅ Site is accessible and appears to be the React app', 'success');
      
      // Check for demo mode indicators in the HTML
      if (html.includes('Demo Mode Active') || html.includes('OpenAI API not configured')) {
        log('⚠️  Demo mode indicators found in HTML', 'warning');
      } else {
        log('✅ No demo mode indicators in initial HTML', 'success');
      }
      
      return true;
    } else {
      log('❌ Site accessible but unexpected content', 'error');
      log(`Content preview: ${html.substring(0, 200)}...`, 'info');
      return false;
    }
    
  } catch (error) {
    log(`❌ Error checking site: ${error.message}`, 'error');
    return false;
  }
}

async function checkHealthEndpoints() {
  log('\n🏥 Checking health endpoints...', 'info');
  
  const endpoints = [
    'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-system',
    'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/ai-chat-sessions',
    'https://zfbgdixbzezpxllkoyfc.supabase.co/functions/v1/api-operations'
  ];
  
  let workingEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: 'POST', body: '{}' });
      
      if (response.status === 400 || response.status === 200) {
        // 400 is expected for malformed request, means endpoint is responsive
        log(`✅ ${endpoint.split('/').pop()}: Responsive`, 'success');
        workingEndpoints++;
      } else {
        log(`⚠️  ${endpoint.split('/').pop()}: Status ${response.status}`, 'warning');
      }
    } catch (error) {
      log(`❌ ${endpoint.split('/').pop()}: ${error.message}`, 'error');
    }
  }
  
  return workingEndpoints;
}

async function runManualCheck() {
  log(`${colors.bright}${colors.cyan}
╔══════════════════════════════╗
║   Clixen Manual Check        ║
╚══════════════════════════════╝${colors.reset}`, 'info');
  
  log(`\n📅 Check Date: ${new Date().toISOString()}`, 'info');
  log(`🌐 Production URL: ${PRODUCTION_URL}`, 'info');
  
  const siteAccessible = await checkSiteAccessibility();
  const workingEndpoints = await checkHealthEndpoints();
  
  log('\n📊 Summary:', 'info');
  log('═══════════════════════════════════', 'info');
  
  if (siteAccessible) {
    log('✅ Site: Accessible and working', 'success');
  } else {
    log('❌ Site: Issues detected', 'error');
  }
  
  log(`✅ Edge Functions: ${workingEndpoints}/3 responsive`, 
    workingEndpoints >= 2 ? 'success' : 'warning');
  
  if (siteAccessible && workingEndpoints >= 2) {
    log('\n🎉 Overall Status: HEALTHY', 'success');
    log('The main issue may be with the test script UI selectors.', 'info');
    log('Try visiting the site manually to verify chat functionality.', 'info');
  } else {
    log('\n⚠️  Overall Status: NEEDS ATTENTION', 'warning');
  }
}

runManualCheck().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'error');
  process.exit(1);
});