// Redis-like rate limiting system with production-ready features
// In production, replace with actual Redis implementation

interface RateLimitRule {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests allowed in window
  keyPrefix: string;    // Redis key prefix for organization
  skipSuccessfulRequests?: boolean; // Only count failed requests
  skipFailedRequests?: boolean;     // Only count successful requests
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  retryAfter?: number; // Seconds until next request allowed
}

interface RequestRecord {
  count: number;
  windowStart: number;
  requests: RequestEntry[];
}

interface RequestEntry {
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private store: Map<string, RequestRecord> = new Map();
  private rules: Map<string, RateLimitRule> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  constructor() {
    // Set up default rules
    this.setupDefaultRules();
    
    // Start cleanup process
    this.startCleanup();
  }

  private setupDefaultRules(): void {
    // API rate limits
    this.setRule('api:general', {
      windowMs: 60000, // 1 minute
      maxRequests: 60,
      keyPrefix: 'api'
    });

    this.setRule('api:openai', {
      windowMs: 60000, // 1 minute  
      maxRequests: 20, // Conservative for OpenAI
      keyPrefix: 'openai'
    });

    this.setRule('api:n8n', {
      windowMs: 60000, // 1 minute
      maxRequests: 100, // n8n is self-hosted
      keyPrefix: 'n8n'
    });

    // User-specific limits
    this.setRule('user:requests', {
      windowMs: 60000, // 1 minute
      maxRequests: 10, // Per user per minute
      keyPrefix: 'user'
    });

    this.setRule('user:workflow_creation', {
      windowMs: 300000, // 5 minutes
      maxRequests: 5,   // Max 5 workflows per 5 minutes
      keyPrefix: 'wf'
    });

    // Agent-specific limits
    this.setRule('agent:think', {
      windowMs: 60000, // 1 minute
      maxRequests: 30, // Per agent per minute
      keyPrefix: 'think'
    });

    console.log('✅ [RateLimiter] Default rules configured');
  }

  setRule(name: string, rule: RateLimitRule): void {
    this.rules.set(name, rule);
    console.log(`📋 [RateLimiter] Set rule: ${name} - ${rule.maxRequests}/${rule.windowMs}ms`);
  }

  getRule(name: string): RateLimitRule | undefined {
    return this.rules.get(name);
  }

  async checkLimit(
    ruleName: string, 
    identifier: string, 
    metadata?: Record<string, any>
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      console.warn(`⚠️ [RateLimiter] Rule not found: ${ruleName}`);
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
        totalRequests: 0
      };
    }

    const key = `${rule.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Get or create record
    let record = this.store.get(key);
    if (!record) {
      record = {
        count: 0,
        windowStart: now,
        requests: []
      };
      this.store.set(key, record);
    }

    // Clean up old requests outside the window
    record.requests = record.requests.filter(req => req.timestamp > windowStart);
    record.count = record.requests.length;

    // Update window start if needed
    if (record.requests.length > 0) {
      record.windowStart = Math.max(windowStart, record.requests[0].timestamp);
    } else {
      record.windowStart = now;
    }

    // Check if limit exceeded
    const allowed = record.count < rule.maxRequests;
    const remaining = Math.max(0, rule.maxRequests - record.count);
    const resetTime = record.windowStart + rule.windowMs;
    
    let retryAfter: number | undefined;
    if (!allowed) {
      // Calculate retry after based on oldest request in window
      const oldestRequest = record.requests[0];
      if (oldestRequest) {
        retryAfter = Math.ceil((oldestRequest.timestamp + rule.windowMs - now) / 1000);
      } else {
        retryAfter = Math.ceil(rule.windowMs / 1000);
      }
    }

    return {
      allowed,
      remaining,
      resetTime,
      totalRequests: record.count,
      retryAfter
    };
  }

  async recordRequest(
    ruleName: string,
    identifier: string,
    success = true,
    metadata?: Record<string, any>
  ): Promise<void> {
    const rule = this.rules.get(ruleName);
    if (!rule) return;

    // Apply skip rules
    if (rule.skipSuccessfulRequests && success) return;
    if (rule.skipFailedRequests && !success) return;

    const key = `${rule.keyPrefix}:${identifier}`;
    const now = Date.now();

    let record = this.store.get(key);
    if (!record) {
      record = {
        count: 0,
        windowStart: now,
        requests: []
      };
      this.store.set(key, record);
    }

    // Add new request
    record.requests.push({
      timestamp: now,
      success,
      metadata
    });

    // Clean up old requests
    const windowStart = now - rule.windowMs;
    record.requests = record.requests.filter(req => req.timestamp > windowStart);
    record.count = record.requests.length;
  }

  // Middleware function for Express-like frameworks
  createMiddleware(ruleName: string) {
    return async (identifier: string, metadata?: Record<string, any>) => {
      const result = await this.checkLimit(ruleName, identifier, metadata);
      
      if (!result.allowed) {
        const error = new Error(`Rate limit exceeded for ${ruleName}`);
        (error as any).statusCode = 429;
        (error as any).retryAfter = result.retryAfter;
        (error as any).rateLimitInfo = result;
        throw error;
      }

      return result;
    };
  }

  // Batch operations for high-throughput scenarios
  async checkMultipleLimits(
    checks: Array<{
      ruleName: string;
      identifier: string;
      metadata?: Record<string, any>;
    }>
  ): Promise<RateLimitResult[]> {
    const results = await Promise.all(
      checks.map(check => this.checkLimit(check.ruleName, check.identifier, check.metadata))
    );

    return results;
  }

  async recordMultipleRequests(
    records: Array<{
      ruleName: string;
      identifier: string;
      success?: boolean;
      metadata?: Record<string, any>;
    }>
  ): Promise<void> {
    await Promise.all(
      records.map(record => 
        this.recordRequest(record.ruleName, record.identifier, record.success, record.metadata)
      )
    );
  }

  // Analytics and monitoring
  getStats(ruleName?: string): Record<string, any> {
    const stats: Record<string, any> = {
      totalKeys: this.store.size,
      rules: this.rules.size,
      keys: []
    };

    if (ruleName) {
      const rule = this.rules.get(ruleName);
      if (rule) {
        const relevantKeys = Array.from(this.store.entries())
          .filter(([key]) => key.startsWith(rule.keyPrefix + ':'))
          .map(([key, record]) => ({
            key,
            count: record.count,
            windowStart: record.windowStart,
            requests: record.requests.length
          }));

        stats.rule = {
          name: ruleName,
          config: rule,
          activeKeys: relevantKeys.length,
          totalRequests: relevantKeys.reduce((sum, k) => sum + k.count, 0)
        };
      }
    } else {
      // Get stats for all rules
      for (const [name, rule] of this.rules.entries()) {
        const relevantKeys = Array.from(this.store.entries())
          .filter(([key]) => key.startsWith(rule.keyPrefix + ':'));
        
        stats.keys.push({
          rule: name,
          activeKeys: relevantKeys.length,
          totalRequests: relevantKeys.reduce((sum, [, record]) => sum + record.count, 0)
        });
      }
    }

    return stats;
  }

  // Get active limits for a specific identifier across all rules
  async getAllLimitsForIdentifier(identifier: string): Promise<Array<{
    ruleName: string;
    result: RateLimitResult;
  }>> {
    const results = [];
    
    for (const [ruleName] of this.rules.entries()) {
      const result = await this.checkLimit(ruleName, identifier);
      results.push({ ruleName, result });
    }

    return results;
  }

  // Clear specific keys or all keys
  async clearKey(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clearRule(ruleName: string): Promise<number> {
    const rule = this.rules.get(ruleName);
    if (!rule) return 0;

    let cleared = 0;
    const keysToDelete: string[] = [];
    
    for (const [key] of this.store.entries()) {
      if (key.startsWith(rule.keyPrefix + ':')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      if (this.store.delete(key)) {
        cleared++;
      }
    });

    console.log(`🧹 [RateLimiter] Cleared ${cleared} keys for rule: ${ruleName}`);
    return cleared;
  }

  async clearAll(): Promise<void> {
    const size = this.store.size;
    this.store.clear();
    console.log(`🧹 [RateLimiter] Cleared all ${size} keys`);
  }

  // Cleanup expired records
  private startCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);

    console.log('🧹 [RateLimiter] Cleanup process started');
  }

  private performCleanup(): void {
    const now = Date.now();
    let cleanedKeys = 0;

    for (const [key, record] of this.store.entries()) {
      // Find the rule for this key
      let maxWindowMs = 60000; // Default 1 minute
      for (const [, rule] of this.rules.entries()) {
        if (key.startsWith(rule.keyPrefix + ':')) {
          maxWindowMs = rule.windowMs;
          break;
        }
      }

      // Remove expired requests
      const initialCount = record.requests.length;
      record.requests = record.requests.filter(req => 
        now - req.timestamp < maxWindowMs
      );
      record.count = record.requests.length;

      // Remove empty records
      if (record.requests.length === 0 && now - record.windowStart > maxWindowMs * 2) {
        this.store.delete(key);
        cleanedKeys++;
      }
    }

    if (cleanedKeys > 0) {
      console.log(`🧹 [RateLimiter] Cleaned up ${cleanedKeys} expired keys`);
    }
  }

  // Shutdown cleanup
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
    console.log('🛑 [RateLimiter] Shutdown complete');
  }

  // Export for Redis migration
  exportData(): Array<{key: string, record: RequestRecord}> {
    return Array.from(this.store.entries()).map(([key, record]) => ({ key, record }));
  }

  importData(data: Array<{key: string, record: RequestRecord}>): void {
    this.store.clear();
    data.forEach(({ key, record }) => {
      this.store.set(key, record);
    });
    console.log(`📥 [RateLimiter] Imported ${data.length} records`);
  }
}

// Global singleton instance
export const rateLimiter = RateLimiter.getInstance();

// Helper functions for common use cases
export const checkUserLimit = (userId: string) => 
  rateLimiter.checkLimit('user:requests', userId);

export const checkAPILimit = (service: 'openai' | 'n8n', identifier: string) =>
  rateLimiter.checkLimit(`api:${service}`, identifier);

export const checkWorkflowLimit = (userId: string) =>
  rateLimiter.checkLimit('user:workflow_creation', userId);

export const recordAPIRequest = (service: 'openai' | 'n8n', identifier: string, success: boolean) =>
  rateLimiter.recordRequest(`api:${service}`, identifier, success);

export const recordUserRequest = (userId: string, success: boolean = true) =>
  rateLimiter.recordRequest('user:requests', userId, success);