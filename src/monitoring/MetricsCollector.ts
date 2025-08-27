/**
 * Advanced Metrics Collection and Observability
 * Provides comprehensive monitoring for the MCP server
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  errorType?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }>;
  uptime: number;
  version: string;
}

export class MetricsCollector extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private healthChecks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }>> = new Map();
  private startTime: number = Date.now();
  private readonly maxMetricsHistory = 1000;
  private readonly maxPerformanceHistory = 500;

  constructor() {
    super();
    this.setupDefaultHealthChecks();
    this.startPeriodicCollection();
  }

  /**
   * Record a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'counter'
    });
  }

  /**
   * Record a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'gauge'
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      labels,
      type: 'histogram'
    });
  }

  /**
   * Time an operation and record performance metrics
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let errorType: string | undefined;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      this.recordPerformanceMetric({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        errorType
      });

      this.recordHistogram(`operation_duration_ms`, duration, {
        operation,
        success: success.toString(),
        ...labels
      });

      this.incrementCounter(`operation_total`, 1, {
        operation,
        success: success.toString(),
        ...labels
      });
    }
  }

  /**
   * Record tool execution metrics
   */
  recordToolExecution(toolName: string, duration: number, success: boolean, errorType?: string): void {
    this.recordPerformanceMetric({
      operation: `tool_execution_${toolName}`,
      duration,
      timestamp: Date.now(),
      success,
      errorType
    });

    this.incrementCounter('tool_executions_total', 1, {
      tool: toolName,
      success: success.toString(),
      error_type: errorType || 'none'
    });

    this.recordHistogram('tool_execution_duration_ms', duration, {
      tool: toolName,
      success: success.toString()
    });
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.incrementCounter('api_requests_total', 1, {
      endpoint,
      method,
      status_code: statusCode.toString()
    });

    this.recordHistogram('api_request_duration_ms', duration, {
      endpoint,
      method,
      status_code: statusCode.toString()
    });
  }

  /**
   * Record memory usage metrics
   */
  recordMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    
    this.setGauge('memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('memory_rss_bytes', memUsage.rss);
    this.setGauge('memory_external_bytes', memUsage.external);
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics(): void {
    this.recordMemoryUsage();
    this.setGauge('uptime_seconds', (Date.now() - this.startTime) / 1000);
    this.setGauge('nodejs_version', parseFloat(process.version.substring(1)));
  }

  /**
   * Add a custom health check
   */
  addHealthCheck(
    name: string,
    check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }>
  ): void {
    this.healthChecks.set(name, check);
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks: Record<string, any> = {};
    
    for (const [name, check] of this.healthChecks) {
      const startTime = performance.now();
      try {
        const result = await check();
        checks[name] = {
          ...result,
          duration: performance.now() - startTime
        };
      } catch (error) {
        checks[name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
          duration: performance.now() - startTime
        };
      }
    }

    const failedChecks = Object.values(checks).filter((check: any) => check.status === 'fail').length;
    const warnChecks = Object.values(checks).filter((check: any) => check.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks > 0) {
      status = 'unhealthy';
    } else if (warnChecks > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      timestamp: Date.now(),
      checks,
      uptime: (Date.now() - this.startTime) / 1000,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, metrics] of this.metrics) {
      const recentMetrics = metrics.slice(-100); // Last 100 metrics
      
      if (recentMetrics.length === 0) continue;
      
      const values = recentMetrics.map(m => m.value);
      const lastMetric = recentMetrics[recentMetrics.length - 1];
      
      summary[name] = {
        type: lastMetric.type,
        current: lastMetric.value,
        count: recentMetrics.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        timestamp: lastMetric.timestamp
      };
    }
    
    return summary;
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): Record<string, any> {
    const analytics: Record<string, any> = {};
    const recentMetrics = this.performanceMetrics.slice(-200);
    
    // Group by operation
    const operationGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.operation]) {
        groups[metric.operation] = [];
      }
      groups[metric.operation].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetric[]>);
    
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const durations = metrics.map(m => m.duration);
      const successCount = metrics.filter(m => m.success).length;
      const errorCount = metrics.length - successCount;
      
      analytics[operation] = {
        totalCalls: metrics.length,
        successRate: successCount / metrics.length,
        errorRate: errorCount / metrics.length,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p50Duration: this.calculatePercentile(durations, 0.5),
        p95Duration: this.calculatePercentile(durations, 0.95),
        p99Duration: this.calculatePercentile(durations, 0.99),
        recentErrors: metrics
          .filter(m => !m.success)
          .slice(-5)
          .map(m => ({ errorType: m.errorType, timestamp: m.timestamp }))
      };
    }
    
    return analytics;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, metrics] of this.metrics) {
      if (metrics.length === 0) continue;
      
      const lastMetric = metrics[metrics.length - 1];
      output += `# HELP ${name} ${lastMetric.type} metric\n`;
      output += `# TYPE ${name} ${lastMetric.type}\n`;
      
      if (lastMetric.labels) {
        const labelStr = Object.entries(lastMetric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        output += `${name}{${labelStr}} ${lastMetric.value}\n`;
      } else {
        output += `${name} ${lastMetric.value}\n`;
      }
    }
    
    return output;
  }

  private recordMetric(metric: Metric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metrics = this.metrics.get(metric.name)!;
    metrics.push(metric);
    
    // Keep only recent metrics
    if (metrics.length > this.maxMetricsHistory) {
      metrics.splice(0, metrics.length - this.maxMetricsHistory);
    }
    
    this.emit('metric', metric);
  }

  private recordPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxPerformanceHistory) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - this.maxPerformanceHistory);
    }
    
    this.emit('performance', metric);
  }

  private setupDefaultHealthChecks(): void {
    // Memory health check
    this.addHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > 500) {
        return { status: 'fail', message: `High memory usage: ${heapUsedMB.toFixed(2)}MB` };
      } else if (heapUsedMB > 200) {
        return { status: 'warn', message: `Elevated memory usage: ${heapUsedMB.toFixed(2)}MB` };
      } else {
        return { status: 'pass', message: `Memory usage normal: ${heapUsedMB.toFixed(2)}MB` };
      }
    });

    // Event loop lag check
    this.addHealthCheck('event_loop', async () => {
      const start = process.hrtime.bigint();
      await new Promise(resolve => setImmediate(resolve));
      const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      
      if (lag > 100) {
        return { status: 'fail', message: `High event loop lag: ${lag.toFixed(2)}ms` };
      } else if (lag > 50) {
        return { status: 'warn', message: `Elevated event loop lag: ${lag.toFixed(2)}ms` };
      } else {
        return { status: 'pass', message: `Event loop lag normal: ${lag.toFixed(2)}ms` };
      }
    });
  }

  private startPeriodicCollection(): void {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.recordSystemMetrics();
    }, 30000);

    // Emit health status every minute
    setInterval(async () => {
      const health = await this.getHealthStatus();
      this.emit('health', health);
    }, 60000);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();
