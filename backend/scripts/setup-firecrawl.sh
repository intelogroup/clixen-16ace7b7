#!/bin/bash

# =====================================================
# Firecrawl Setup Script
# Configures Firecrawl API key across all services
# =====================================================

FIRECRAWL_API_KEY="fc-9d7d39e6d2db4992b7fa703fc4d69081"

echo "🔥 Setting up Firecrawl integration..."

# 1. Set up Supabase Edge Functions secrets
echo "📦 Configuring Supabase Edge Functions..."
echo "Run this command in your Supabase dashboard or CLI:"
echo "supabase secrets set FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY"

# 2. Create .env.local for development
echo "📝 Creating local environment file..."
cat > /root/repo/.env.local << EOL
# Firecrawl Configuration
FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
VITE_FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY
EOL

# 3. Set up n8n credentials JSON
echo "🔧 Creating n8n credentials configuration..."
cat > /root/repo/backend/n8n-credentials/firecrawl-credentials.json << EOL
{
  "name": "Firecrawl API",
  "type": "firecrawlApi",
  "data": {
    "apiKey": "$FIRECRAWL_API_KEY",
    "baseUrl": "https://api.firecrawl.dev"
  }
}
EOL

# 4. Create n8n custom node for Firecrawl
echo "📦 Creating n8n Firecrawl node..."
mkdir -p /root/repo/backend/n8n-nodes/firecrawl

cat > /root/repo/backend/n8n-nodes/firecrawl/Firecrawl.node.ts << 'EOL'
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class Firecrawl implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Firecrawl',
    name: 'firecrawl',
    icon: 'file:firecrawl.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Web scraping and content extraction with Firecrawl',
    defaults: {
      name: 'Firecrawl',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'firecrawlApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Scrape',
            value: 'scrape',
          },
          {
            name: 'Crawl',
            value: 'crawl',
          },
          {
            name: 'Search',
            value: 'search',
          },
        ],
        default: 'scrape',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['scrape'],
          },
        },
        options: [
          {
            name: 'URL',
            value: 'url',
            description: 'Scrape a single URL',
          },
          {
            name: 'Extract',
            value: 'extract',
            description: 'Extract structured data',
          },
        ],
        default: 'url',
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com',
        description: 'URL to scrape',
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'Wait Time',
            name: 'waitTime',
            type: 'number',
            default: 3000,
            description: 'Time to wait for page to load (ms)',
          },
          {
            displayName: 'Only Main Content',
            name: 'onlyMainContent',
            type: 'boolean',
            default: true,
            description: 'Extract only main content',
          },
          {
            displayName: 'Include Screenshot',
            name: 'includeScreenshot',
            type: 'boolean',
            default: false,
            description: 'Include page screenshot',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('firecrawlApi');
    
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;
    
    for (let i = 0; i < items.length; i++) {
      const url = this.getNodeParameter('url', i) as string;
      const additionalFields = this.getNodeParameter('additionalFields', i) as any;
      
      // Make API call to Firecrawl
      const response = await this.helpers.httpRequest({
        method: 'POST',
        url: `https://api.firecrawl.dev/v0/scrape`,
        headers: {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: {
          url,
          pageOptions: {
            waitFor: additionalFields.waitTime || 3000,
            onlyMainContent: additionalFields.onlyMainContent !== false,
            includeScreenshot: additionalFields.includeScreenshot || false,
          },
        },
      });
      
      returnData.push({ json: response });
    }
    
    return [returnData];
  }
}
EOL

# 5. Install Firecrawl MCP for Claude Code
echo "🤖 Setting up Firecrawl MCP for Claude Code..."
echo "Run this command to add Firecrawl MCP to Claude Code:"
echo "claude mcp add firecrawl -e FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY -- npx -y firecrawl-mcp"

echo "✅ Firecrawl setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy Edge Functions: cd backend && supabase functions deploy firecrawl-template-discovery"
echo "2. Set Supabase secrets: supabase secrets set FIRECRAWL_API_KEY=$FIRECRAWL_API_KEY"
echo "3. Import n8n credentials in n8n UI"
echo "4. Add Firecrawl MCP to Claude Code with the command above"