// =====================================================
// Smart Scraper Engine with Luxury Fallbacks
// Never fail, always deliver with multiple redundant scrapers
// =====================================================

import { FirecrawlClient } from './firecrawl-client.ts';

export interface ScraperConfig {
  name: string;
  priority: number;
  available: boolean;
  costPerRequest: number;
  rateLimit: number;
  lastUsed?: Date;
  successRate: number;
  avgResponseTime: number;
}

export interface ScrapeOptions {
  extractionSchema?: any;
  includeScreenshot?: boolean;
  waitTime?: number;
  onlyMainContent?: boolean;
  format?: 'markdown' | 'html' | 'json';
  maxRetries?: number;
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
  proxy?: string;
}

export interface ScrapeResult {
  success: boolean;
  data: any;
  content?: string;
  markdown?: string;
  screenshot?: string;
  metadata?: any;
  scraperUsed: string;
  fallbacksAttempted: number;
  executionTime: number;
  cost: number;
  fromCache?: boolean;
  stale?: boolean;
  errors?: ScraperError[];
}

export interface ScraperError {
  scraper: string;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

export class SmartScraperEngine {
  private firecrawl: FirecrawlClient;
  private cache: Map<string, CachedResult> = new Map();
  
  // Scraper configuration with real-time availability tracking
  private scrapers: ScraperConfig[] = [
    {
      name: 'firecrawl',
      priority: 1,
      available: true,
      costPerRequest: 0.01,
      rateLimit: 1000,
      successRate: 0.95,
      avgResponseTime: 1500
    },
    {
      name: 'playwright',
      priority: 2,
      available: true,
      costPerRequest: 0.005,
      rateLimit: 100,
      successRate: 0.92,
      avgResponseTime: 3000
    },
    {
      name: 'puppeteer',
      priority: 3,
      available: true,
      costPerRequest: 0.003,
      rateLimit: 100,
      successRate: 0.90,
      avgResponseTime: 2500
    },
    {
      name: 'scrapeninja',
      priority: 4,
      available: true,
      costPerRequest: 0.008,
      rateLimit: 500,
      successRate: 0.88,
      avgResponseTime: 2000
    },
    {
      name: 'browserless',
      priority: 5,
      available: true,
      costPerRequest: 0.015,
      rateLimit: 200,
      successRate: 0.93,
      avgResponseTime: 2800
    },
    {
      name: 'cheerio',
      priority: 6,
      available: true,
      costPerRequest: 0.001,
      rateLimit: 10000,
      successRate: 0.85,
      avgResponseTime: 500
    }
  ];
  
  constructor() {
    this.firecrawl = new FirecrawlClient();
    this.initializeScraperHealth();
  }
  
  /**
   * Main scraping method with intelligent fallback
   */
  async scrapeWithFallback(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const startTime = Date.now();
    const errors: ScraperError[] = [];
    let totalCost = 0;
    
    // Check cache first
    const cachedResult = await this.getCachedResult(url, options);
    if (cachedResult && !this.isCacheExpired(cachedResult)) {
      return {
        ...cachedResult.result,
        fromCache: true,
        executionTime: Date.now() - startTime
      };
    }
    
    // Sort scrapers by performance score
    const availableScrapers = this.getOptimalScraperOrder(url, options);
    
    // Try each scraper in order
    for (const scraper of availableScrapers) {
      if (!scraper.available) continue;
      
      try {
        console.log(`[SmartScraper] Attempting scrape with ${scraper.name}...`);
        
        const result = await this.executeScraper(scraper.name, url, options);
        totalCost += scraper.costPerRequest;
        
        if (result.success && this.validateResult(result, url)) {
          // Update scraper metrics
          await this.updateScraperMetrics(scraper.name, true, Date.now() - startTime);
          
          // Cache successful result
          await this.cacheResult(url, options, result);
          
          return {
            ...result,
            scraperUsed: scraper.name,
            fallbacksAttempted: errors.length,
            executionTime: Date.now() - startTime,
            cost: totalCost
          };
        } else {
          throw new Error('Invalid result from scraper');
        }
      } catch (error) {
        console.error(`[SmartScraper] ${scraper.name} failed:`, error.message);
        
        errors.push({
          scraper: scraper.name,
          error: error.message,
          timestamp: new Date(),
          recoverable: this.isRecoverableError(error)
        });
        
        // Update scraper metrics
        await this.updateScraperMetrics(scraper.name, false, Date.now() - startTime);
        
        // Handle rate limiting
        if (this.isRateLimitError(error)) {
          await this.handleRateLimit(scraper);
        }
      }
    }
    
    // All scrapers failed - try stale cache
    if (cachedResult) {
      console.log('[SmartScraper] Using stale cache after all scrapers failed');
      return {
        ...cachedResult.result,
        fromCache: true,
        stale: true,
        staleSince: new Date(cachedResult.expiry),
        errors: errors,
        executionTime: Date.now() - startTime,
        cost: totalCost
      };
    }
    
    // Complete failure
    throw new ScrapingFailureError(
      `All ${errors.length} scrapers failed for ${url}`,
      errors
    );
  }
  
  /**
   * Execute parallel scraping for consensus validation
   */
  async scrapeWithConsensus(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const startTime = Date.now();
    const scraperSubset = this.scrapers
      .filter(s => s.available)
      .slice(0, 3); // Use top 3 scrapers
    
    const promises = scraperSubset.map(scraper => 
      this.executeScraper(scraper.name, url, options)
        .then(result => ({ scraper: scraper.name, result }))
        .catch(error => ({ scraper: scraper.name, error }))
    );
    
    const results = await Promise.allSettled(promises);
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value.result)
      .map(r => (r as any).value);
    
    if (successfulResults.length === 0) {
      throw new Error('No scrapers succeeded in consensus scraping');
    }
    
    // Find consensus among results
    const consensusResult = this.findConsensus(successfulResults);
    
    return {
      ...consensusResult,
      scraperUsed: 'consensus',
      fallbacksAttempted: results.length - successfulResults.length,
      executionTime: Date.now() - startTime,
      cost: scraperSubset.reduce((sum, s) => sum + s.costPerRequest, 0)
    };
  }
  
  /**
   * Execute specific scraper
   */
  private async executeScraper(scraperName: string, url: string, options: ScrapeOptions): Promise<any> {
    const timeout = options.timeout || 30000;
    
    const scraperPromise = (async () => {
      switch (scraperName) {
        case 'firecrawl':
          return await this.scrapeWithFirecrawl(url, options);
        case 'playwright':
          return await this.scrapeWithPlaywright(url, options);
        case 'puppeteer':
          return await this.scrapeWithPuppeteer(url, options);
        case 'scrapeninja':
          return await this.scrapeWithScrapeNinja(url, options);
        case 'browserless':
          return await this.scrapeWithBrowserless(url, options);
        case 'cheerio':
          return await this.scrapeWithCheerio(url, options);
        default:
          throw new Error(`Unknown scraper: ${scraperName}`);
      }
    })();
    
    // Add timeout
    return Promise.race([
      scraperPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Scraper timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }
  
  /**
   * Firecrawl implementation
   */
  private async scrapeWithFirecrawl(url: string, options: ScrapeOptions): Promise<any> {
    const result = await this.firecrawl.scrapeUrl(url, {
      waitTime: options.waitTime,
      includeScreenshot: options.includeScreenshot,
      onlyMainContent: options.onlyMainContent,
      extractionPrompt: options.extractionSchema ? 
        `Extract data according to schema: ${JSON.stringify(options.extractionSchema)}` : 
        undefined
    });
    
    return {
      success: result.success,
      data: result.data,
      content: result.data?.content,
      markdown: result.data?.markdown,
      screenshot: result.data?.screenshot,
      metadata: result.metadata
    };
  }
  
  /**
   * Playwright implementation
   */
  private async scrapeWithPlaywright(url: string, options: ScrapeOptions): Promise<any> {
    // This would call the Playwright service or node
    const response = await fetch(`${Deno.env.get('PLAYWRIGHT_SERVICE_URL')}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        waitTime: options.waitTime || 3000,
        screenshot: options.includeScreenshot,
        userAgent: options.userAgent
      })
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      content: result.html,
      markdown: result.markdown,
      screenshot: result.screenshot
    };
  }
  
  /**
   * Puppeteer implementation
   */
  private async scrapeWithPuppeteer(url: string, options: ScrapeOptions): Promise<any> {
    // This would call the Puppeteer service or node
    const response = await fetch(`${Deno.env.get('PUPPETEER_SERVICE_URL')}/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: {
          waitFor: options.waitTime,
          screenshot: options.includeScreenshot
        }
      })
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      content: result.content,
      screenshot: result.screenshot
    };
  }
  
  /**
   * ScrapeNinja implementation
   */
  private async scrapeWithScrapeNinja(url: string, options: ScrapeOptions): Promise<any> {
    const response = await fetch('https://scrapeninja.p.rapidapi.com/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': Deno.env.get('SCRAPENINJA_API_KEY')!,
        'X-RapidAPI-Host': 'scrapeninja.p.rapidapi.com'
      },
      body: JSON.stringify({
        url,
        waitForSelector: options.waitTime ? `body` : undefined,
        returnFormat: options.format || 'json'
      })
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      content: result.html,
      metadata: result.info
    };
  }
  
  /**
   * Browserless implementation
   */
  private async scrapeWithBrowserless(url: string, options: ScrapeOptions): Promise<any> {
    const response = await fetch(`${Deno.env.get('BROWSERLESS_URL')}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('BROWSERLESS_API_KEY')}`
      },
      body: JSON.stringify({
        url,
        waitFor: options.waitTime || 3000,
        screenshot: options.includeScreenshot
      })
    });
    
    const result = await response.json();
    return {
      success: response.ok,
      data: result,
      content: result.content,
      screenshot: result.screenshot
    };
  }
  
  /**
   * Cheerio implementation (lightweight HTML parsing)
   */
  private async scrapeWithCheerio(url: string, options: ScrapeOptions): Promise<any> {
    // Simple fetch for static content
    const response = await fetch(url, {
      headers: options.headers || {
        'User-Agent': options.userAgent || 'Mozilla/5.0 (compatible; ClixenBot/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic extraction without JavaScript execution
    return {
      success: true,
      data: { html },
      content: html,
      metadata: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    };
  }
  
  /**
   * Validate scraping result
   */
  private validateResult(result: any, url: string): boolean {
    // Check for minimum content
    if (!result.data && !result.content) return false;
    
    const content = result.content || result.data?.html || '';
    
    // Content validation
    if (content.length < 100) return false;
    
    // Check for common error indicators
    const errorIndicators = [
      'Access Denied',
      '403 Forbidden',
      '404 Not Found',
      '429 Too Many Requests',
      'Rate Limit Exceeded',
      'Cloudflare Ray ID',
      'Please enable JavaScript'
    ];
    
    for (const indicator of errorIndicators) {
      if (content.includes(indicator)) {
        console.log(`[Validation] Failed: Found "${indicator}" in content`);
        return false;
      }
    }
    
    // URL-specific validation
    if (url.includes('api.') && !result.data) return false;
    if (url.includes('.json') && typeof result.data !== 'object') return false;
    
    return true;
  }
  
  /**
   * Get optimal scraper order based on site and past performance
   */
  private getOptimalScraperOrder(url: string, options: ScrapeOptions): ScraperConfig[] {
    // Clone scrapers array to avoid modifying original
    const scrapers = [...this.scrapers];
    
    // Adjust priorities based on URL patterns
    if (url.includes('github.com')) {
      // GitHub works well with simple fetching
      this.boostScraperPriority(scrapers, 'cheerio', 2);
    } else if (this.isJavaScriptHeavySite(url)) {
      // JS-heavy sites need browser automation
      this.boostScraperPriority(scrapers, 'playwright', 1);
      this.boostScraperPriority(scrapers, 'puppeteer', 1);
    } else if (url.includes('api.')) {
      // API endpoints work with simple fetching
      this.boostScraperPriority(scrapers, 'cheerio', 3);
    }
    
    // Sort by adjusted priority and success rate
    return scrapers.sort((a, b) => {
      const scoreA = (1 / a.priority) * a.successRate * (1 / a.avgResponseTime);
      const scoreB = (1 / b.priority) * b.successRate * (1 / b.avgResponseTime);
      return scoreB - scoreA;
    });
  }
  
  private boostScraperPriority(scrapers: ScraperConfig[], name: string, boost: number): void {
    const scraper = scrapers.find(s => s.name === name);
    if (scraper) {
      scraper.priority = Math.max(1, scraper.priority - boost);
    }
  }
  
  private isJavaScriptHeavySite(url: string): boolean {
    const jsSites = [
      'twitter.com',
      'facebook.com',
      'instagram.com',
      'linkedin.com',
      'youtube.com',
      'tiktok.com',
      'netflix.com',
      'spotify.com'
    ];
    
    return jsSites.some(site => url.includes(site));
  }
  
  /**
   * Find consensus among multiple scraping results
   */
  private findConsensus(results: any[]): any {
    if (results.length === 1) return results[0].result;
    
    // Compare content lengths
    const contentLengths = results.map(r => 
      (r.result.content || r.result.data?.html || '').length
    );
    
    const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
    
    // Find result closest to average (likely the most accurate)
    let bestResult = results[0];
    let bestDiff = Math.abs(contentLengths[0] - avgLength);
    
    for (let i = 1; i < results.length; i++) {
      const diff = Math.abs(contentLengths[i] - avgLength);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestResult = results[i];
      }
    }
    
    return bestResult.result;
  }
  
  /**
   * Cache management
   */
  private async getCachedResult(url: string, options: ScrapeOptions): Promise<CachedResult | null> {
    const cacheKey = this.generateCacheKey(url, options);
    return this.cache.get(cacheKey) || null;
  }
  
  private async cacheResult(url: string, options: ScrapeOptions, result: any): Promise<void> {
    const cacheKey = this.generateCacheKey(url, options);
    const ttl = this.calculateTTL(url);
    
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
    
    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
  
  private generateCacheKey(url: string, options: ScrapeOptions): string {
    return `${url}:${JSON.stringify(options)}`;
  }
  
  private isCacheExpired(cached: CachedResult): boolean {
    return Date.now() > cached.expiry;
  }
  
  private calculateTTL(url: string): number {
    // Dynamic TTL based on content type
    if (url.includes('news') || url.includes('feed')) return 15 * 60 * 1000; // 15 minutes
    if (url.includes('product') || url.includes('price')) return 60 * 60 * 1000; // 1 hour
    if (url.includes('api.github.com')) return 5 * 60 * 1000; // 5 minutes
    if (url.includes('documentation') || url.includes('docs')) return 24 * 60 * 60 * 1000; // 24 hours
    return 30 * 60 * 1000; // Default 30 minutes
  }
  
  /**
   * Error handling
   */
  private isRateLimitError(error: any): boolean {
    const message = error.message || error.toString();
    return message.includes('429') || 
           message.includes('rate limit') ||
           message.includes('Too Many Requests') ||
           message.includes('quota exceeded');
  }
  
  private isRecoverableError(error: any): boolean {
    const message = error.message || error.toString();
    const recoverablePatterns = [
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
      'socket hang up',
      'network error'
    ];
    
    return recoverablePatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  private async handleRateLimit(scraper: ScraperConfig): Promise<void> {
    console.log(`[RateLimit] Disabling ${scraper.name} for 60 seconds`);
    scraper.available = false;
    
    setTimeout(() => {
      console.log(`[RateLimit] Re-enabling ${scraper.name}`);
      scraper.available = true;
    }, 60000);
  }
  
  /**
   * Metrics and monitoring
   */
  private async updateScraperMetrics(
    scraperName: string, 
    success: boolean, 
    responseTime: number
  ): Promise<void> {
    const scraper = this.scrapers.find(s => s.name === scraperName);
    if (!scraper) return;
    
    // Update success rate (exponential moving average)
    const alpha = 0.1; // Smoothing factor
    scraper.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * scraper.successRate;
    
    // Update average response time
    if (success) {
      scraper.avgResponseTime = alpha * responseTime + (1 - alpha) * scraper.avgResponseTime;
    }
    
    scraper.lastUsed = new Date();
    
    // Log to analytics
    console.log(`[Metrics] ${scraperName}: Success=${success}, Time=${responseTime}ms, Rate=${scraper.successRate.toFixed(2)}`);
  }
  
  private initializeScraperHealth(): void {
    // Periodically check scraper health
    setInterval(() => {
      this.checkScraperHealth();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  private async checkScraperHealth(): Promise<void> {
    console.log('[Health] Checking scraper availability...');
    
    for (const scraper of this.scrapers) {
      // Re-enable scrapers that were temporarily disabled
      if (!scraper.available && scraper.lastUsed) {
        const timeSinceLastUse = Date.now() - scraper.lastUsed.getTime();
        if (timeSinceLastUse > 5 * 60 * 1000) {
          scraper.available = true;
          console.log(`[Health] Re-enabled ${scraper.name} after cooldown`);
        }
      }
      
      // Adjust priority based on recent performance
      if (scraper.successRate < 0.5) {
        scraper.priority = Math.min(10, scraper.priority + 1);
        console.log(`[Health] Lowered priority for ${scraper.name} due to poor performance`);
      }
    }
  }
  
  /**
   * Get scraper statistics
   */
  async getScraperStats(): Promise<ScraperConfig[]> {
    return this.scrapers.map(s => ({
      ...s,
      healthScore: this.calculateHealthScore(s)
    }));
  }
  
  private calculateHealthScore(scraper: ScraperConfig): number {
    const weights = {
      successRate: 0.4,
      responseTime: 0.3,
      availability: 0.2,
      cost: 0.1
    };
    
    const scores = {
      successRate: scraper.successRate,
      responseTime: Math.max(0, 1 - (scraper.avgResponseTime / 10000)), // Normalize to 0-1
      availability: scraper.available ? 1 : 0,
      cost: Math.max(0, 1 - (scraper.costPerRequest / 0.02)) // Normalize to 0-1
    };
    
    return Object.entries(weights).reduce((total, [key, weight]) => 
      total + scores[key] * weight, 0
    );
  }
}

// Type definitions
interface CachedResult {
  result: any;
  timestamp: number;
  expiry: number;
}

class ScrapingFailureError extends Error {
  constructor(message: string, public errors: ScraperError[]) {
    super(message);
    this.name = 'ScrapingFailureError';
  }
}

// Export singleton instance
export const smartScraper = new SmartScraperEngine();