/**
 * Production Health Monitoring System
 * Comprehensive health monitoring for production deployment
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { metricsCollector } from '../monitoring/MetricsCollector.js';
import { errorHandler } from '../errors/ErrorHandler.js';
import { cacheManager } from '../cache/CacheManager.js';

export interface HealthCheck {
  name: string;
  description: string;
  critical: boolean;
  timeout: number;
  interval: number;
  check: () => Promise<HealthCheckResult>;
}

export interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
  };
  performance: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    cacheHitRate: number;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
    eventLoop: {
      lag: number;
    };
  };
}

export class HealthMonitor extends EventEmitter {
  private checks: Map<string, HealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private startTime: number = Date.now();
  private isRunning = false;

  constructor() {
    super();
    this.setupDefaultHealthChecks();
  }

  /**
   * Add a health check
   */
  addHealthCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
    
    if (this.isRunning) {
      this.startHealthCheck(check);
    }
  }

  /**
   * Remove a health check
   */
  removeHealthCheck(name: string): void {
    this.checks.delete(name);
    this.results.delete(name);
    
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
    }
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    for (const check of this.checks.values()) {
      this.startHealthCheck(check);
    }
    
    this.emit('started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    
    this.intervals.clear();
    this.emit('stopped');
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const timestamp = Date.now();
    const uptime = (timestamp - this.startTime) / 1000;
    
    // Run all health checks
    const checkPromises = Array.from(this.checks.values()).map(async (check) => {
      try {
        const result = await this.executeHealthCheck(check);
        return { name: check.name, result };
      } catch (error) {
        return {
          name: check.name,
          result: {
            status: 'fail' as const,
            message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            duration: 0,
            timestamp,
            metadata: { error: error instanceof Error ? error.message : String(error) }
          }
        };
      }
    });
    
    const checkResults = await Promise.all(checkPromises);
    const checks: Record<string, HealthCheckResult> = {};
    
    checkResults.forEach(({ name, result }) => {
      checks[name] = result;
      this.results.set(name, result);
    });
    
    // Calculate summary
    const summary = {
      total: checkResults.length,
      passed: checkResults.filter(({ result }) => result.status === 'pass').length,
      failed: checkResults.filter(({ result }) => result.status === 'fail').length,
      warned: checkResults.filter(({ result }) => result.status === 'warn').length
    };
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (summary.failed > 0) {
      const criticalFailed = checkResults.some(({ name, result }) => {
        const check = this.checks.get(name);
        return check?.critical && result.status === 'fail';
      });
      status = criticalFailed ? 'unhealthy' : 'degraded';
    } else if (summary.warned > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    // Get performance metrics
    const performance = await this.getPerformanceMetrics();
    
    // Get resource usage
    const resources = await this.getResourceUsage();
    
    const systemHealth: SystemHealth = {
      status,
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
      performance,
      resources
    };
    
    this.emit('health', systemHealth);
    return systemHealth;
  }

  /**
   * Get health check history
   */
  getHealthHistory(checkName?: string): HealthCheckResult[] {
    if (checkName) {
      const result = this.results.get(checkName);
      return result ? [result] : [];
    }
    
    return Array.from(this.results.values());
  }

  /**
   * Execute a single health check
   */
  private async executeHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = performance.now();
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });
      
      const result = await Promise.race([
        check.check(),
        timeoutPromise
      ]);
      
      const duration = performance.now() - startTime;
      
      return {
        ...result,
        duration,
        timestamp: Date.now()
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        status: 'fail',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
        timestamp: Date.now(),
        metadata: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Start monitoring a specific health check
   */
  private startHealthCheck(check: HealthCheck): void {
    // Run immediately
    this.executeHealthCheck(check).then(result => {
      this.results.set(check.name, result);
      this.emit('checkResult', check.name, result);
    });
    
    // Schedule periodic execution
    const interval = setInterval(async () => {
      try {
        const result = await this.executeHealthCheck(check);
        this.results.set(check.name, result);
        this.emit('checkResult', check.name, result);
        
        // Record metrics
        metricsCollector.incrementCounter('health_checks_total', 1, {
          check: check.name,
          status: result.status
        });
        
        metricsCollector.recordHistogram('health_check_duration_ms', result.duration, {
          check: check.name
        });
        
      } catch (error) {
        console.error(`Health check ${check.name} failed:`, error);
      }
    }, check.interval);
    
    this.intervals.set(check.name, interval);
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<SystemHealth['performance']> {
    const analytics = metricsCollector.getPerformanceAnalytics();
    const summary = metricsCollector.getMetricsSummary();
    
    // Calculate average response time
    const avgResponseTime = Object.values(analytics).reduce((sum, metric: any) => {
      return sum + (metric.avgDuration || 0);
    }, 0) / Math.max(Object.keys(analytics).length, 1);
    
    // Calculate error rate
    const totalOperations = Object.values(analytics).reduce((sum, metric: any) => {
      return sum + (metric.totalCalls || 0);
    }, 0);
    
    const totalErrors = Object.values(analytics).reduce((sum, metric: any) => {
      return sum + ((metric.totalCalls || 0) * (metric.errorRate || 0));
    }, 0);
    
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;
    
    // Calculate throughput (operations per second)
    const throughput = totalOperations / Math.max((Date.now() - this.startTime) / 1000, 1);
    
    // Get cache hit rate
    const cacheStats = cacheManager.getStats();
    const cacheHitRate = cacheStats.hitRate;
    
    return {
      avgResponseTime,
      errorRate,
      throughput,
      cacheHitRate
    };
  }

  /**
   * Get resource usage
   */
  private async getResourceUsage(): Promise<SystemHealth['resources']> {
    const memUsage = process.memoryUsage();
    
    // Calculate event loop lag
    const eventLoopLag = await this.measureEventLoopLag();
    
    return {
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: memUsage.heapUsed / memUsage.heapTotal
      },
      cpu: {
        usage: await this.getCpuUsage()
      },
      eventLoop: {
        lag: eventLoopLag
      }
    };
  }

  /**
   * Measure event loop lag
   */
  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
        resolve(lag);
      });
    });
  }

  /**
   * Get CPU usage (simplified)
   */
  private async getCpuUsage(): Promise<number> {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated method
    const startUsage = process.cpuUsage();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endUsage = process.cpuUsage(startUsage);
    const totalUsage = endUsage.user + endUsage.system;
    
    // Convert to percentage (rough approximation)
    return (totalUsage / 100000) * 100; // Normalize to percentage
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Memory usage check
    this.addHealthCheck({
      name: 'memory',
      description: 'Memory usage monitoring',
      critical: true,
      timeout: 5000,
      interval: 30000,
      check: async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usage = heapUsedMB / heapTotalMB;
        
        if (usage > 0.9) {
          return {
            status: 'fail',
            message: `Critical memory usage: ${heapUsedMB.toFixed(2)}MB (${(usage * 100).toFixed(1)}%)`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { heapUsedMB, heapTotalMB, usage }
          };
        } else if (usage > 0.8) {
          return {
            status: 'warn',
            message: `High memory usage: ${heapUsedMB.toFixed(2)}MB (${(usage * 100).toFixed(1)}%)`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { heapUsedMB, heapTotalMB, usage }
          };
        } else {
          return {
            status: 'pass',
            message: `Memory usage normal: ${heapUsedMB.toFixed(2)}MB (${(usage * 100).toFixed(1)}%)`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { heapUsedMB, heapTotalMB, usage }
          };
        }
      }
    });

    // Event loop lag check
    this.addHealthCheck({
      name: 'event_loop',
      description: 'Event loop lag monitoring',
      critical: false,
      timeout: 5000,
      interval: 15000,
      check: async () => {
        const lag = await this.measureEventLoopLag();
        
        if (lag > 100) {
          return {
            status: 'fail',
            message: `High event loop lag: ${lag.toFixed(2)}ms`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { lag }
          };
        } else if (lag > 50) {
          return {
            status: 'warn',
            message: `Elevated event loop lag: ${lag.toFixed(2)}ms`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { lag }
          };
        } else {
          return {
            status: 'pass',
            message: `Event loop lag normal: ${lag.toFixed(2)}ms`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { lag }
          };
        }
      }
    });

    // Error rate check
    this.addHealthCheck({
      name: 'error_rate',
      description: 'System error rate monitoring',
      critical: false,
      timeout: 5000,
      interval: 60000,
      check: async () => {
        const errorStats = errorHandler.getErrorStatistics();
        const errorRate = errorStats.total > 0 ? 
          (errorStats.total - errorStats.resolved) / errorStats.total : 0;
        
        if (errorRate > 0.1) {
          return {
            status: 'fail',
            message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { errorRate, errorStats }
          };
        } else if (errorRate > 0.05) {
          return {
            status: 'warn',
            message: `Elevated error rate: ${(errorRate * 100).toFixed(1)}%`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { errorRate, errorStats }
          };
        } else {
          return {
            status: 'pass',
            message: `Error rate normal: ${(errorRate * 100).toFixed(1)}%`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { errorRate, errorStats }
          };
        }
      }
    });

    // Cache performance check
    this.addHealthCheck({
      name: 'cache_performance',
      description: 'Cache performance monitoring',
      critical: false,
      timeout: 5000,
      interval: 60000,
      check: async () => {
        const cacheStats = cacheManager.getStats();
        const hitRate = cacheStats.hitRate;
        
        if (hitRate < 0.3) {
          return {
            status: 'warn',
            message: `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { hitRate, cacheStats }
          };
        } else {
          return {
            status: 'pass',
            message: `Cache performance good: ${(hitRate * 100).toFixed(1)}% hit rate`,
            duration: 0,
            timestamp: Date.now(),
            metadata: { hitRate, cacheStats }
          };
        }
      }
    });
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();
