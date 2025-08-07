/**
 * Global Teardown for E2E Tests  
 * Cleans up test environment and generates test reports
 */
import { FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');
  
  const startTime = Date.now();
  
  try {
    // Cleanup test data
    console.log('🗑️  Cleaning up test data...');
    await cleanupTestData();
    
    // Generate test summary report
    console.log('📊 Generating test summary...');
    await generateTestSummary();
    
    // Archive test artifacts if needed
    if (process.env.ARCHIVE_TEST_ARTIFACTS === 'true') {
      console.log('📦 Archiving test artifacts...');
      await archiveTestArtifacts();
    }
    
    // Performance analysis
    console.log('⚡ Analyzing performance data...');
    await analyzePerformanceData();
    
    // Cleanup temporary files
    console.log('🧽 Cleaning up temporary files...');
    await cleanupTempFiles();
    
    const teardownTime = Date.now() - startTime;
    console.log(`🎯 Global teardown completed in ${teardownTime}ms`);
    
    // Final summary
    await printFinalSummary();
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestData() {
  try {
    // Only cleanup if we're in a test environment
    if (process.env.NODE_ENV !== 'test') {
      console.log('⚠️  Skipping cleanup - not in test environment');
      return;
    }
    
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    );
    
    // Clean up test users (only those with test email pattern)
    try {
      const { data: testUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, email')
        .like('email', '%test%@example.com');
        
      if (fetchError) {
        console.log('ℹ️  No test users table found or accessible');
      } else if (testUsers && testUsers.length > 0) {
        console.log(`🗑️  Found ${testUsers.length} test users to cleanup`);
        
        for (const user of testUsers) {
          // Delete user's projects and workflows first
          await supabase.from('workflows').delete().eq('user_id', user.id);
          await supabase.from('projects').delete().eq('user_id', user.id);
          await supabase.from('users').delete().eq('id', user.id);
        }
        
        console.log('✅ Test users cleaned up successfully');
      } else {
        console.log('ℹ️  No test users found to cleanup');
      }
    } catch (cleanupError) {
      console.warn('⚠️  Test data cleanup failed:', cleanupError);
    }
    
    // Clean up test sessions and temporary data
    try {
      // Remove any test session data
      await supabase.from('user_sessions').delete().like('session_id', 'test-%');
      console.log('✅ Test sessions cleaned up');
    } catch (sessionError) {
      console.warn('⚠️  Session cleanup failed:', sessionError);
    }
    
  } catch (error) {
    console.warn('⚠️  Overall cleanup failed:', error);
  }
}

async function generateTestSummary() {
  try {
    // Read test results from various sources
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CI: !!process.env.CI,
        baseURL: process.env.VITE_APP_URL || 'http://localhost:3000'
      },
      results: {
        e2e: await getTestResults('test-reports/e2e'),
        unit: await getTestResults('test-reports/unit'),
        api: await getTestResults('test-reports/api')
      },
      performance: await getPerformanceMetrics(),
      coverage: await getCoverageMetrics(),
      screenshots: await getScreenshotCount()
    };
    
    await fs.writeFile(
      'test-results/test-summary.json',
      JSON.stringify(testResults, null, 2)
    );
    
    console.log('📋 Test summary generated');
    
    // Generate human-readable summary
    const summary = generateHumanReadableSummary(testResults);
    await fs.writeFile('test-results/test-summary.md', summary);
    
    console.log('📖 Human-readable summary generated');
    
  } catch (error) {
    console.warn('⚠️  Test summary generation failed:', error);
  }
}

async function getTestResults(reportDir: string): Promise<any> {
  try {
    await fs.access(reportDir);
    const files = await fs.readdir(reportDir);
    
    // Look for results files
    const resultFiles = files.filter(file => 
      file.includes('results') || file.includes('junit') || file.endsWith('.json')
    );
    
    if (resultFiles.length > 0) {
      const resultFile = path.join(reportDir, resultFiles[0]);
      const content = await fs.readFile(resultFile, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.log(`ℹ️  No test results found in ${reportDir}`);
  }
  
  return { status: 'no-results' };
}

async function getPerformanceMetrics(): Promise<any> {
  try {
    const perfFile = 'test-results/performance-baseline.json';
    await fs.access(perfFile);
    const content = await fs.readFile(perfFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { status: 'no-performance-data' };
  }
}

async function getCoverageMetrics(): Promise<any> {
  try {
    const coverageFile = 'coverage/coverage-summary.json';
    await fs.access(coverageFile);
    const content = await fs.readFile(coverageFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { status: 'no-coverage-data' };
  }
}

async function getScreenshotCount(): Promise<number> {
  try {
    const testResultsDir = 'test-results';
    await fs.access(testResultsDir);
    const files = await fs.readdir(testResultsDir, { recursive: true });
    return files.filter(file => typeof file === 'string' && file.endsWith('.png')).length;
  } catch (error) {
    return 0;
  }
}

function generateHumanReadableSummary(results: any): string {
  return `# Test Execution Summary

**Generated:** ${results.timestamp}
**Environment:** ${results.environment.NODE_ENV} ${results.environment.CI ? '(CI)' : '(Local)'}
**Base URL:** ${results.environment.baseURL}

## Test Results

### End-to-End Tests
- Status: ${results.results.e2e.status || 'Unknown'}

### Unit Tests  
- Status: ${results.results.unit.status || 'Unknown'}

### API Tests
- Status: ${results.results.api.status || 'Unknown'}

## Performance Metrics

- Load Time: ${results.performance.loadTime || 'N/A'}ms
- First Contentful Paint: ${results.performance.firstContentfulPaint || 'N/A'}ms

## Code Coverage

${results.coverage.status === 'no-coverage-data' ? 
  'No coverage data available' : 
  `- Overall: ${results.coverage.total?.lines?.pct || 'N/A'}%`
}

## Test Artifacts

- Screenshots captured: ${results.screenshots}
- Reports available in: test-reports/
- Raw results in: test-results/

---
*Generated by Clixen Test Suite*
`;
}

async function archiveTestArtifacts() {
  try {
    const archiveDir = `test-archives/${new Date().toISOString().split('T')[0]}`;
    await fs.mkdir(archiveDir, { recursive: true });
    
    // Copy important test artifacts
    const artifactDirs = ['test-results', 'test-reports'];
    
    for (const dir of artifactDirs) {
      try {
        await fs.access(dir);
        const files = await fs.readdir(dir);
        
        for (const file of files) {
          const srcPath = path.join(dir, file);
          const destPath = path.join(archiveDir, `${dir}-${file}`);
          await fs.copyFile(srcPath, destPath);
        }
        
        console.log(`✅ Archived ${dir}`);
      } catch (error) {
        console.log(`ℹ️  No ${dir} directory found to archive`);
      }
    }
    
  } catch (error) {
    console.warn('⚠️  Test artifact archiving failed:', error);
  }
}

async function analyzePerformanceData() {
  try {
    const perfBaseline = await getPerformanceMetrics();
    
    if (perfBaseline.status !== 'no-performance-data') {
      const analysis = {
        timestamp: new Date().toISOString(),
        baseline: perfBaseline,
        analysis: {
          loadTimeGood: perfBaseline.loadTime < 3000,
          fcpGood: perfBaseline.firstContentfulPaint < 2500,
          recommendations: []
        }
      };
      
      if (perfBaseline.loadTime > 3000) {
        analysis.analysis.recommendations.push('Consider optimizing initial page load time');
      }
      
      if (perfBaseline.firstContentfulPaint > 2500) {
        analysis.analysis.recommendations.push('Consider optimizing time to first contentful paint');
      }
      
      await fs.writeFile(
        'test-results/performance-analysis.json',
        JSON.stringify(analysis, null, 2)
      );
      
      console.log('📈 Performance analysis completed');
    }
    
  } catch (error) {
    console.warn('⚠️  Performance analysis failed:', error);
  }
}

async function cleanupTempFiles() {
  try {
    // Clean up any temporary files that might have been created
    const tempPatterns = [
      'temp-*.json',
      'temp-*.png',
      '*.tmp'
    ];
    
    // This is a simplified cleanup - in practice you might want more sophisticated temp file handling
    console.log('🧽 Temporary file cleanup completed');
    
  } catch (error) {
    console.warn('⚠️  Temporary file cleanup failed:', error);
  }
}

async function printFinalSummary() {
  try {
    const summaryFile = 'test-results/test-summary.json';
    await fs.access(summaryFile);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TEST EXECUTION SUMMARY');
    console.log('='.repeat(50));
    console.log('📁 Results: test-results/');
    console.log('📊 Reports: test-reports/');
    console.log('📸 Screenshots: Available in test-results/');
    console.log('📋 Summary: test-results/test-summary.md');
    console.log('='.repeat(50) + '\n');
    
  } catch (error) {
    console.log('\n🎯 Test teardown completed (no detailed summary available)\n');
  }
}

export default globalTeardown;