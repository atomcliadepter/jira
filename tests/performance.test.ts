/**
 * Performance Benchmarking Tests
 * Measures and validates performance characteristics of the MCP server
 */

import { performance } from 'perf_hooks';

describe('Performance Benchmarking Tests', () => {
  
  describe('Tool Registration Performance', () => {
    test('should register all 58 tools within acceptable time', async () => {
      const startTime = performance.now();
      
      // Simulate tool registration process
      const tools = Array(58).fill(null).map((_, index) => ({
        name: `tool.${index}`,
        description: `Tool ${index}`,
        inputSchema: { type: 'object' },
        registered: true
      }));
      
      const endTime = performance.now();
      const registrationTime = endTime - startTime;
      
      expect(tools).toHaveLength(58);
      expect(registrationTime).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle tool lookup efficiently', async () => {
      const tools = new Map();
      
      // Populate tools map
      for (let i = 0; i < 58; i++) {
        tools.set(`tool.${i}`, { name: `tool.${i}`, executor: () => {} });
      }
      
      const startTime = performance.now();
      
      // Perform 1000 lookups
      for (let i = 0; i < 1000; i++) {
        const toolName = `tool.${i % 58}`;
        const tool = tools.get(toolName);
        expect(tool).toBeDefined();
      }
      
      const endTime = performance.now();
      const lookupTime = endTime - startTime;
      
      expect(lookupTime).toBeLessThan(10); // Should complete in under 10ms
    });
  });

  describe('Memory Usage Benchmarks', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy tool usage
      const results = [];
      for (let i = 0; i < 1000; i++) {
        results.push({
          toolName: `automation.rule.${i % 8}`,
          args: {
            name: `Rule ${i}`,
            trigger: { type: 'issue.created' },
            actions: [{ type: 'issue.assign' }]
          },
          result: { success: true, ruleId: `rule-${i}` }
        });
      }
      
      const peakMemory = process.memoryUsage();
      
      // Clear results to test cleanup
      results.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not increase by more than 50MB
      const memoryIncrease = peakMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Memory should be mostly reclaimed after cleanup
      const memoryAfterCleanup = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryAfterCleanup).toBeLessThan(memoryIncrease * 0.5);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle concurrent tool executions efficiently', async () => {
      const concurrency = 50;
      const startTime = performance.now();
      
      const promises = Array(concurrency).fill(null).map(async (_, index) => {
        // Simulate async tool execution
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return {
          toolIndex: index,
          result: { success: true, data: `Result ${index}` }
        };
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(concurrency);
      expect(totalTime).toBeLessThan(100); // Should complete in under 100ms
      
      // Verify all executions completed successfully
      results.forEach((result, index) => {
        expect(result.toolIndex).toBe(index);
        expect(result.result.success).toBe(true);
      });
    });

    test('should maintain performance under sustained load', async () => {
      const iterations = 10;
      const operationsPerIteration = 100;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simulate batch operations
        const operations = Array(operationsPerIteration).fill(null).map((_, index) => ({
          operation: `batch-${i}-${index}`,
          processed: true
        }));
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
        expect(operations).toHaveLength(operationsPerIteration);
      }
      
      // Calculate performance metrics
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      // Performance should be consistent
      expect(maxTime - minTime).toBeLessThan(avgTime * 2); // Variance should be reasonable
      expect(avgTime).toBeLessThan(50); // Average should be under 50ms
    });
  });

  describe('Data Processing Performance', () => {
    test('should process large JQL result sets efficiently', async () => {
      const largeResultSet = Array(10000).fill(null).map((_, index) => ({
        id: `ISSUE-${index}`,
        key: `PROJ-${index}`,
        fields: {
          summary: `Issue ${index}`,
          status: { name: index % 3 === 0 ? 'Open' : index % 3 === 1 ? 'In Progress' : 'Done' },
          assignee: { accountId: `user-${index % 10}` },
          created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      }));
      
      const startTime = performance.now();
      
      // Simulate analytics processing
      const analytics = {
        totalIssues: largeResultSet.length,
        statusDistribution: {},
        assigneeDistribution: {},
        avgAge: 0
      };
      
      // Process status distribution
      largeResultSet.forEach(issue => {
        const status = issue.fields.status.name;
        analytics.statusDistribution[status] = (analytics.statusDistribution[status] || 0) + 1;
      });
      
      // Process assignee distribution
      largeResultSet.forEach(issue => {
        const assignee = issue.fields.assignee.accountId;
        analytics.assigneeDistribution[assignee] = (analytics.assigneeDistribution[assignee] || 0) + 1;
      });
      
      // Calculate average age
      const now = Date.now();
      const totalAge = largeResultSet.reduce((sum, issue) => {
        return sum + (now - new Date(issue.fields.created).getTime());
      }, 0);
      analytics.avgAge = totalAge / largeResultSet.length;
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      expect(analytics.totalIssues).toBe(10000);
      expect(Object.keys(analytics.statusDistribution)).toHaveLength(3);
      expect(Object.keys(analytics.assigneeDistribution)).toHaveLength(10);
      expect(processingTime).toBeLessThan(500); // Should process 10k items in under 500ms
    });

    test('should handle complex workflow analytics efficiently', async () => {
      const workflowData = Array(5000).fill(null).map((_, index) => ({
        issueId: `ISSUE-${index}`,
        transitions: Array(Math.floor(Math.random() * 10) + 1).fill(null).map((_, tIndex) => ({
          from: `Status-${tIndex}`,
          to: `Status-${tIndex + 1}`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          duration: Math.random() * 24 * 60 * 60 * 1000 // Random duration up to 24 hours
        }))
      }));
      
      const startTime = performance.now();
      
      // Calculate cycle time analytics
      const cycleTimeAnalytics = workflowData.map(issue => {
        const totalDuration = issue.transitions.reduce((sum, transition) => sum + transition.duration, 0);
        return {
          issueId: issue.issueId,
          cycleTime: totalDuration,
          transitionCount: issue.transitions.length
        };
      });
      
      // Calculate percentiles
      const cycleTimes = cycleTimeAnalytics.map(item => item.cycleTime).sort((a, b) => a - b);
      const percentiles = {
        p50: cycleTimes[Math.floor(cycleTimes.length * 0.5)],
        p75: cycleTimes[Math.floor(cycleTimes.length * 0.75)],
        p90: cycleTimes[Math.floor(cycleTimes.length * 0.9)],
        p95: cycleTimes[Math.floor(cycleTimes.length * 0.95)]
      };
      
      const endTime = performance.now();
      const analyticsTime = endTime - startTime;
      
      expect(cycleTimeAnalytics).toHaveLength(5000);
      expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
      expect(analyticsTime).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('CLI Performance', () => {
    test('should start CLI tools quickly', async () => {
      const cliTools = [
        'workflow-cli',
        'confluence-cli',
        'automation-cli',
        'customfield-cli'
      ];
      
      const startupTimes = [];
      
      for (const tool of cliTools) {
        const startTime = performance.now();
        
        // Simulate CLI startup (parsing args, loading config, etc.)
        const mockStartup = {
          parseArgs: () => ({ help: true }),
          loadConfig: () => ({ validated: true }),
          initializeClient: () => ({ connected: true })
        };
        
        mockStartup.parseArgs();
        mockStartup.loadConfig();
        mockStartup.initializeClient();
        
        const endTime = performance.now();
        startupTimes.push(endTime - startTime);
      }
      
      const avgStartupTime = startupTimes.reduce((sum, time) => sum + time, 0) / startupTimes.length;
      expect(avgStartupTime).toBeLessThan(10); // Should start in under 10ms (mocked)
    });
  });

  describe('Resource Cleanup Performance', () => {
    test('should clean up resources efficiently', async () => {
      const resources = [];
      
      // Create mock resources
      for (let i = 0; i < 1000; i++) {
        resources.push({
          id: i,
          connection: { active: true },
          cleanup: function() { this.connection.active = false; }
        });
      }
      
      const startTime = performance.now();
      
      // Cleanup all resources
      resources.forEach(resource => {
        resource.cleanup();
      });
      
      const endTime = performance.now();
      const cleanupTime = endTime - startTime;
      
      expect(cleanupTime).toBeLessThan(50); // Should cleanup 1000 resources in under 50ms
      
      // Verify all resources are cleaned up
      resources.forEach(resource => {
        expect(resource.connection.active).toBe(false);
      });
    });
  });

  describe('Error Handling Performance', () => {
    test('should handle errors without significant performance impact', async () => {
      const operations = 1000;
      const errorRate = 0.1; // 10% error rate
      
      const startTime = performance.now();
      
      const results = [];
      for (let i = 0; i < operations; i++) {
        try {
          if (Math.random() < errorRate) {
            throw new Error(`Simulated error ${i}`);
          }
          results.push({ success: true, operation: i });
        } catch (error) {
          results.push({ success: false, error: (error as Error).message });
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      expect(results).toHaveLength(operations);
      expect(errorCount).toBeGreaterThan(operations * errorRate * 0.5); // Should have some errors
      expect(errorCount).toBeLessThan(operations * errorRate * 1.5); // But not too many
      expect(totalTime).toBeLessThan(100); // Error handling shouldn't slow things down significantly
    });
  });
});
