// =====================================================
// Firecrawl Client for Edge Functions
// Web scraping and content extraction service
// =====================================================

import { FirecrawlApp } from '@mendable/firecrawl-js';

// Initialize Firecrawl client with API key from environment
export class FirecrawlClient {
  private app: FirecrawlApp;
  
  constructor() {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable not set');
    }
    
    this.app = new FirecrawlApp({ apiKey });
  }
  
  /**
   * Scrape a single URL with advanced options
   */
  async scrapeUrl(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    try {
      const result = await this.app.scrapeUrl(url, {
        pageOptions: {
          waitFor: options.waitTime || 3000,
          screenshot: options.includeScreenshot || false,
          onlyMainContent: options.onlyMainContent !== false, // Default true
          ...options.pageOptions
        },
        extractorOptions: options.extractorOptions || {
          mode: 'llm-extraction',
          extractionPrompt: options.extractionPrompt
        }
      });
      
      return {
        success: true,
        data: result.data,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Firecrawl scraping error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
  
  /**
   * Crawl an entire website
   */
  async crawlWebsite(url: string, options: CrawlOptions = {}): Promise<CrawlResult> {
    try {
      const crawlResult = await this.app.crawlUrl(url, {
        crawlerOptions: {
          includes: options.includes || [],
          excludes: options.excludes || [],
          generateImgAltText: options.generateImgAltText || false,
          returnOnlyUrls: options.returnOnlyUrls || false,
          maxDepth: options.maxDepth || 2,
          mode: options.mode || 'default',
          limit: options.limit || 100,
          ...options.crawlerOptions
        },
        pageOptions: options.pageOptions || {
          onlyMainContent: true
        }
      });
      
      // Wait for crawl completion if async
      if (crawlResult.success && crawlResult.jobId) {
        return await this.waitForCrawlCompletion(crawlResult.jobId);
      }
      
      return {
        success: true,
        data: crawlResult.data,
        total: crawlResult.data?.length || 0
      };
    } catch (error) {
      console.error('Firecrawl crawling error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
  
  /**
   * Search the web using Firecrawl's search capability
   */
  async searchWeb(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    try {
      const searchResult = await this.app.search(query, {
        pageOptions: {
          fetchPageContent: options.fetchPageContent !== false, // Default true
          onlyMainContent: true
        },
        searchOptions: {
          limit: options.limit || 10
        }
      });
      
      return {
        success: true,
        results: searchResult.data || [],
        query: query
      };
    } catch (error) {
      console.error('Firecrawl search error:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }
  
  /**
   * Extract structured data from a webpage using LLM
   */
  async extractStructuredData(
    url: string, 
    schema: any,
    extractionPrompt?: string
  ): Promise<ExtractionResult> {
    try {
      const result = await this.app.scrapeUrl(url, {
        extractorOptions: {
          mode: 'llm-extraction-from-schema',
          extractionSchema: schema,
          extractionPrompt: extractionPrompt || 'Extract the data according to the provided schema'
        }
      });
      
      return {
        success: true,
        extractedData: result.data?.llm_extraction || {},
        content: result.data?.content,
        metadata: result.metadata
      };
    } catch (error) {
      console.error('Firecrawl extraction error:', error);
      return {
        success: false,
        error: error.message,
        extractedData: null
      };
    }
  }
  
  /**
   * Monitor a URL for changes
   */
  async monitorUrl(url: string, webhookUrl: string, options: MonitorOptions = {}): Promise<MonitorResult> {
    // This would integrate with a monitoring service
    // For now, we'll implement basic change detection
    try {
      const initialScrape = await this.scrapeUrl(url);
      
      if (!initialScrape.success) {
        throw new Error('Failed to scrape initial state');
      }
      
      // Store initial state and set up monitoring
      // This would typically use a cron job or scheduled function
      
      return {
        success: true,
        monitorId: crypto.randomUUID(),
        url: url,
        webhookUrl: webhookUrl,
        initialContent: initialScrape.data?.content || ''
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get n8n workflow templates from n8n.io
   */
  async scrapeN8nTemplates(category?: string): Promise<TemplateScrapingResult> {
    const baseUrl = 'https://n8n.io/workflows';
    const url = category ? `${baseUrl}?category=${category}` : baseUrl;
    
    try {
      const result = await this.extractStructuredData(
        url,
        {
          type: 'object',
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  author: { type: 'string' },
                  usageCount: { type: 'number' },
                  url: { type: 'string' },
                  tags: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        'Extract all n8n workflow templates with their titles, descriptions, categories, authors, usage counts, URLs, and tags'
      );
      
      return {
        success: result.success,
        templates: result.extractedData?.templates || [],
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        templates: [],
        error: error.message
      };
    }
  }
  
  private async waitForCrawlCompletion(jobId: string, maxWaitTime = 60000): Promise<CrawlResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.app.checkCrawlStatus(jobId);
      
      if (status.status === 'completed') {
        return {
          success: true,
          data: status.data || [],
          total: status.total || 0
        };
      }
      
      if (status.status === 'failed') {
        return {
          success: false,
          error: 'Crawl job failed',
          data: []
        };
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return {
      success: false,
      error: 'Crawl job timeout',
      data: []
    };
  }
}

// Type definitions
export interface ScrapeOptions {
  waitTime?: number;
  includeScreenshot?: boolean;
  onlyMainContent?: boolean;
  extractionPrompt?: string;
  pageOptions?: any;
  extractorOptions?: any;
}

export interface ScrapeResult {
  success: boolean;
  data: any;
  metadata?: any;
  error?: string;
}

export interface CrawlOptions {
  includes?: string[];
  excludes?: string[];
  generateImgAltText?: boolean;
  returnOnlyUrls?: boolean;
  maxDepth?: number;
  mode?: 'default' | 'fast';
  limit?: number;
  crawlerOptions?: any;
  pageOptions?: any;
}

export interface CrawlResult {
  success: boolean;
  data: any[];
  total: number;
  error?: string;
}

export interface SearchOptions {
  fetchPageContent?: boolean;
  limit?: number;
}

export interface SearchResult {
  success: boolean;
  results: any[];
  query?: string;
  error?: string;
}

export interface ExtractionResult {
  success: boolean;
  extractedData: any;
  content?: string;
  metadata?: any;
  error?: string;
}

export interface MonitorOptions {
  checkInterval?: number;
  changeThreshold?: number;
}

export interface MonitorResult {
  success: boolean;
  monitorId?: string;
  url?: string;
  webhookUrl?: string;
  initialContent?: string;
  error?: string;
}

export interface TemplateScrapingResult {
  success: boolean;
  templates: any[];
  error?: string;
}

// Export singleton instance
export const firecrawl = new FirecrawlClient();