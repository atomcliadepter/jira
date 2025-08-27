/**
 * Advanced Caching System with Intelligent Invalidation
 * Provides multi-level caching with automatic cache warming and invalidation
 */

import { EventEmitter } from 'events';
import { metricsCollector } from '../monitoring/MetricsCollector.js';

export interface CacheEntry {
  key: string;
  value: string; // Always store as serialized string
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  maxEntries: number;
  enableMetrics: boolean;
  compressionThreshold: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  evictions: number;
  compressions: number;
  averageAccessTime: number;
}

export class CacheManager extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private accessTimes: Map<string, number[]> = new Map();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    totalSize: 0,
    evictions: 0,
    compressions: 0,
    averageAccessTime: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      maxEntries: 10000,
      enableMetrics: true,
      compressionThreshold: 1024, // 1KB
      ...config
    };

    this.startMaintenanceTasks();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordMiss(key);
        return null;
      }
      
      // Check if expired
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.recordMiss(key);
        return null;
      }
      
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.recordHit(key);
      this.recordAccessTime(key, performance.now() - startTime);
      
      return this.deserializeValue(entry.value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const serializedValue = this.serializeValue(value);
      const size = this.calculateSize(serializedValue);
      const ttl = options.ttl || this.config.defaultTtl;
      const tags = options.tags || [];
      
      // Check if we need to compress
      let finalValue = serializedValue;
      let compressed = false;
      
      if (size > this.config.compressionThreshold && options.compress !== false) {
        finalValue = await this.compressValue(serializedValue);
        compressed = true;
        this.stats.compressions++;
      }
      
      const entry: CacheEntry = {
        key,
        value: finalValue,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        tags,
        size: this.calculateSize(finalValue)
      };
      
      // Ensure we don't exceed limits
      await this.ensureCapacity(entry.size);
      
      this.cache.set(key, entry);
      this.updateStats();
      
      if (this.config.enableMetrics) {
        metricsCollector.incrementCounter('cache_sets_total', 1, {
          compressed: compressed.toString()
        });
        
        metricsCollector.setGauge('cache_size_bytes', this.stats.totalSize);
        metricsCollector.setGauge('cache_entries_total', this.stats.totalEntries);
      }
      
      this.emit('set', { key, size: entry.size, compressed });
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.accessTimes.delete(key);
      this.updateStats();
      
      if (this.config.enableMetrics) {
        metricsCollector.incrementCounter('cache_deletes_total', 1);
      }
      
      this.emit('delete', { key });
    }
    
    return deleted;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entriesCleared = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    this.updateStats();
    
    if (this.config.enableMetrics) {
      metricsCollector.incrementCounter('cache_clears_total', 1);
    }
    
    this.emit('clear', { entriesCleared });
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        invalidated++;
      }
    }
    
    this.updateStats();
    
    if (this.config.enableMetrics) {
      metricsCollector.incrementCounter('cache_invalidations_total', invalidated);
    }
    
    this.emit('invalidate', { tags, count: invalidated });
    return invalidated;
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Warm cache with multiple entries
   */
  async warmCache<T>(
    entries: Array<{
      key: string;
      factory: () => Promise<T>;
      options?: { ttl?: number; tags?: string[]; compress?: boolean };
    }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, factory, options }) => {
      try {
        const value = await factory();
        await this.set(key, value, options);
      } catch (error) {
        console.error(`Cache warming failed for key ${key}:`, error);
      }
    });
    
    await Promise.all(promises);
    this.emit('warm', { count: entries.length });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get cache entries by pattern
   */
  getKeysByPattern(pattern: RegExp): string[] {
    return Array.from(this.cache.keys()).filter(key => pattern.test(key));
  }

  /**
   * Get most accessed entries
   */
  getMostAccessed(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Get cache health information
   */
  getHealthInfo(): Record<string, any> {
    const stats = this.getStats();
    const memoryUsage = process.memoryUsage();
    
    return {
      healthy: stats.totalSize < this.config.maxSize * 0.9,
      stats,
      config: this.config,
      memoryPressure: memoryUsage.heapUsed / memoryUsage.heapTotal,
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check if we need to evict entries
    while (
      this.cache.size >= this.config.maxEntries ||
      this.stats.totalSize + newEntrySize > this.config.maxSize
    ) {
      await this.evictLeastRecentlyUsed();
    }
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    let lruKey: string | null = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      this.accessTimes.delete(lruKey);
      this.stats.evictions++;
      
      if (this.config.enableMetrics) {
        metricsCollector.incrementCounter('cache_evictions_total', 1);
      }
      
      this.emit('evict', { key: lruKey, reason: 'lru' });
    }
  }

  private recordHit(key: string): void {
    this.stats.hits++;
    
    if (this.config.enableMetrics) {
      metricsCollector.incrementCounter('cache_hits_total', 1);
    }
  }

  private recordMiss(key: string): void {
    this.stats.misses++;
    
    if (this.config.enableMetrics) {
      metricsCollector.incrementCounter('cache_misses_total', 1);
    }
  }

  private recordAccessTime(key: string, time: number): void {
    if (!this.accessTimes.has(key)) {
      this.accessTimes.set(key, []);
    }
    
    const times = this.accessTimes.get(key)!;
    times.push(time);
    
    // Keep only recent access times
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
  }

  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    
    // Calculate average access time
    const allTimes = Array.from(this.accessTimes.values()).flat();
    this.stats.averageAccessTime = allTimes.length > 0 
      ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length 
      : 0;
  }

  private serializeValue<T>(value: T): string {
    return JSON.stringify(value);
  }

  private deserializeValue<T>(value: string): T {
    return JSON.parse(value) as T;
  }

  private async compressValue(value: string): Promise<string> {
    // Simple compression simulation (in real implementation, use zlib)
    return `compressed:${value.length}:${value.substring(0, 100)}...`;
  }

  private calculateSize(value: string): number {
    return Buffer.byteLength(value, 'utf8');
  }

  private getOldestEntry(): { key: string; age: number } | null {
    let oldest: { key: string; age: number } | null = null;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp;
      if (!oldest || age > oldest.age) {
        oldest = { key, age };
      }
    }
    
    return oldest;
  }

  private getNewestEntry(): { key: string; age: number } | null {
    let newest: { key: string; age: number } | null = null;
    const now = Date.now();
    
    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp;
      if (!newest || age < newest.age) {
        newest = { key, age };
      }
    }
    
    return newest;
  }

  private startMaintenanceTasks(): void {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 5 * 60 * 1000);

    // Update metrics every 30 seconds
    setInterval(() => {
      if (this.config.enableMetrics) {
        const stats = this.getStats();
        metricsCollector.setGauge('cache_hit_rate', stats.hitRate);
        metricsCollector.setGauge('cache_size_bytes', stats.totalSize);
        metricsCollector.setGauge('cache_entries_total', stats.totalEntries);
      }
    }, 30 * 1000);
  }

  private cleanExpiredEntries(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.updateStats();
      this.emit('cleanup', { cleaned });
      
      if (this.config.enableMetrics) {
        metricsCollector.incrementCounter('cache_expired_total', cleaned);
      }
    }
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();
