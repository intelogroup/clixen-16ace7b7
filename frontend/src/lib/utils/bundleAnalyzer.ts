/**
 * Bundle analysis utilities for monitoring application performance
 */

export interface BundleStats {
  totalSize: number;
  chunks: ChunkInfo[];
  loadTime: number;
  compressionRatio: number;
}

export interface ChunkInfo {
  name: string;
  size: number;
  compressed: boolean;
  loadTime?: number;
  isLazy: boolean;
}

class BundleAnalyzer {
  private startTime = performance.now();
  private loadedChunks = new Set<string>();
  private chunkSizes = new Map<string, number>();

  constructor() {
    this.initializeTracking();
  }

  private initializeTracking() {
    // Track initial bundle loading
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        this.analyzeInitialBundle();
      });

      // Track dynamic imports
      this.interceptDynamicImports();
    }
  }

  private analyzeInitialBundle() {
    const loadTime = performance.now() - this.startTime;
    
    // Get performance entries for resources
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const jsResources = resources.filter(resource => 
      resource.name.includes('.js') && !resource.name.includes('node_modules')
    );

    const cssResources = resources.filter(resource => 
      resource.name.includes('.css')
    );

    console.group('📊 Bundle Analysis');
    console.log(`Total load time: ${loadTime.toFixed(2)}ms`);
    console.log(`JavaScript chunks: ${jsResources.length}`);
    console.log(`CSS files: ${cssResources.length}`);
    
    // Analyze each JS chunk
    jsResources.forEach(resource => {
      const chunkName = this.getChunkName(resource.name);
      const size = resource.transferSize || 0;
      
      this.chunkSizes.set(chunkName, size);
      this.loadedChunks.add(chunkName);
      
      console.log(`  ${chunkName}: ${this.formatSize(size)} (${resource.duration.toFixed(2)}ms)`);
    });

    console.groupEnd();

    this.reportToAnalytics({
      loadTime,
      totalChunks: jsResources.length,
      totalSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    });
  }

  private interceptDynamicImports() {
    // Monitor lazy-loaded chunks
    const originalImport = window.import || (() => {});
    
    // This is a conceptual approach - actual implementation would depend on bundler
    if (typeof window !== 'undefined') {
      (window as any).__bundleAnalyzer = this;
    }
  }

  private getChunkName(url: string): string {
    const matches = url.match(/\/assets\/([^-]+)/);
    return matches ? matches[1] : 'unknown';
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  public trackLazyChunk(chunkName: string, loadTime: number, size?: number) {
    this.loadedChunks.add(chunkName);
    
    if (size) {
      this.chunkSizes.set(chunkName, size);
    }

    console.log(`🚀 Lazy loaded: ${chunkName} (${loadTime.toFixed(2)}ms)`);
    
    this.reportToAnalytics({
      event: 'lazy_chunk_loaded',
      chunkName,
      loadTime
    });
  }

  public getBundleStats(): BundleStats {
    let totalSize = 0;
    const chunks: ChunkInfo[] = [];

    this.chunkSizes.forEach((size, name) => {
      totalSize += size;
      chunks.push({
        name,
        size,
        compressed: true, // Assuming gzip compression
        isLazy: !['vendor', 'main'].includes(name)
      });
    });

    return {
      totalSize,
      chunks: chunks.sort((a, b) => b.size - a.size),
      loadTime: performance.now() - this.startTime,
      compressionRatio: 0.7 // Estimated compression ratio
    };
  }

  public generateReport(): string {
    const stats = this.getBundleStats();
    
    let report = `Bundle Analysis Report\n`;
    report += `======================\n\n`;
    report += `Total bundle size: ${this.formatSize(stats.totalSize)}\n`;
    report += `Load time: ${stats.loadTime.toFixed(2)}ms\n`;
    report += `Number of chunks: ${stats.chunks.length}\n\n`;
    
    report += `Chunk breakdown:\n`;
    stats.chunks.forEach(chunk => {
      const lazy = chunk.isLazy ? ' (lazy)' : '';
      report += `  ${chunk.name}: ${this.formatSize(chunk.size)}${lazy}\n`;
    });

    return report;
  }

  private reportToAnalytics(data: any) {
    // Send performance data to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example integration with analytics
      try {
        // analytics.track('bundle_performance', data);
        console.debug('Bundle performance data:', data);
      } catch (error) {
        console.warn('Failed to report bundle analytics:', error);
      }
    }
  }

  // Performance recommendations
  public getRecommendations(): string[] {
    const stats = this.getBundleStats();
    const recommendations: string[] = [];

    // Check for large chunks
    const largeChunks = stats.chunks.filter(chunk => chunk.size > 500 * 1024); // > 500KB
    if (largeChunks.length > 0) {
      recommendations.push(`Consider splitting large chunks: ${largeChunks.map(c => c.name).join(', ')}`);
    }

    // Check total bundle size
    if (stats.totalSize > 1024 * 1024) { // > 1MB
      recommendations.push('Total bundle size is quite large, consider lazy loading more components');
    }

    // Check load time
    if (stats.loadTime > 3000) { // > 3 seconds
      recommendations.push('Load time is slow, consider optimizing critical path');
    }

    return recommendations;
  }
}

// Singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Development helper
if (process.env.NODE_ENV === 'development') {
  (window as any).bundleAnalyzer = bundleAnalyzer;
}

export default bundleAnalyzer;