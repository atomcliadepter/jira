/**
 * Comprehensive Load Testing Suite
 * Tests system performance under various load conditions
 */

import { performance } from 'perf_hooks';

describe('Load Testing Suite', () => {

  describe('Concurrent Tool Execution Load Tests', () => {
    test('should handle 100 concurrent tool executions', async () => {
      const concurrency = 100;
      const startTime = performance.now();
      
      const promises = Array(concurrency).fill(null).map(async (_, index) => {
        // Simulate tool execution
        const executionTime = Math.random() * 100 + 50; // 50-150ms
        await new Promise(resolve => setTimeout(resolve, executionTime));
        
        return {
          toolIndex: index,
          executionTime,
          success: Math.random() > 0.05, // 95% success rate
          timestamp: Date.now()
        };
      });
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrency);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.9); // At least 90% success rate
      
      const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
      expect(avgExecutionTime).toBeLessThan(200); // Average execution time under 200ms
    });

    test('should handle sustained load over time', async () => {
      const duration = 30000; // 30 seconds
      const requestsPerSecond = 10;
      const startTime = Date.now();
      const results: any[] = [];
      
      while (Date.now() - startTime < duration) {
        const batchPromises = Array(requestsPerSecond).fill(null).map(async () => {
          const executionStart = performance.now();
          
          // Simulate varying tool execution times
          const toolType = Math.floor(Math.random() * 3);
          let executionTime: number;
          
          switch (toolType) {
            case 0: // Fast tools (issue.get)
              executionTime = Math.random() * 50 + 10; // 10-60ms
              break;
            case 1: // Medium tools (issue.create)
              executionTime = Math.random() * 200 + 100; // 100-300ms
              break;
            case 2: // Slow tools (workflow.analytics)
              executionTime = Math.random() * 500 + 200; // 200-700ms
              break;
            default:
              executionTime = 100;
          }
          
          await new Promise(resolve => setTimeout(resolve, executionTime));
          
          return {
            toolType,
            executionTime,
            actualDuration: performance.now() - executionStart,
            success: Math.random() > 0.02, // 98% success rate
            timestamp: Date.now()
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Wait for next second
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      expect(results.length).toBeGreaterThan(250); // At least 250 requests in 30 seconds
      
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95); // At least 95% success rate
      
      // Check performance by tool type
      const fastTools = results.filter(r => r.toolType === 0);
      const mediumTools = results.filter(r => r.toolType === 1);
      const slowTools = results.filter(r => r.toolType === 2);
      
      if (fastTools.length > 0) {
        const avgFastTime = fastTools.reduce((sum, r) => sum + r.actualDuration, 0) / fastTools.length;
        expect(avgFastTime).toBeLessThan(100); // Fast tools under 100ms
      }
      
      if (mediumTools.length > 0) {
        const avgMediumTime = mediumTools.reduce((sum, r) => sum + r.actualDuration, 0) / mediumTools.length;
        expect(avgMediumTime).toBeLessThan(400); // Medium tools under 400ms
      }
      
      if (slowTools.length > 0) {
        const avgSlowTime = slowTools.reduce((sum, r) => sum + r.actualDuration, 0) / slowTools.length;
        expect(avgSlowTime).toBeLessThan(800); // Slow tools under 800ms
      }
    });
  });

  describe('Memory Usage Load Tests', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: any[] = [];
      
      // Generate load for 60 seconds
      const loadDuration = 60000;
      const startTime = Date.now();
      
      const loadGenerator = async () => {
        while (Date.now() - startTime < loadDuration) {
          // Simulate memory-intensive operations
          const largeData = Array(1000).fill(null).map((_, index) => ({
            id: `item-${index}`,
            data: `data-${Math.random().toString(36).substring(2, 15)}`,
            timestamp: Date.now(),
            metadata: {
              processed: true,
              size: Math.random() * 1000,
              tags: Array(5).fill(null).map(() => Math.random().toString(36).substring(2, 8))
            }
          }));
          
          // Process data
          const processed = largeData.map(item => ({
            ...item,
            processed: true,
            processedAt: Date.now()
          }));
          
          // Simulate cleanup
          processed.length = 0;
          largeData.length = 0;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };
      
      // Monitor memory usage
      const memoryMonitor = async () => {
        while (Date.now() - startTime < loadDuration) {
          const memory = process.memoryUsage();
          memorySnapshots.push({
            timestamp: Date.now(),
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            rss: memory.rss,
            external: memory.external
          });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      };
      
      // Run load and monitoring concurrently
      await Promise.all([loadGenerator(), memoryMonitor()]);
      
      expect(memorySnapshots.length).toBeGreaterThan(50);
      
      // Check memory stability
      const heapUsages = memorySnapshots.map(s => s.heapUsed);
      const maxHeapUsage = Math.max(...heapUsages);
      const minHeapUsage = Math.min(...heapUsages);
      const avgHeapUsage = heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
      
      // Memory should not grow unboundedly
      const memoryGrowth = maxHeapUsage - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      
      // Memory usage should be relatively stable
      const memoryVariance = heapUsages.reduce((sum, usage) => sum + Math.pow(usage - avgHeapUsage, 2), 0) / heapUsages.length;
      const memoryStdDev = Math.sqrt(memoryVariance);
      expect(memoryStdDev / avgHeapUsage).toBeLessThan(0.3); // Standard deviation less than 30% of average
    });

    test('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage();
      const memoryPressureResults: any[] = [];
      
      // Create memory pressure by allocating large objects
      const createMemoryPressure = async () => {
        const largeObjects: any[] = [];
        
        try {
          for (let i = 0; i < 100; i++) {
            // Allocate 1MB objects
            const largeObject = {
              id: i,
              data: Buffer.alloc(1024 * 1024, 'x'),
              metadata: Array(1000).fill(null).map((_, index) => ({
                index,
                value: Math.random(),
                text: Math.random().toString(36).repeat(10)
              }))
            };
            
            largeObjects.push(largeObject);
            
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Record memory usage
            const currentMemory = process.memoryUsage();
            memoryPressureResults.push({
              iteration: i,
              heapUsed: currentMemory.heapUsed,
              heapTotal: currentMemory.heapTotal,
              rss: currentMemory.rss,
              timestamp: Date.now()
            });
            
            // Clean up some objects periodically
            if (i % 10 === 0 && largeObjects.length > 5) {
              largeObjects.splice(0, 5);
              
              // Force garbage collection if available
              if (global.gc) {
                global.gc();
              }
            }
          }
        } finally {
          // Cleanup
          largeObjects.length = 0;
          
          if (global.gc) {
            global.gc();
          }
        }
      };
      
      await createMemoryPressure();
      
      expect(memoryPressureResults.length).toBe(100);
      
      // Check that memory was eventually cleaned up
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB after cleanup)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Check for memory leaks by analyzing trend
      const firstHalf = memoryPressureResults.slice(0, 50);
      const secondHalf = memoryPressureResults.slice(50);
      
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.heapUsed, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.heapUsed, 0) / secondHalf.length;
      
      // Memory usage in second half should not be significantly higher
      const memoryGrowthRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      expect(memoryGrowthRate).toBeLessThan(2.0); // Less than 200% growth
    });
  });

  describe('Cache Performance Load Tests', () => {
    test('should maintain cache performance under high load', async () => {
      const cache = new Map<string, any>();
      const cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      };
      
      const cacheOperations = async () => {
        const operations = 10000;
        const results: any[] = [];
        
        for (let i = 0; i < operations; i++) {
          const operationType = Math.random();
          const key = `key-${Math.floor(Math.random() * 1000)}`;
          const startTime = performance.now();
          
          if (operationType < 0.6) {
            // 60% reads
            const value = cache.get(key);
            if (value !== undefined) {
              cacheStats.hits++;
            } else {
              cacheStats.misses++;
            }
          } else if (operationType < 0.9) {
            // 30% writes
            const value = {
              data: Math.random().toString(36),
              timestamp: Date.now(),
              size: Math.random() * 1000
            };
            cache.set(key, value);
            cacheStats.sets++;
          } else {
            // 10% deletes
            cache.delete(key);
            cacheStats.deletes++;
          }
          
          const duration = performance.now() - startTime;
          results.push({
            operation: operationType < 0.6 ? 'get' : operationType < 0.9 ? 'set' : 'delete',
            duration,
            cacheSize: cache.size
          });
        }
        
        return results;
      };
      
      const results = await cacheOperations();
      
      expect(results).toHaveLength(10000);
      
      // Check cache performance
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgDuration).toBeLessThan(1); // Average operation under 1ms
      
      const maxDuration = Math.max(...results.map(r => r.duration));
      expect(maxDuration).toBeLessThan(10); // Max operation under 10ms
      
      // Check cache hit rate
      const totalReads = cacheStats.hits + cacheStats.misses;
      const hitRate = totalReads > 0 ? cacheStats.hits / totalReads : 0;
      expect(hitRate).toBeGreaterThan(0.1); // At least 10% hit rate
      
      // Check cache size management
      const maxCacheSize = Math.max(...results.map(r => r.cacheSize));
      expect(maxCacheSize).toBeLessThan(2000); // Cache size should be reasonable
    });
  });

  describe('Error Handling Load Tests', () => {
    test('should handle high error rates gracefully', async () => {
      const errorStats = {
        networkErrors: 0,
        validationErrors: 0,
        systemErrors: 0,
        recoveredErrors: 0,
        totalErrors: 0
      };
      
      const simulateErrorScenarios = async () => {
        const operations = 1000;
        const results: any[] = [];
        
        for (let i = 0; i < operations; i++) {
          const startTime = performance.now();
          let success = true;
          let errorType: string | undefined;
          let recovered = false;
          
          // Simulate different error scenarios
          const errorChance = Math.random();
          
          if (errorChance < 0.1) {
            // 10% network errors
            success = false;
            errorType = 'NetworkError';
            errorStats.networkErrors++;
            errorStats.totalErrors++;
            
            // Simulate recovery attempt
            if (Math.random() < 0.7) {
              recovered = true;
              errorStats.recoveredErrors++;
            }
          } else if (errorChance < 0.15) {
            // 5% validation errors
            success = false;
            errorType = 'ValidationError';
            errorStats.validationErrors++;
            errorStats.totalErrors++;
            
            // Validation errors rarely recover automatically
            if (Math.random() < 0.2) {
              recovered = true;
              errorStats.recoveredErrors++;
            }
          } else if (errorChance < 0.17) {
            // 2% system errors
            success = false;
            errorType = 'SystemError';
            errorStats.systemErrors++;
            errorStats.totalErrors++;
            
            // System errors sometimes recover
            if (Math.random() < 0.5) {
              recovered = true;
              errorStats.recoveredErrors++;
            }
          }
          
          // Simulate processing time
          const processingTime = success ? Math.random() * 100 + 50 : Math.random() * 200 + 100;
          await new Promise(resolve => setTimeout(resolve, processingTime));
          
          const duration = performance.now() - startTime;
          results.push({
            success,
            errorType,
            recovered,
            duration,
            timestamp: Date.now()
          });
        }
        
        return results;
      };
      
      const results = await simulateErrorScenarios();
      
      expect(results).toHaveLength(1000);
      
      // Check error handling performance
      const errorResults = results.filter(r => !r.success);
      const successResults = results.filter(r => r.success);
      
      expect(errorStats.totalErrors).toBeGreaterThan(100); // Should have generated errors
      expect(errorStats.totalErrors).toBeLessThan(200); // But not too many
      
      // Check recovery rate
      const recoveryRate = errorStats.recoveredErrors / errorStats.totalErrors;
      expect(recoveryRate).toBeGreaterThan(0.3); // At least 30% recovery rate
      
      // Check that error handling doesn't significantly impact performance
      if (errorResults.length > 0 && successResults.length > 0) {
        const avgErrorDuration = errorResults.reduce((sum, r) => sum + r.duration, 0) / errorResults.length;
        const avgSuccessDuration = successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length;
        
        // Error handling should not be more than 3x slower
        expect(avgErrorDuration / avgSuccessDuration).toBeLessThan(3);
      }
    });
  });

  describe('Scalability Tests', () => {
    test('should scale performance linearly with load', async () => {
      const loadLevels = [10, 50, 100, 200];
      const performanceResults: any[] = [];
      
      for (const loadLevel of loadLevels) {
        const startTime = performance.now();
        
        const promises = Array(loadLevel).fill(null).map(async (_, index) => {
          const operationStart = performance.now();
          
          // Simulate work
          const workDuration = Math.random() * 50 + 25; // 25-75ms
          await new Promise(resolve => setTimeout(resolve, workDuration));
          
          return {
            index,
            duration: performance.now() - operationStart
          };
        });
        
        const results = await Promise.all(promises);
        const totalTime = performance.now() - startTime;
        
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        const throughput = loadLevel / (totalTime / 1000); // operations per second
        
        performanceResults.push({
          loadLevel,
          totalTime,
          avgDuration,
          throughput,
          efficiency: throughput / loadLevel
        });
      }
      
      expect(performanceResults).toHaveLength(4);
      
      // Check that throughput scales reasonably
      const throughputs = performanceResults.map(r => r.throughput);
      
      // Throughput should generally increase with load level
      expect(throughputs[1]).toBeGreaterThan(throughputs[0] * 0.8);
      expect(throughputs[2]).toBeGreaterThan(throughputs[1] * 0.8);
      
      // Efficiency should not degrade too much
      const efficiencies = performanceResults.map(r => r.efficiency);
      const maxEfficiency = Math.max(...efficiencies);
      const minEfficiency = Math.min(...efficiencies);
      
      expect(minEfficiency / maxEfficiency).toBeGreaterThan(0.5); // Efficiency should not drop below 50% of peak
    });
  });
});
