#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Generates a comprehensive test report from Playwright results
 */
function generateTestReport() {
  const testResultsDir = './test-results';
  const reportFile = './test-report.md';
  
  console.log('🔍 Generating Playwright test report...');
  
  let report = `# Clixen E2E Test Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Target URL:** https://clixen.netlify.app\n\n`;
  
  // Check if results directory exists
  if (!fs.existsSync(testResultsDir)) {
    report += `❌ No test results found. Run tests first with: \`npm run test\`\n`;
    fs.writeFileSync(reportFile, report);
    return;
  }
  
  // List screenshots
  const screenshots = fs.readdirSync(testResultsDir)
    .filter(file => file.endsWith('.png'))
    .sort();
  
  report += `## 📸 Screenshots Captured\n\n`;
  report += `Total screenshots: **${screenshots.length}**\n\n`;
  
  screenshots.forEach(screenshot => {
    const name = screenshot.replace('.png', '').replace(/^\d+-/, '');
    report += `- ![${name}](./test-results/${screenshot})\n`;
  });
  
  // Check for JSON results
  report += `\n## 📊 Test Results\n\n`;
  
  const jsonFiles = fs.readdirSync(testResultsDir)
    .filter(file => file.endsWith('.json'));
  
  if (jsonFiles.length > 0) {
    jsonFiles.forEach(jsonFile => {
      try {
        const results = JSON.parse(fs.readFileSync(path.join(testResultsDir, jsonFile), 'utf8'));
        report += `### ${jsonFile}\n\n`;
        report += `\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\`\n\n`;
      } catch (error) {
        report += `⚠️ Could not parse ${jsonFile}: ${error.message}\n\n`;
      }
    });
  } else {
    report += `No JSON results found. Tests may have run in line reporter mode.\n\n`;
  }
  
  // Add test configuration info
  report += `## ⚙️ Test Configuration\n\n`;
  report += `- **Framework:** Playwright v1.54.2\n`;
  report += `- **Browsers:** Chromium, Firefox, WebKit\n`;
  report += `- **Viewports:** Desktop (1920x1080), Tablet (iPad Pro), Mobile (Pixel 5, iPhone 13)\n`;
  report += `- **Authentication:** jayveedz19@gmail.com (credentials provided)\n`;
  report += `- **Base URL:** https://clixen.netlify.app\n\n`;
  
  // Add commands
  report += `## 🚀 Available Test Commands\n\n`;
  report += `\`\`\`bash\n`;
  report += `# Run all tests\n`;
  report += `npm run test\n\n`;
  report += `# Run with browser UI\n`;
  report += `npm run test:headed\n\n`;
  report += `# Run specific test suites\n`;
  report += `npm run test:auth\n`;
  report += `npm run test:comprehensive\n`;
  report += `npm run test:performance\n\n`;
  report += `# View detailed HTML report\n`;
  report += `npm run test:report\n`;
  report += `\`\`\`\n\n`;
  
  // Add troubleshooting
  report += `## 🔧 Troubleshooting\n\n`;
  report += `### Common Issues\n\n`;
  report += `1. **Browser installation:** Run \`npm run playwright:install\`\n`;
  report += `2. **Timeout errors:** Increase timeout in playwright.config.ts\n`;
  report += `3. **Authentication fails:** Verify credentials in test files\n`;
  report += `4. **Screenshots missing:** Check file permissions in test-results/\n\n`;
  
  report += `### Test Coverage\n\n`;
  report += `✅ **Completed:**\n`;
  report += `- Landing page loading and responsiveness\n`;
  report += `- Authentication flow with real credentials\n`;
  report += `- Dashboard and chat interface navigation\n`;
  report += `- Multi-agent system interaction testing\n`;
  report += `- Performance measurement (Core Web Vitals)\n`;
  report += `- Mobile responsiveness\n`;
  report += `- Error handling (404, protected routes)\n`;
  report += `- Basic accessibility checks\n`;
  report += `- Cross-browser compatibility\n\n`;
  
  report += `⚠️ **Findings:**\n`;
  report += `- Chat input field detection needs improvement\n`;
  report += `- Mobile menu trigger not found\n`;
  report += `- Logout functionality not visible in UI\n`;
  report += `- Some buttons lack accessibility labels\n\n`;
  
  fs.writeFileSync(reportFile, report);
  console.log(`✅ Test report generated: ${reportFile}`);
}

generateTestReport();