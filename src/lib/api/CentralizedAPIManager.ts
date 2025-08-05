import { supabase } from '../supabase';
import { openAIConfigService } from '../services/OpenAIConfigService\';ConfigService';

export interface APIConfig {
  name: string;
  displayName: string;
  icon?: string;
  endpoint: string;
  authType: 'bearer' | 'api_key' | 'basic';
  rateLimit: {
    requests: number;
    window: 'second' | 'minute' | 'hour';
  };
  quotaTracking: boolean;
}

export interface APIUsageStats {
  totalUsage: number;
  dailyUsage: number;
  quotaRemaining: number | null;
  lastUsed?: string;
}

export interface APICallOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}

// Rate limiter implementation
class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private windowMs: number;

  constructor(limit: number, window: 'second' | 'minute' | 'hour') {
    this.limit = limit;
    this.windowMs = window === 'second' ? 1000 : window === 'minute' ? 60000 : 3600000;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.limit) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    return oldestRequest + this.windowMs;
  }
}

// Centralized API configurations
const API_CONFIGS: Record<string, APIConfig> = {
  whatsapp: {
    name: 'whatsapp',
    displayName: 'WhatsApp Business',
    icon: '💬',
    endpoint: 'https://graph.facebook.com/v17.0',
    authType: 'bearer',
    rateLimit: { requests: 1000, window: 'hour' },
    quotaTracking: true
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    icon: '🤖',
    endpoint: 'https://api.openai.com/v1',
    authType: 'bearer',
    rateLimit: { requests: 60, window: 'minute' },
    quotaTracking: true
  },
  twilio: {
    name: 'twilio',
    displayName: 'Twilio',
    icon: '📱',
    endpoint: 'https://api.twilio.com/2010-04-01',
    authType: 'basic',
    rateLimit: { requests: 100, window: 'minute' },
    quotaTracking: true
  },
  sendgrid: {
    name: 'sendgrid',
    displayName: 'SendGrid',
    icon: '📧',
    endpoint: 'https://api.sendgrid.com/v3',
    authType: 'bearer',
    rateLimit: { requests: 100, window: 'second' },
    quotaTracking: true
  },
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    icon: '💳',
    endpoint: 'https://api.stripe.com/v1',
    authType: 'bearer',
    rateLimit: { requests: 100, window: 'second' },
    quotaTracking: true
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    icon: '💼',
    endpoint: 'https://slack.com/api',
    authType: 'bearer',
    rateLimit: { requests: 50, window: 'minute' },
    quotaTracking: true
  }
};

export class CentralizedAPIManager {
  private static instance: CentralizedAPIManager;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private apiKeys: Map<string, string> = new Map();

  private constructor() {
    // Initialize rate limiters
    for (const [name, config] of Object.entries(API_CONFIGS)) {
      this.rateLimiters.set(
        name,
        new RateLimiter(config.rateLimit.requests, config.rateLimit.window)
      );
    }

    // Load API keys from environment
    this.loadAPIKeys();
  }

  static getInstance(): CentralizedAPIManager {
    if (!CentralizedAPIManager.instance) {
      CentralizedAPIManager.instance = new CentralizedAPIManager();
    }
    return CentralizedAPIManager.instance;
  }

  /**
   * Load API keys from environment variables
   */
  private loadAPIKeys() {
    // WhatsApp
    const whatsappKey = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN;
    if (whatsappKey) this.apiKeys.set('whatsapp', whatsappKey);

    // OpenAI
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (openaiKey) this.apiKeys.set('openai', openaiKey);

    // Twilio
    const twilioSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const twilioAuth = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    if (twilioSid && twilioAuth) {
      this.apiKeys.set('twilio', `${twilioSid}:${twilioAuth}`);
    }

    // SendGrid
    const sendgridKey = import.meta.env.VITE_SENDGRID_API_KEY;
    if (sendgridKey) this.apiKeys.set('sendgrid', sendgridKey);

    // Stripe
    const stripeKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
    if (stripeKey) this.apiKeys.set('stripe', stripeKey);

    // Slack
    const slackKey = import.meta.env.VITE_SLACK_BOT_TOKEN;
    if (slackKey) this.apiKeys.set('slack', slackKey);
  }

  /**
   * Check if API is available
   */
  isAPIAvailable(apiName: string): boolean {
    return this.apiKeys.has(apiName) && API_CONFIGS[apiName] !== undefined;
  }

  /**
   * Get available APIs
   */
  getAvailableAPIs(): APIConfig[] {
    return Object.values(API_CONFIGS).filter(config => 
      this.apiKeys.has(config.name)
    );
  }

  /**
   * Check user quota for an API
   */
  async checkUserQuota(userId: string, apiName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_api_usage', {
          p_user_id: userId,
          p_api_name: apiName
        });

      if (error) {
        console.error('Error checking quota:', error);
        return false;
      }

      // If quota_remaining is null, it means unlimited
      if (data && data.length > 0) {
        const usage = data[0];
        return usage.quota_remaining === null || usage.quota_remaining > 0;
      }

      return true;
    } catch (err) {
      console.error('Error checking user quota:', err);
      return false;
    }
  }

  /**
   * Get user's API usage statistics
   */
  async getUserAPIStats(userId: string, apiName: string): Promise<APIUsageStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_api_usage', {
          p_user_id: userId,
          p_api_name: apiName
        });

      if (error || !data || data.length === 0) {
        return {
          totalUsage: 0,
          dailyUsage: 0,
          quotaRemaining: null
        };
      }

      const usage = data[0];
      return {
        totalUsage: usage.total_usage || 0,
        dailyUsage: usage.daily_usage || 0,
        quotaRemaining: usage.quota_remaining
      };
    } catch (err) {
      console.error('Error getting API stats:', err);
      return {
        totalUsage: 0,
        dailyUsage: 0,
        quotaRemaining: null
      };
    }
  }

  /**
   * Call a centralized API
   */
  async callAPI(
    apiName: string,
    userId: string,
    endpoint: string,
    options: APICallOptions = {}
  ): Promise<any> {
    const config = API_CONFIGS[apiName];
    if (!config) {
      throw new Error(`Unknown API: ${apiName}`);
    }

    const apiKey = this.apiKeys.get(apiName);
    if (!apiKey) {
      throw new Error(`API key not configured for ${apiName}`);
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(apiName);
    if (rateLimiter) {
      const canProceed = await rateLimiter.checkLimit();
      if (!canProceed) {
        const resetTime = rateLimiter.getResetTime();
        const waitTime = Math.ceil((resetTime - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded for ${apiName}. Try again in ${waitTime} seconds.`);
      }
    }

    // Check user quota
    if (config.quotaTracking) {
      const hasQuota = await this.checkUserQuota(userId, apiName);
      if (!hasQuota) {
        throw new Error(`Quota exceeded for ${apiName}. Please upgrade your plan.`);
      }
    }

    // Prepare request
    const url = `${config.endpoint}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add authentication
    switch (config.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'api_key':
        headers['X-API-Key'] = apiKey;
        break;
      case 'basic':
        const [username, password] = apiKey.split(':');
        headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        break;
    }

    // Add query parameters if provided
    let finalUrl = url;
    if (options.params) {
      const params = new URLSearchParams(options.params);
      finalUrl = `${url}?${params.toString()}`;
    }

    try {
      // Make the API call
      const response = await fetch(finalUrl, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Track usage
      if (config.quotaTracking) {
        await this.trackUsage(userId, apiName, endpoint);
      }

      return result;
    } catch (error) {
      console.error(`Error calling ${apiName} API:`, error);
      throw error;
    }
  }

  /**
   * Track API usage
   */
  private async trackUsage(
    userId: string,
    apiName: string,
    endpoint: string,
    tokensUsed?: number
  ): Promise<void> {
    try {
      await supabase
        .from('api_usage')
        .insert({
          user_id: userId,
          api_name: apiName,
          endpoint,
          usage_count: 1,
          tokens_used: tokensUsed || 0,
          metadata: {
            timestamp: new Date().toISOString(),
            endpoint
          }
        });
    } catch (err) {
      console.error('Error tracking API usage:', err);
    }
  }

  /**
   * Estimate cost for API usage
   */
  async estimateCost(apiName: string, usage: number): Promise<number> {
    // This would typically fetch from a pricing table
    const costPerUnit: Record<string, number> = {
      whatsapp: 0.005, // $0.005 per message
      openai: 0.002, // $0.002 per 1K tokens
      twilio: 0.0075, // $0.0075 per SMS
      sendgrid: 0.0001, // $0.0001 per email
      stripe: 0.029, // 2.9% per transaction (simplified)
      slack: 0 // Free for basic usage
    };

    return (costPerUnit[apiName] || 0) * usage;
  }

  /**
   * Get API configuration
   */
  getAPIConfig(apiName: string): APIConfig | undefined {
    return API_CONFIGS[apiName];
  }

  /**
   * Check if user has access to premium APIs
   */
  async checkPremiumAccess(userId: string): Promise<boolean> {
    // This would check user's subscription tier
    // For now, return true for all users
    return true;
  }

  /**
   * WhatsApp specific: Send message
   */
  async sendWhatsAppMessage(
    userId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<any> {
    const phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
    
    const body: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: mediaUrl ? 'image' : 'text'
    };

    if (mediaUrl) {
      body.image = { link: mediaUrl, caption: message };
    } else {
      body.text = { body: message };
    }

    return this.callAPI(
      'whatsapp',
      userId,
      `/${phoneNumberId}/messages`,
      {
        method: 'POST',
        body
      }
    );
  }

  /**
   * OpenAI specific: Create completion
   */
  async createOpenAICompletion(
    userId: string,
    prompt: string,
    model: string = 'gpt-3.5-turbo',
    maxTokens: number = 150
  ): Promise<any> {
    return this.callAPI(
      'openai',
      userId,
      '/chat/completions',
      {
        method: 'POST',
        body: {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens
        }
      }
    );
  }

  /**
   * Twilio specific: Send SMS
   */
  async sendTwilioSMS(
    userId: string,
    to: string,
    body: string,
    from?: string
  ): Promise<any> {
    const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const fromNumber = from || import.meta.env.VITE_TWILIO_PHONE_NUMBER;

    return this.callAPI(
      'twilio',
      userId,
      `/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body
        }).toString()
      }
    );
  }
}

export default CentralizedAPIManager.getInstance();
