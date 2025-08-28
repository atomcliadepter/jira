/**
 * Comprehensive Benchmark Testing Suite
 * Performance benchmarking and regression testing
 */

import { performance } from 'perf_hooks';

describe('Benchmark Testing Suite', () => {

  describe('Tool Execution Benchmarks', () => {
    test('should benchmark tool registration performance', async () => {
      const toolCount = 58;
      const iterations = 10;
      const results: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simulate tool registration
        const tools = Array(toolCount).fill(null).map((_, index) => ({
          name: `tool.${index}`,
          description: `Tool ${index} description`,
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' },
              param2: { type: 'number' }
            }
          },
          registered: true
        }));
        
        const endTime = performance.now();
        results.push(endTime - startTime);
        
        expect(tools).toHaveLength(toolCount);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const minTime = Math.min(...results);
      const maxTime = Math.max(...results);
      
      // Performance assertions
      expect(avgTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(200); // Max under 200ms
      expect(minTime).toBeGreaterThan(0); // Sanity check
      
      console.log(`Tool Registration Benchmark:
        Average: ${avgTime.toFixed(2)}ms
        Min: ${minTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms
        Tools: ${toolCount}`);
    });

    test('should benchmark tool lookup performance', async () => {
      const toolCount = 58;
      const lookupCount = 1000;
      
      // Setup tools map
      const toolsMap = new Map();
      for (let i = 0; i < toolCount; i++) {
        toolsMap.set(`tool.${i}`, { name: `tool.${i}`, executor: () => {} });
      }
      
      const startTime = performance.now();
      
      // Perform lookups
      for (let i = 0; i < lookupCount; i++) {
        const toolName = `tool.${i % toolCount}`;
        const tool = toolsMap.get(toolName);
        expect(tool).toBeDefined();
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgLookupTime = totalTime / lookupCount;
      
      // Performance assertions
      expect(totalTime).toBeLessThan(10); // Total under 10ms
      expect(avgLookupTime).toBeLessThan(0.01); // Average under 0.01ms per lookup
      
      console.log(`Tool Lookup Benchmark:
        Total time: ${totalTime.toFixed(2)}ms
        Average per lookup: ${avgLookupTime.toFixed(4)}ms
        Lookups: ${lookupCount}`);
    });
  });

  describe('Memory Performance Benchmarks', () => {
    test('should benchmark memory allocation and cleanup', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 100;
      const objectSize = 1000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Allocate memory
        const largeObject = {
          id: i,
          data: Array(objectSize).fill(null).map((_, index) => ({
            index,
            value: Math.random(),
            text: Math.random().toString(36).substring(2, 15)
          }))
        };
        
        // Process data
        const processed = largeObject.data.map(item => ({
          ...item,
          processed: true,
          timestamp: Date.now()
        }));
        
        // Cleanup
        processed.length = 0;
        largeObject.data.length = 0;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const endTime = performance.now();
      const finalMemory = process.memoryUsage();
      
      const totalTime = endTime - startTime;
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const avgIterationTime = totalTime / iterations;
      
      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Total under 5 seconds
      expect(avgIterationTime).toBeLessThan(50); // Average under 50ms per iteration
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Memory increase under 10MB
      
      console.log(`Memory Allocation Benchmark:
        Total time: ${totalTime.toFixed(2)}ms
        Average per iteration: ${avgIterationTime.toFixed(2)}ms
        Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB
        Iterations: ${iterations}`);
    });

    test('should benchmark garbage collection efficiency', async () => {
      const iterations = 50;
      const memorySnapshots: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Allocate significant memory
        const largeArray = Array(10000).fill(null).map((_, index) => ({
          id: index,
          data: Math.random().toString(36).repeat(100),
          metadata: {
            created: Date.now(),
            processed: false,
            tags: Array(10).fill(null).map(() => Math.random().toString(36).substring(2, 8))
          }
        }));
        
        // Process and clear
        largeArray.forEach(item => {
          item.metadata.processed = true;
        });
        largeArray.length = 0;
        
        // Force GC every 10 iterations
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
        
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }
      
      // Final GC
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const maxMemory = Math.max(...memorySnapshots);
      const avgMemory = memorySnapshots.reduce((sum, mem) => sum + mem, 0) / memorySnapshots.length;
      
      // Calculate memory stability
      const memoryVariance = memorySnapshots.reduce((sum, mem) => sum + Math.pow(mem - avgMemory, 2), 0) / memorySnapshots.length;
      const memoryStdDev = Math.sqrt(memoryVariance);
      const stabilityRatio = memoryStdDev / avgMemory;
      
      // Performance assertions
      expect(stabilityRatio).toBeLessThan(0.5); // Memory should be relatively stable
      expect(finalMemory).toBeLessThan(maxMemory * 1.2); // Final memory should be close to max
      
      console.log(`Garbage Collection Benchmark:
        Max memory: ${(maxMemory / 1024 / 1024).toFixed(2)}MB
        Avg memory: ${(avgMemory / 1024 / 1024).toFixed(2)}MB
        Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB
        Stability ratio: ${stabilityRatio.toFixed(3)}`);
    });
  });

  describe('Cache Performance Benchmarks', () => {
    test('should benchmark cache operations performance', async () => {
      const cache = new Map<string, any>();
      const operations = 10000;
      const keySpace = 1000;
      
      const operationTimes = {
        set: [] as number[],
        get: [] as number[],
        delete: [] as number[]
      };
      
      // Benchmark SET operations
      for (let i = 0; i < operations; i++) {
        const key = `key-${i % keySpace}`;
        const value = {
          data: Math.random().toString(36),
          timestamp: Date.now(),
          metadata: { size: Math.random() * 1000 }
        };
        
        const startTime = performance.now();
        cache.set(key, value);
        const endTime = performance.now();
        
        operationTimes.set.push(endTime - startTime);
      }
      
      // Benchmark GET operations
      for (let i = 0; i < operations; i++) {
        const key = `key-${i % keySpace}`;
        
        const startTime = performance.now();
        const value = cache.get(key);
        const endTime = performance.now();
        
        operationTimes.get.push(endTime - startTime);
        expect(value).toBeDefined();
      }
      
      // Benchmark DELETE operations
      for (let i = 0; i < operations / 10; i++) {
        const key = `key-${i}`;
        
        const startTime = performance.now();
        cache.delete(key);
        const endTime = performance.now();
        
        operationTimes.delete.push(endTime - startTime);
      }
      
      // Calculate averages
      const avgSetTime = operationTimes.set.reduce((sum, time) => sum + time, 0) / operationTimes.set.length;
      const avgGetTime = operationTimes.get.reduce((sum, time) => sum + time, 0) / operationTimes.get.length;
      const avgDeleteTime = operationTimes.delete.reduce((sum, time) => sum + time, 0) / operationTimes.delete.length;
      
      // Performance assertions
      expect(avgSetTime).toBeLessThan(0.1); // SET under 0.1ms
      expect(avgGetTime).toBeLessThan(0.05); // GET under 0.05ms
      expect(avgDeleteTime).toBeLessThan(0.1); // DELETE under 0.1ms
      
      console.log(`Cache Operations Benchmark:
        SET avg: ${avgSetTime.toFixed(4)}ms
        GET avg: ${avgGetTime.toFixed(4)}ms
        DELETE avg: ${avgDeleteTime.toFixed(4)}ms
        Operations: ${operations}`);
    });

    test('should benchmark cache hit ratio performance', async () => {
      const cache = new Map<string, any>();
      const totalOperations = 10000;
      const keySpace = 1000;
      const cacheStats = { hits: 0, misses: 0, sets: 0 };
      
      const startTime = performance.now();
      
      for (let i = 0; i < totalOperations; i++) {
        const operation = Math.random();
        const key = `key-${Math.floor(Math.random() * keySpace)}`;
        
        if (operation < 0.7) {
          // 70% reads
          const value = cache.get(key);
          if (value !== undefined) {
            cacheStats.hits++;
          } else {
            cacheStats.misses++;
          }
        } else {
          // 30% writes
          const value = {
            data: Math.random().toString(36),
            timestamp: Date.now()
          };
          cache.set(key, value);
          cacheStats.sets++;
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses);
      const throughput = totalOperations / (totalTime / 1000); // ops per second
      
      // Performance assertions
      expect(hitRate).toBeGreaterThan(0.1); // At least 10% hit rate
      expect(throughput).toBeGreaterThan(1000); // At least 1000 ops/sec
      expect(totalTime).toBeLessThan(5000); // Total under 5 seconds
      
      console.log(`Cache Hit Ratio Benchmark:
        Hit rate: ${(hitRate * 100).toFixed(1)}%
        Throughput: ${throughput.toFixed(0)} ops/sec
        Total time: ${totalTime.toFixed(2)}ms
        Operations: ${totalOperations}`);
    });
  });

  describe('Concurrent Operations Benchmarks', () => {
    test('should benchmark concurrent execution performance', async () => {
      const concurrencyLevels = [10, 50, 100, 200];
      const results: any[] = [];
      
      for (const concurrency of concurrencyLevels) {
        const startTime = performance.now();
        
        const promises = Array(concurrency).fill(null).map(async (_, index) => {
          const operationStart = performance.now();
          
          // Simulate varying workloads
          const workType = index % 3;
          let workDuration: number;
          
          switch (workType) {
            case 0: // Light work
              workDuration = Math.random() * 10 + 5;
              break;
            case 1: // Medium work
              workDuration = Math.random() * 50 + 25;
              break;
            case 2: // Heavy work
              workDuration = Math.random() * 100 + 50;
              break;
            default:
              workDuration = 25;
          }
          
          await new Promise(resolve => setTimeout(resolve, workDuration));
          
          return {
            index,
            workType,
            duration: performance.now() - operationStart
          };
        });
        
        const operationResults = await Promise.all(promises);
        const totalTime = performance.now() - startTime;
        
        const avgDuration = operationResults.reduce((sum, r) => sum + r.duration, 0) / operationResults.length;
        const throughput = concurrency / (totalTime / 1000);
        const efficiency = throughput / concurrency;
        
        results.push({
          concurrency,
          totalTime,
          avgDuration,
          throughput,
          efficiency
        });
        
        // Performance assertions
        expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(efficiency).toBeGreaterThan(0.1); // At least 10% efficiency
      }
      
      console.log('Concurrent Operations Benchmark:');
      results.forEach(result => {
        console.log(`  Concurrency ${result.concurrency}: ${result.totalTime.toFixed(2)}ms total, ${result.throughput.toFixed(1)} ops/sec, ${(result.efficiency * 100).toFixed(1)}% efficiency`);
      });
      
      // Check scalability
      const throughputs = results.map(r => r.throughput);
      const scalabilityRatio = throughputs[throughputs.length - 1] / throughputs[0];
      expect(scalabilityRatio).toBeGreaterThan(1); // Should scale up
    });
  });

  describe('Error Handling Performance Benchmarks', () => {
    test('should benchmark error handling overhead', async () => {
      const operations = 1000;
      const errorRate = 0.2; // 20% error rate
      
      const successTimes: number[] = [];
      const errorTimes: number[] = [];
      
      for (let i = 0; i < operations; i++) {
        const shouldError = Math.random() < errorRate;
        const startTime = performance.now();
        
        try {
          if (shouldError) {
            throw new Error(`Test error ${i}`);
          }
          
          // Simulate successful operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
          
          const endTime = performance.now();
          successTimes.push(endTime - startTime);
          
        } catch (error) {
          // Simulate error handling
          await new Promise(resolve => setTimeout(resolve, Math.random() * 5 + 2));
          
          const endTime = performance.now();
          errorTimes.push(endTime - startTime);
        }
      }
      
      const avgSuccessTime = successTimes.reduce((sum, time) => sum + time, 0) / successTimes.length;
      const avgErrorTime = errorTimes.reduce((sum, time) => sum + time, 0) / errorTimes.length;
      const errorOverhead = avgErrorTime / avgSuccessTime;
      
      // Performance assertions
      expect(errorOverhead).toBeLessThan(3); // Error handling should not be more than 3x slower
      expect(avgErrorTime).toBeLessThan(50); // Error handling under 50ms
      expect(errorTimes.length).toBeGreaterThan(operations * errorRate * 0.5); // Should have some errors
      
      console.log(`Error Handling Benchmark:
        Success avg: ${avgSuccessTime.toFixed(2)}ms
        Error avg: ${avgErrorTime.toFixed(2)}ms
        Error overhead: ${errorOverhead.toFixed(2)}x
        Error rate: ${(errorTimes.length / operations * 100).toFixed(1)}%`);
    });
  });
});
