// =====================================================
// Template Cache Management System
// High-performance caching for template discovery results
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface CachedTemplate {
  id: string;
  userIntent: string;
  templateData: any;
  confidence: number;
  source: 'battle-tested' | 'n8n-community' | 'firecrawl';
  keywords: string[];
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastUsed: Date;
}

export interface CacheStats {
  memoryHits: number;
  databaseHits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * Multi-Layer Template Cache System
 * 
 * Layer 1: Memory Cache (fast, temporary)
 * Layer 2: Supabase Database (persistent, shared)
 * Layer 3: File System Cache (for battle-tested templates)
 */
export class TemplateCache {
  private memoryCache: Map<string, CachedTemplate> = new Map();
  private cacheStats: CacheStats = {
    memoryHits: 0,
    databaseHits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0
  };

  // Cache configuration
  private readonly MEMORY_CACHE_SIZE = 100; // Max templates in memory
  private readonly MEMORY_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly DATABASE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BATTLE_TESTED_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupMemoryCache(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Get templates from cache with fallback layers
   */
  async get(userIntent: string, options: {
    maxResults?: number;
    source?: 'battle-tested' | 'n8n-community' | 'all';
    minConfidence?: number;
  } = {}): Promise<CachedTemplate[] | null> {
    this.cacheStats.totalRequests++;
    
    const cacheKey = this.generateCacheKey(userIntent, options);
    console.log(`[TemplateCache] Looking for key: ${cacheKey}`);

    // Layer 1: Memory Cache
    const memoryResult = this.getFromMemory(cacheKey);
    if (memoryResult) {
      this.cacheStats.memoryHits++;
      this.updateCacheStats();
      console.log(`[TemplateCache] Memory hit for: ${userIntent}`);
      return [memoryResult];
    }

    // Layer 2: Database Cache
    const databaseResult = await this.getFromDatabase(cacheKey, options);
    if (databaseResult && databaseResult.length > 0) {
      this.cacheStats.databaseHits++;
      this.updateCacheStats();
      
      // Promote to memory cache
      for (const template of databaseResult) {
        this.setInMemory(cacheKey, template);
      }
      
      console.log(`[TemplateCache] Database hit for: ${userIntent} (${databaseResult.length} templates)`);
      return databaseResult;
    }

    // Layer 3: Battle-tested file system cache (if applicable)
    if (options.source === 'battle-tested' || options.source === 'all') {
      const fileSystemResult = await this.getFromFileSystem(userIntent);
      if (fileSystemResult && fileSystemResult.length > 0) {
        console.log(`[TemplateCache] File system hit for: ${userIntent} (${fileSystemResult.length} templates)`);
        
        // Store in both layers for future access
        await this.setInDatabase(cacheKey, fileSystemResult);
        for (const template of fileSystemResult) {
          this.setInMemory(cacheKey, template);
        }
        
        return fileSystemResult;
      }
    }

    // Cache miss
    this.cacheStats.misses++;
    this.updateCacheStats();
    console.log(`[TemplateCache] Miss for: ${userIntent}`);
    return null;
  }

  /**
   * Store templates in cache with appropriate TTL
   */
  async set(
    userIntent: string, 
    templates: CachedTemplate[], 
    options: {
      source?: 'battle-tested' | 'n8n-community' | 'firecrawl';
      ttl?: number;
    } = {}
  ): Promise<void> {
    if (!templates || templates.length === 0) return;

    const cacheKey = this.generateCacheKey(userIntent, options);
    const ttl = options.ttl || this.getTTLForSource(options.source || 'n8n-community');
    
    console.log(`[TemplateCache] Storing ${templates.length} templates for: ${userIntent}`);

    // Prepare templates with expiration
    const templatesWithExpiry = templates.map(template => ({
      ...template,
      userIntent,
      expiresAt: new Date(Date.now() + ttl),
      lastUsed: new Date(),
      hitCount: template.hitCount || 0
    }));

    // Store in memory cache
    for (const template of templatesWithExpiry) {
      this.setInMemory(cacheKey, template);
    }

    // Store in database cache
    await this.setInDatabase(cacheKey, templatesWithExpiry);
    
    console.log(`[TemplateCache] Cached ${templates.length} templates with ${ttl}ms TTL`);
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(userIntent?: string, source?: string): Promise<void> {
    if (userIntent) {
      const cacheKey = this.generateCacheKey(userIntent, { source });
      
      // Remove from memory
      this.memoryCache.delete(cacheKey);
      
      // Remove from database
      await supabase
        .from('template_cache')
        .delete()
        .eq('cache_key', cacheKey);
        
      console.log(`[TemplateCache] Invalidated cache for: ${userIntent}`);
    } else {
      // Clear all caches
      this.memoryCache.clear();
      await supabase.from('template_cache').delete().neq('id', '');
      console.log(`[TemplateCache] Cleared all caches`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { memorySize: number; estimatedDatabaseSize: number } {
    return {
      ...this.cacheStats,
      memorySize: this.memoryCache.size,
      estimatedDatabaseSize: -1 // Would require database query
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<{ memoryCleared: number; databaseCleared: number }> {
    const now = new Date();
    
    // Cleanup memory cache
    let memoryCleared = 0;
    for (const [key, template] of this.memoryCache.entries()) {
      if (template.expiresAt <= now) {
        this.memoryCache.delete(key);
        memoryCleared++;
      }
    }

    // Cleanup database cache
    const { count: databaseCleared } = await supabase
      .from('template_cache')
      .delete()
      .lt('expires_at', now.toISOString());

    console.log(`[TemplateCache] Cleanup: ${memoryCleared} memory, ${databaseCleared || 0} database`);
    return { memoryCleared, databaseCleared: databaseCleared || 0 };
  }

  // ===== PRIVATE METHODS =====

  private generateCacheKey(userIntent: string, options: any = {}): string {
    const normalized = userIntent.toLowerCase().trim().replace(/\s+/g, ' ');
    const optionsHash = JSON.stringify(options);
    return `template:${Buffer.from(normalized + optionsHash).toString('base64').substring(0, 32)}`;
  }

  private getFromMemory(cacheKey: string): CachedTemplate | null {
    const cached = this.memoryCache.get(cacheKey);
    if (!cached) return null;

    // Check expiration
    if (cached.expiresAt <= new Date()) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    // Update usage stats
    cached.hitCount++;
    cached.lastUsed = new Date();
    
    return cached;
  }

  private setInMemory(cacheKey: string, template: CachedTemplate): void {
    // Check memory limit
    if (this.memoryCache.size >= this.MEMORY_CACHE_SIZE) {
      // Remove oldest entry
      const oldestKey = this.findOldestMemoryEntry();
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(cacheKey, template);
  }

  private async getFromDatabase(cacheKey: string, options: any): Promise<CachedTemplate[] | null> {
    try {
      const { data, error } = await supabase
        .from('template_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('confidence', { ascending: false })
        .limit(options.maxResults || 10);

      if (error) {
        console.warn(`[TemplateCache] Database query error:`, error);
        return null;
      }

      if (!data || data.length === 0) return null;

      // Convert to CachedTemplate format
      const templates = data.map(row => ({
        id: row.template_id,
        userIntent: row.user_intent,
        templateData: row.template_data,
        confidence: row.confidence,
        source: row.source,
        keywords: row.keywords || [],
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
        hitCount: row.hit_count || 0,
        lastUsed: new Date(row.last_used || row.created_at)
      }));

      // Update hit counts
      const templateIds = data.map(row => row.id);
      await supabase
        .from('template_cache')
        .update({ 
          hit_count: supabase.rpc('increment_hit_count'),
          last_used: new Date().toISOString()
        })
        .in('id', templateIds);

      return templates;
    } catch (error) {
      console.warn(`[TemplateCache] Database error:`, error);
      return null;
    }
  }

  private async setInDatabase(cacheKey: string, templates: CachedTemplate[]): Promise<void> {
    try {
      const rows = templates.map(template => ({
        cache_key: cacheKey,
        template_id: template.id,
        user_intent: template.userIntent,
        template_data: template.templateData,
        confidence: template.confidence,
        source: template.source,
        keywords: template.keywords,
        expires_at: template.expiresAt.toISOString(),
        hit_count: template.hitCount,
        last_used: template.lastUsed.toISOString()
      }));

      // Upsert to handle duplicates
      const { error } = await supabase
        .from('template_cache')
        .upsert(rows, { onConflict: 'cache_key,template_id' });

      if (error) {
        console.warn(`[TemplateCache] Database insert error:`, error);
      }
    } catch (error) {
      console.warn(`[TemplateCache] Database error:`, error);
    }
  }

  private async getFromFileSystem(userIntent: string): Promise<CachedTemplate[] | null> {
    // This would read from /backend/n8n-workflows/ directory
    // For now, return null as we'll integrate this with the existing template discovery
    return null;
  }

  private findOldestMemoryEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = new Date();

    for (const [key, template] of this.memoryCache.entries()) {
      if (template.lastUsed < oldestTime) {
        oldestTime = template.lastUsed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private cleanupMemoryCache(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, template] of this.memoryCache.entries()) {
      if (template.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TemplateCache] Cleaned ${cleaned} expired memory entries`);
    }
  }

  private getTTLForSource(source: string): number {
    switch (source) {
      case 'battle-tested': return this.BATTLE_TESTED_TTL;
      case 'n8n-community': return this.DATABASE_TTL;
      case 'firecrawl': return this.MEMORY_TTL;
      default: return this.DATABASE_TTL;
    }
  }

  private updateCacheStats(): void {
    const total = this.cacheStats.totalRequests;
    const hits = this.cacheStats.memoryHits + this.cacheStats.databaseHits;
    this.cacheStats.hitRate = total > 0 ? hits / total : 0;
  }
}

// Export singleton instance
export const templateCache = new TemplateCache();

// Export types for external use
export type { CachedTemplate, CacheStats };