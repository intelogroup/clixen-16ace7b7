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
