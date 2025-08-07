// Performance optimization utilities for the multi-agent system
import { AgentMessage, ExecutionStep } from './types';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  size: number;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  throughput: number;
  cacheHitRate: number;
  memoryUsage: number;
  activeOperations: number;
  queuedOperations: number;
}

export class PerformanceOptimizer {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private operationQueue: Map<string, Promise<any>> = new Map();
  private metrics: PerformanceMetrics;
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB
  private readonly maxCacheAge = 5 * 60 * 1000; // 5 minutes
  private currentCacheSize = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private responseTimeSamples: number[] = [];
  private readonly maxSamples = 100;

  constructor() {
    this.metrics = {
      avgResponseTime: 0,
      throughput: 0,
      cacheHitRate: 0,
      memoryUsage: 0,
      activeOperations: 0,
      queuedOperations: 0
    };

    // Start cleanup interval
    this.startCleanupInterval();
    this.startMetricsCollection();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupCache();
      this.cleanupOperationQueue();
    }, 60000); // Every minute
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Every 5 seconds
  }

  // Memoization decorator for expensive operations
  public memoize<T>(
    key: string,
    operation: () => Promise<T>,
    ttl: number = this.maxCacheAge
  ): Promise<T> {
    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      this.cacheHits++;
      return Promise.resolve(cached);
    }

    this.cacheMisses++;

    // Check if operation is already in progress
    const inProgress = this.operationQueue.get(key);
    if (inProgress) {
      return inProgress as Promise<T>;
    }

    // Execute operation and queue it
    const promise = this.executeWithMetrics(operation, key);
    this.operationQueue.set(key, promise);

    // Cache the result
    promise.then(result => {
      this.addToCache(key, result, ttl);
      this.operationQueue.delete(key);
    }).catch(() => {
      this.operationQueue.delete(key);
    });

    return promise;
  }

  private async executeWithMetrics<T>(
    operation: () => Promise<T>,
    operationId: string
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.activeOperations++;

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.recordResponseTime(duration);
      return result;
    } finally {
      this.metrics.activeOperations--;
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.maxCacheAge) {
      this.removeFromCache(key);
      return null;
    }

    entry.hits++;
    return entry.value as T;
  }

  private addToCache<T>(key: string, value: T, ttl: number): void {
    const size = this.estimateSize(value);
    
    // Check if we need to make room
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      hits: 0,
      size
    };

    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.removeFromCache(key);
    }

    this.cache.set(key, entry);
    this.currentCacheSize += size;
  }

  private removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    // Find least recently used item
    for (const [key, entry] of this.cache.entries()) {
      const score = entry.timestamp + (entry.hits * 1000); // Factor in hits
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.removeFromCache(lruKey);
    }
  }

  private estimateSize(obj: any): number {
    // Simple size estimation
    const str = JSON.stringify(obj);
    return str.length * 2; // Assuming 2 bytes per character
  }

  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxCacheAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.removeFromCache(key));
  }

  private cleanupOperationQueue(): void {
    // Remove completed operations from queue
    const keysToDelete: string[] = [];

    for (const [key, promise] of this.operationQueue.entries()) {
      // Check if promise is settled
      Promise.race([promise, Promise.resolve('__check__')])
        .then(result => {
          if (result !== '__check__') {
            keysToDelete.push(key);
          }
        });
    }

    keysToDelete.forEach(key => this.operationQueue.delete(key));
  }

  private recordResponseTime(duration: number): void {
    this.responseTimeSamples.push(duration);
    
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }
  }

  private updateMetrics(): void {
    // Calculate average response time
    if (this.responseTimeSamples.length > 0) {
      const sum = this.responseTimeSamples.reduce((a, b) => a + b, 0);
      this.metrics.avgResponseTime = sum / this.responseTimeSamples.length;
    }

    // Calculate cache hit rate
    const totalRequests = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) : 0;

    // Update memory usage
    this.metrics.memoryUsage = this.currentCacheSize;

    // Update queue size
    this.metrics.queuedOperations = this.operationQueue.size;

    // Calculate throughput (operations per second)
    this.metrics.throughput = this.responseTimeSamples.length / (this.maxSamples * 5); // 5 second intervals
  }

  // Batch processing for multiple operations
  public async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => processor(item))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  // Debounce function for reducing API calls
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function for rate limiting
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Lazy loading for heavy resources
  public lazyLoad<T>(
    loader: () => Promise<T>,
    key: string
  ): () => Promise<T> {
    let resource: T | null = null;
    let loading: Promise<T> | null = null;

    return async () => {
      if (resource !== null) {
        return resource;
      }

      if (loading !== null) {
        return loading;
      }

      loading = this.memoize(key, async () => {
        resource = await loader();
        return resource;
      });

      return loading;
    };
  }

  // Priority queue for agent tasks
  public createPriorityQueue<T>() {
    return new PriorityQueue<T>();
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      sizeBytes: this.currentCacheSize,
      hitRate: this.metrics.cacheHitRate,
      hits: this.cacheHits,
      misses: this.cacheMisses
    };
  }
}

// Priority Queue implementation for task scheduling
class PriorityQueue<T> {
  private items: Array<{ element: T; priority: number }> = [];

  enqueue(element: T, priority: number): void {
    const queueElement = { element, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items.shift()!.element;
  }

  front(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[0].element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();