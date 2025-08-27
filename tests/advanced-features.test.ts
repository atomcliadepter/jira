/**
 * Advanced Features Test Suite
 * Tests monitoring, error handling, and caching systems
 */

import { MetricsCollector } from '../src/monitoring/MetricsCollector.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../src/errors/ErrorHandler.js';
import { CacheManager } from '../src/cache/CacheManager.js';

describe('Advanced Features Test Suite', () => {

  describe('MetricsCollector', () => {
    let metricsCollector: MetricsCollector;

    beforeEach(() => {
      metricsCollector = new MetricsCollector();
    });

    afterEach(() => {
      metricsCollector.removeAllListeners();
    });

    test('should record counter metrics', () => {
      metricsCollector.incrementCounter('test_counter', 5, { label: 'test' });
      
      const summary = metricsCollector.getMetricsSummary();
      expect(summary['test_counter']).toBeDefined();
      expect(summary['test_counter'].current).toBe(5);
      expect(summary['test_counter'].type).toBe('counter');
    });

    test('should record gauge metrics', () => {
      metricsCollector.setGauge('test_gauge', 42.5, { unit: 'percent' });
      
      const summary = metricsCollector.getMetricsSummary();
      expect(summary['test_gauge']).toBeDefined();
      expect(summary['test_gauge'].current).toBe(42.5);
      expect(summary['test_gauge'].type).toBe('gauge');
    });

    test('should record histogram metrics', () => {
      metricsCollector.recordHistogram('test_histogram', 100);
      metricsCollector.recordHistogram('test_histogram', 200);
      metricsCollector.recordHistogram('test_histogram', 150);
      
      const summary = metricsCollector.getMetricsSummary();
      expect(summary['test_histogram']).toBeDefined();
      expect(summary['test_histogram'].min).toBe(100);
      expect(summary['test_histogram'].max).toBe(200);
      expect(summary['test_histogram'].avg).toBe(150);
    });

    test('should time operations and record performance metrics', async () => {
      const result = await metricsCollector.timeOperation('test_operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
      
      const analytics = metricsCollector.getPerformanceAnalytics();
      expect(analytics['test_operation']).toBeDefined();
      expect(analytics['test_operation'].totalCalls).toBe(1);
      expect(analytics['test_operation'].successRate).toBe(1);
      expect(analytics['test_operation'].avgDuration).toBeGreaterThan(0);
    });

    test('should handle operation failures in timing', async () => {
      try {
        await metricsCollector.timeOperation('failing_operation', async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        expect(error.message).toBe('Test error');
      }

      const analytics = metricsCollector.getPerformanceAnalytics();
      expect(analytics['failing_operation']).toBeDefined();
      expect(analytics['failing_operation'].successRate).toBe(0);
      expect(analytics['failing_operation'].errorRate).toBe(1);
    });

    test('should record tool execution metrics', () => {
      metricsCollector.recordToolExecution('test.tool', 150, true);
      metricsCollector.recordToolExecution('test.tool', 200, false, 'ValidationError');
      
      const analytics = metricsCollector.getPerformanceAnalytics();
      expect(analytics['tool_execution_test.tool']).toBeDefined();
      expect(analytics['tool_execution_test.tool'].totalCalls).toBe(2);
      expect(analytics['tool_execution_test.tool'].successRate).toBe(0.5);
    });

    test('should provide health status', async () => {
      const health = await metricsCollector.getHealthStatus();
      
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.timestamp).toBeGreaterThan(0);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.checks).toBeDefined();
      expect(health.checks.memory).toBeDefined();
      expect(health.checks.event_loop).toBeDefined();
    });

    test('should export Prometheus metrics format', () => {
      metricsCollector.incrementCounter('prometheus_test', 1, { service: 'mcp' });
      
      const prometheusMetrics = metricsCollector.exportPrometheusMetrics();
      expect(prometheusMetrics).toContain('# HELP prometheus_test counter metric');
      expect(prometheusMetrics).toContain('# TYPE prometheus_test counter');
      expect(prometheusMetrics).toContain('prometheus_test{service="mcp"} 1');
    });

    test('should add custom health checks', async () => {
      metricsCollector.addHealthCheck('custom_check', async () => ({
        status: 'pass',
        message: 'Custom check passed'
      }));

      const health = await metricsCollector.getHealthStatus();
      expect(health.checks.custom_check).toBeDefined();
      expect(health.checks.custom_check.status).toBe('pass');
      expect(health.checks.custom_check.message).toBe('Custom check passed');
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = new ErrorHandler();
    });

    afterEach(() => {
      errorHandler.removeAllListeners();
    });

    test('should handle and categorize errors', async () => {
      const error = new Error('Network timeout occurred');
      const context = {
        operation: 'test_operation',
        toolName: 'test.tool',
        timestamp: Date.now()
      };

      const result = await errorHandler.handleError(error, context);
      
      expect(result.recovered).toBeDefined();
      
      const stats = errorHandler.getErrorStatistics();
      expect(stats.total).toBe(1);
      expect(stats.byCategory.network).toBe(1);
    });

    test('should categorize different error types correctly', async () => {
      const errors = [
        { error: new Error('Unauthorized access'), expectedCategory: 'authentication' },
        { error: new Error('Validation failed'), expectedCategory: 'validation' },
        { error: new Error('Rate limit exceeded'), expectedCategory: 'rate_limit' },
        { error: new Error('Permission denied'), expectedCategory: 'permission' },
        { error: new Error('System failure'), expectedCategory: 'system' }
      ];

      for (const { error, expectedCategory } of errors) {
        await errorHandler.handleError(error, {
          operation: 'test',
          timestamp: Date.now()
        });
      }

      const stats = errorHandler.getErrorStatistics();
      expect(stats.total).toBe(5);
      expect(stats.byCategory[expectedCategory]).toBeGreaterThan(0);
    });

    test('should attempt error recovery', async () => {
      const networkError = new Error('Network connection failed');
      const context = {
        operation: 'network_operation',
        timestamp: Date.now()
      };

      const result = await errorHandler.handleError(networkError, context);
      
      // Network errors should attempt recovery
      expect(result.recovered).toBeDefined();
    });

    test('should manage circuit breaker state', async () => {
      const operation = 'test_circuit_breaker';
      
      // Initially should allow operations
      expect(errorHandler.shouldAllowOperation(operation)).toBe(true);
      
      // Record multiple failures
      for (let i = 0; i < 6; i++) {
        await errorHandler.handleError(
          new Error('Service unavailable'),
          { operation, timestamp: Date.now() }
        );
      }
      
      // Circuit breaker should be open now
      const status = errorHandler.getCircuitBreakerStatus();
      expect(status[operation]).toBeDefined();
      expect(status[operation].state).toBe('open');
    });

    test('should record successful operations', () => {
      const operation = 'success_test';
      
      errorHandler.recordSuccess(operation);
      
      const status = errorHandler.getCircuitBreakerStatus();
      expect(status[operation]).toBeDefined();
      expect(status[operation].successCount).toBe(1);
    });

    test('should provide error statistics', async () => {
      await errorHandler.handleError(
        new Error('Test error'),
        { operation: 'stats_test', timestamp: Date.now() },
        ErrorSeverity.HIGH
      );

      const stats = errorHandler.getErrorStatistics();
      expect(stats.total).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.recoveryRate).toBeDefined();
    });

    test('should get recent errors for debugging', async () => {
      await errorHandler.handleError(
        new Error('Debug error'),
        { operation: 'debug_test', timestamp: Date.now() }
      );

      const recentErrors = errorHandler.getRecentErrors(10);
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].error.message).toBe('Debug error');
    });

    test('should add custom recovery strategies', async () => {
      let recoveryAttempted = false;
      
      errorHandler.addRecoveryStrategy({
        name: 'custom_recovery',
        condition: (error) => error.error.message.includes('custom'),
        action: async (error) => {
          recoveryAttempted = true;
          return true;
        },
        maxRetries: 1,
        backoffMs: 0
      });

      await errorHandler.handleError(
        new Error('custom error'),
        { operation: 'custom_test', timestamp: Date.now() }
      );

      expect(recoveryAttempted).toBe(true);
    });
  });

  describe('CacheManager', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
      cacheManager = new CacheManager({
        maxSize: 1024 * 1024, // 1MB
        defaultTtl: 1000, // 1 second for testing
        maxEntries: 100
      });
    });

    afterEach(() => {
      cacheManager.clear();
      cacheManager.removeAllListeners();
    });

    test('should set and get cache values', async () => {
      const testData = { message: 'Hello, Cache!' };
      
      await cacheManager.set('test_key', testData);
      const retrieved = await cacheManager.get('test_key');
      
      expect(retrieved).toEqual(testData);
    });

    test('should handle cache expiration', async () => {
      await cacheManager.set('expiring_key', 'test_value', { ttl: 50 });
      
      // Should exist immediately
      expect(await cacheManager.get('expiring_key')).toBe('test_value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      expect(await cacheManager.get('expiring_key')).toBeNull();
    });

    test('should check if key exists', async () => {
      await cacheManager.set('exists_key', 'value');
      
      expect(cacheManager.has('exists_key')).toBe(true);
      expect(cacheManager.has('nonexistent_key')).toBe(false);
    });

    test('should delete cache entries', async () => {
      await cacheManager.set('delete_key', 'value');
      expect(cacheManager.has('delete_key')).toBe(true);
      
      const deleted = cacheManager.delete('delete_key');
      expect(deleted).toBe(true);
      expect(cacheManager.has('delete_key')).toBe(false);
    });

    test('should clear all cache entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      expect(cacheManager.getStats().totalEntries).toBe(2);
      
      cacheManager.clear();
      
      expect(cacheManager.getStats().totalEntries).toBe(0);
    });

    test('should invalidate by tags', async () => {
      await cacheManager.set('tagged1', 'value1', { tags: ['user', 'profile'] });
      await cacheManager.set('tagged2', 'value2', { tags: ['user', 'settings'] });
      await cacheManager.set('untagged', 'value3');
      
      const invalidated = cacheManager.invalidateByTags(['user']);
      
      expect(invalidated).toBe(2);
      expect(cacheManager.has('tagged1')).toBe(false);
      expect(cacheManager.has('tagged2')).toBe(false);
      expect(cacheManager.has('untagged')).toBe(true);
    });

    test('should implement getOrSet pattern', async () => {
      let factoryCalled = false;
      
      const factory = async () => {
        factoryCalled = true;
        return 'factory_value';
      };
      
      // First call should invoke factory
      const result1 = await cacheManager.getOrSet('factory_key', factory);
      expect(result1).toBe('factory_value');
      expect(factoryCalled).toBe(true);
      
      // Second call should use cache
      factoryCalled = false;
      const result2 = await cacheManager.getOrSet('factory_key', factory);
      expect(result2).toBe('factory_value');
      expect(factoryCalled).toBe(false);
    });

    test('should warm cache with multiple entries', async () => {
      const entries = [
        {
          key: 'warm1',
          factory: async () => 'value1',
          options: { tags: ['warm'] }
        },
        {
          key: 'warm2',
          factory: async () => 'value2',
          options: { tags: ['warm'] }
        }
      ];
      
      await cacheManager.warmCache(entries);
      
      expect(await cacheManager.get('warm1')).toBe('value1');
      expect(await cacheManager.get('warm2')).toBe('value2');
    });

    test('should provide cache statistics', async () => {
      await cacheManager.set('stats_key', 'value');
      await cacheManager.get('stats_key'); // Hit
      await cacheManager.get('nonexistent'); // Miss
      
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.totalEntries).toBe(1);
    });

    test('should find keys by pattern', async () => {
      await cacheManager.set('user:123', 'user1');
      await cacheManager.set('user:456', 'user2');
      await cacheManager.set('post:789', 'post1');
      
      const userKeys = cacheManager.getKeysByPattern(/^user:/);
      
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:123');
      expect(userKeys).toContain('user:456');
    });

    test('should track most accessed entries', async () => {
      await cacheManager.set('popular', 'value');
      await cacheManager.set('unpopular', 'value');
      
      // Access popular key multiple times
      for (let i = 0; i < 5; i++) {
        await cacheManager.get('popular');
      }
      
      await cacheManager.get('unpopular');
      
      const mostAccessed = cacheManager.getMostAccessed(2);
      
      expect(mostAccessed[0].key).toBe('popular');
      expect(mostAccessed[0].accessCount).toBe(5);
      expect(mostAccessed[1].key).toBe('unpopular');
      expect(mostAccessed[1].accessCount).toBe(1);
    });

    test('should provide health information', async () => {
      await cacheManager.set('health_key', 'value');
      
      const health = cacheManager.getHealthInfo();
      
      expect(health.healthy).toBeDefined();
      expect(health.stats).toBeDefined();
      expect(health.config).toBeDefined();
      expect(health.memoryPressure).toBeDefined();
    });

    test('should handle cache capacity limits', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 105; i++) {
        await cacheManager.set(`key_${i}`, `value_${i}`);
      }
      
      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(100); // maxEntries limit
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate metrics with error handling', async () => {
      const metricsCollector = new MetricsCollector();
      const errorHandler = new ErrorHandler();
      
      // Simulate an error that gets handled
      await errorHandler.handleError(
        new Error('Integration test error'),
        {
          operation: 'integration_test',
          timestamp: Date.now()
        }
      );
      
      // Metrics should be recorded
      const summary = metricsCollector.getMetricsSummary();
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });

    test('should integrate caching with metrics', async () => {
      const cacheManager = new CacheManager({ enableMetrics: true });
      const metricsCollector = new MetricsCollector();
      
      await cacheManager.set('integration_key', 'value');
      await cacheManager.get('integration_key');
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      
      // Cleanup
      cacheManager.clear();
    });

    test('should handle errors in cached operations', async () => {
      const cacheManager = new CacheManager();
      const errorHandler = new ErrorHandler();
      
      const failingFactory = async () => {
        throw new Error('Factory failed');
      };
      
      try {
        await cacheManager.getOrSet('failing_key', failingFactory);
      } catch (error) {
        await errorHandler.handleError(error as Error, {
          operation: 'cache_factory',
          timestamp: Date.now()
        });
      }
      
      const errorStats = errorHandler.getErrorStatistics();
      expect(errorStats.total).toBe(1);
      
      // Cleanup
      cacheManager.clear();
    });
  });
});
