// =====================================================
// Firecrawl Template Discovery Edge Function
// Advanced web scraping for n8n templates and workflows
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { FirecrawlClient } from "../_shared/firecrawl-client.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const firecrawl = new FirecrawlClient();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Route: /scrape-templates
    if (pathSegments[0] === 'scrape-templates' && req.method === 'POST') {
      const { source, category, limit } = await req.json();
      
      let templates = [];
      
      switch (source) {
        case 'n8n-official':
          // Scrape n8n.io official templates
          const n8nResult = await firecrawl.scrapeN8nTemplates(category);
          if (n8nResult.success) {
            templates = n8nResult.templates.slice(0, limit || 50);
          }
          break;
          
        case 'langchain':
          // Scrape LangChain templates/examples
          const langchainUrl = 'https://python.langchain.com/docs/templates';
          const langchainResult = await firecrawl.extractStructuredData(
            langchainUrl,
            {
              type: 'object',
              properties: {
                templates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      category: { type: 'string' },
                      githubUrl: { type: 'string' },
                      features: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            },
            'Extract all LangChain templates with names, descriptions, categories, GitHub URLs, and key features'
          );
          
          if (langchainResult.success) {
            templates = langchainResult.extractedData?.templates || [];
          }
          break;
          
        case 'zapier':
          // Scrape Zapier templates for comparison/inspiration
          const zapierUrl = 'https://zapier.com/apps/categories';
          const zapierResult = await firecrawl.extractStructuredData(
            zapierUrl,
            {
              type: 'object',
              properties: {
                workflows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      apps: { type: 'array', items: { type: 'string' } },
                      category: { type: 'string' },
                      popularity: { type: 'number' }
                    }
                  }
                }
              }
            },
            'Extract popular Zapier workflow templates with names, descriptions, connected apps, and categories'
          );
          
          if (zapierResult.success) {
            templates = zapierResult.extractedData?.workflows || [];
          }
          break;
          
        case 'custom-url':
          // Scrape custom URL provided by user
          const { customUrl, schema } = await req.json();
          const customResult = await firecrawl.extractStructuredData(customUrl, schema);
          
          if (customResult.success) {
            templates = [customResult.extractedData];
          }
          break;
      }
      
      // Store scraped templates in database
      if (templates.length > 0) {
        for (const template of templates) {
          await supabase.from('templates').upsert({
            name: template.title || template.name,
            description: template.description,
            source_type: 'firecrawl',
            source_url: template.url || template.githubUrl,
            source_metadata: { 
              scraped_at: new Date().toISOString(),
              source_platform: source,
              original_data: template 
            },
            n8n_workflow: template.workflow || {},
            status: 'pending_review'
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        templates_scraped: templates.length,
        source: source,
        templates: templates
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Route: /monitor-template-sources
    if (pathSegments[0] === 'monitor-sources' && req.method === 'POST') {
      const { urls, webhookUrl } = await req.json();
      
      const monitoringResults = [];
      
      for (const url of urls) {
        const result = await firecrawl.monitorUrl(url, webhookUrl);
        monitoringResults.push({
          url: url,
          monitorId: result.monitorId,
          success: result.success
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        monitors: monitoringResults
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Route: /extract-workflow
    if (pathSegments[0] === 'extract-workflow' && req.method === 'POST') {
      const { url } = await req.json();
      
      // Extract workflow JSON from a webpage
      const result = await firecrawl.extractStructuredData(
        url,
        {
          type: 'object',
          properties: {
            workflow: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                nodes: { type: 'array' },
                connections: { type: 'object' },
                settings: { type: 'object' }
              }
            }
          }
        },
        'Extract the n8n workflow JSON structure including nodes, connections, and settings'
      );
      
      return new Response(JSON.stringify({
        success: result.success,
        workflow: result.extractedData?.workflow,
        metadata: result.metadata
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Route: /search-templates
    if (pathSegments[0] === 'search-templates' && req.method === 'POST') {
      const { query, limit = 10 } = await req.json();
      
      // Search for templates across the web
      const searchResult = await firecrawl.searchWeb(
        `${query} automation workflow template n8n`,
        { limit, fetchPageContent: true }
      );
      
      return new Response(JSON.stringify({
        success: searchResult.success,
        results: searchResult.results,
        query: query
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Route: /analyze-website
    if (pathSegments[0] === 'analyze-website' && req.method === 'POST') {
      const { url, depth = 2 } = await req.json();
      
      // Crawl website to understand structure for automation
      const crawlResult = await firecrawl.crawlWebsite(url, {
        maxDepth: depth,
        limit: 50,
        mode: 'fast'
      });
      
      if (crawlResult.success) {
        // Analyze crawled data for automation opportunities
        const automationOpportunities = analyzeForAutomation(crawlResult.data);
        
        return new Response(JSON.stringify({
          success: true,
          pages_crawled: crawlResult.total,
          automation_opportunities: automationOpportunities,
          site_structure: crawlResult.data.map(page => ({
            url: page.url,
            title: page.title,
            has_forms: page.content?.includes('<form'),
            has_api: page.content?.includes('api.'),
            word_count: page.content?.split(' ').length || 0
          }))
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: crawlResult.error
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid endpoint',
      available_endpoints: [
        'POST /scrape-templates - Scrape templates from various sources',
        'POST /monitor-sources - Monitor template sources for changes',
        'POST /extract-workflow - Extract workflow from URL',
        'POST /search-templates - Search for templates across the web',
        'POST /analyze-website - Analyze website for automation opportunities'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

function analyzeForAutomation(pages: any[]): any[] {
  const opportunities = [];
  
  for (const page of pages) {
    const content = page.content || '';
    
    // Check for forms
    if (content.includes('<form')) {
      opportunities.push({
        type: 'form_automation',
        url: page.url,
        description: 'Form submission can be automated'
      });
    }
    
    // Check for API endpoints
    if (content.match(/api\.|\/api\/|endpoint|REST|GraphQL/i)) {
      opportunities.push({
        type: 'api_integration',
        url: page.url,
        description: 'API endpoints detected for integration'
      });
    }
    
    // Check for data tables
    if (content.includes('<table') || content.includes('data-table')) {
      opportunities.push({
        type: 'data_extraction',
        url: page.url,
        description: 'Structured data tables found for extraction'
      });
    }
    
    // Check for RSS/feeds
    if (content.match(/rss|feed|atom|xml/i)) {
      opportunities.push({
        type: 'content_monitoring',
        url: page.url,
        description: 'RSS/Feed detected for content monitoring'
      });
    }
    
    // Check for authentication
    if (content.match(/login|signin|auth|oauth/i)) {
      opportunities.push({
        type: 'auth_integration',
        url: page.url,
        description: 'Authentication system detected'
      });
    }
  }
  
  return opportunities;
}