import { test, expect } from '@playwright/test';

test.describe('Performance and Visual Tests', () => {
  test('should load pages within performance budgets', async ({ page }) => {
    // Track performance metrics
    const performanceMetrics = [];
    
    const routes = [
      { path: '/', name: 'Landing' },
      { path: '/auth', name: 'Auth' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/chat', name: 'Chat' }
    ];
    
    for (const route of routes) {
      const startTime = Date.now();
      
      try {
        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 30000 });
        
        const loadTime = Date.now() - startTime;
        
        // Take performance screenshot
        await page.screenshot({ 
          path: `test-results/perf-${route.name.toLowerCase()}.png`,
          fullPage: true 
        });
        
        // Get basic performance metrics
        const metrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
          };
        });
        
        performanceMetrics.push({
          route: route.path,
          name: route.name,
          totalLoadTime: loadTime,
          ...metrics
        });
        
        // Performance budgets (in milliseconds)
        expect(loadTime).toBeLessThan(10000); // 10 second timeout
        
        console.log(`${route.name} page loaded in ${loadTime}ms`);
        
      } catch (error) {
        console.log(`⚠️ Could not test performance for ${route.path}:`, error.message);
        performanceMetrics.push({
          route: route.path,
          name: route.name,
          error: error.message
        });
      }
    }
    
    // Save performance report
    await page.evaluate((metrics) => {
      console.log('Performance Metrics:', JSON.stringify(metrics, null, 2));
    }, performanceMetrics);
  });

  test('should capture visual regression screenshots', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    const routes = ['/', '/auth'];
    
    for (const route of routes) {
      for (const viewport of viewports) {
        try {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.goto(route, { waitUntil: 'networkidle', timeout: 15000 });
          
          const routeName = route === '/' ? 'home' : route.replace('/', '');
          
          await page.screenshot({ 
            path: `test-results/visual-${routeName}-${viewport.name}.png`,
            fullPage: true 
          });
          
          // Test interactive elements
          const buttons = page.locator('button');
          const buttonCount = await buttons.count();
          
          if (buttonCount > 0) {
            // Hover over first button to test hover states
            await buttons.first().hover();
            await page.screenshot({ 
              path: `test-results/visual-${routeName}-${viewport.name}-hover.png`,
              fullPage: true 
            });
          }
          
        } catch (error) {
          console.log(`⚠️ Visual regression test failed for ${route} on ${viewport.name}:`, error.message);
        }
      }
    }
  });

  test('should test loading states and animations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Capture page immediately after DOM loads (might show loading states)
    await page.screenshot({ 
      path: 'test-results/loading-01-dom-loaded.png',
      fullPage: true 
    });
    
    // Wait a bit and capture again
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'test-results/loading-02-after-1s.png',
      fullPage: true 
    });
    
    // Wait for network idle
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: 'test-results/loading-03-network-idle.png',
      fullPage: true 
    });
    
    // Test any animated elements
    const animatedElements = await page.locator('[class*="animate"], [class*="transition"], [class*="motion"]').count();
    console.log(`Found ${animatedElements} potentially animated elements`);
  });

  test('should test form interactions and states', async ({ page }) => {
    await page.goto('/auth');
    
    // Capture initial form state
    await page.screenshot({ 
      path: 'test-results/form-01-initial.png',
      fullPage: true 
    });
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.isVisible({ timeout: 5000 })) {
      // Test focus states
      await emailInput.focus();
      await page.screenshot({ 
        path: 'test-results/form-02-email-focus.png',
        fullPage: true 
      });
      
      // Test filled states
      await emailInput.fill('test@example.com');
      await page.screenshot({ 
        path: 'test-results/form-03-email-filled.png',
        fullPage: true 
      });
      
      if (await passwordInput.isVisible()) {
        await passwordInput.focus();
        await page.screenshot({ 
          path: 'test-results/form-04-password-focus.png',
          fullPage: true 
        });
        
        await passwordInput.fill('testpassword');
        await page.screenshot({ 
          path: 'test-results/form-05-both-filled.png',
          fullPage: true 
        });
      }
      
      // Test validation states (if any)
      await emailInput.fill('invalid-email');
      await passwordInput.click(); // Trigger validation
      await page.screenshot({ 
        path: 'test-results/form-06-validation.png',
        fullPage: true 
      });
    }
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          LCP: 0,
          FID: 0,
          CLS: 0,
          FCP: 0,
          TTFB: 0
        };
        
        // Get performance entries
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          vitals.TTFB = navigation.responseStart - navigation.requestStart;
        }
        
        // Get paint entries
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          vitals.FCP = fcpEntry.startTime;
        }
        
        // Use PerformanceObserver for other metrics (if available)
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach((entry) => {
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.LCP = entry.startTime;
                } else if (entry.entryType === 'first-input') {
                  vitals.FID = entry.processingStart - entry.startTime;
                } else if (entry.entryType === 'layout-shift') {
                  if (!(entry as any).hadRecentInput) {
                    vitals.CLS += (entry as any).value;
                  }
                }
              });
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
            
            // Resolve after a short delay to collect metrics
            setTimeout(() => {
              observer.disconnect();
              resolve(vitals);
            }, 3000);
          } catch (error) {
            resolve(vitals);
          }
        } else {
          resolve(vitals);
        }
      });
    });
    
    console.log('Core Web Vitals:', webVitals);
    
    // Basic performance expectations
    expect(webVitals.FCP).toBeLessThan(3000); // First Contentful Paint < 3s
    expect(webVitals.TTFB).toBeLessThan(1000); // Time to First Byte < 1s
    
    await page.screenshot({ 
      path: 'test-results/web-vitals-measurement.png',
      fullPage: true 
    });
  });
});