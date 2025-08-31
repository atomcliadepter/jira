import { describe, test, expect, beforeAll } from '@jest/globals';
import { EnhancedJiraRestClient } from '../../src/http/EnhancedJiraRestClient.js';
import { executeGetIssue } from '../../src/tools/getIssue.js';
import { executeSearchIssues } from '../../src/tools/searchIssues.js';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

describe('Performance Regression Tests', () => {
  let jiraClient: EnhancedJiraRestClient;

  const skipPerformanceTests = !process.env.JIRA_BASE_URL || 
                               !process.env.JIRA_EMAIL || 
                               !process.env.JIRA_API_TOKEN;

  beforeAll(() => {
    if (skipPerformanceTests) {
      console.log('Skipping performance tests - credentials not configured');
      return;
    }

    jiraClient = new EnhancedJiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
    });
  });

  describe('Tool Execution Performance', () => {
    test('issue.get should complete within 5 seconds', async () => {
      if (skipPerformanceTests) return;

      const startTime = Date.now();
      
      try {
        await executeGetIssue(jiraClient, { issueIdOrKey: 'NONEXISTENT-1' });
      } catch (error) {
        // Expected to fail, we're measuring response time
      }
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000);
    }, 10000);

    test('jql.search should complete within 10 seconds', async () => {
      if (skipPerformanceTests) return;

      const startTime = Date.now();
      
      try {
        await executeSearchIssues(jiraClient, { 
          jql: 'project = NONEXISTENT',
          maxResults: 10
        });
      } catch (error) {
        // Expected to fail, we're measuring response time
      }
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000);
    }, 15000);
  });

  describe('Memory Usage', () => {
    test('should not leak memory during multiple operations', async () => {
      if (skipPerformanceTests) return;

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        try {
          await executeGetIssue(jiraClient, { issueIdOrKey: `TEST-${i}` });
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 30000);
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent requests efficiently', async () => {
      if (skipPerformanceTests) return;

      const startTime = Date.now();
      
      const promises = Array.from({ length: 5 }, (_, i) =>
        executeGetIssue(jiraClient, { issueIdOrKey: `CONCURRENT-${i}` })
          .catch(() => null) // Ignore errors, focus on timing
      );
      
      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      
      // Should complete all 5 concurrent requests within 15 seconds
      expect(totalTime).toBeLessThan(15000);
    }, 20000);
  });

  describe('Rate Limiting Performance', () => {
    test('should handle rate limiting gracefully', async () => {
      if (skipPerformanceTests) return;

      const rateLimitInfo = jiraClient.getRateLimitInfo();
      
      expect(rateLimitInfo).toHaveProperty('limit');
      expect(rateLimitInfo).toHaveProperty('remaining');
      expect(rateLimitInfo).toHaveProperty('resetTime');
      
      expect(typeof rateLimitInfo.limit).toBe('number');
      expect(typeof rateLimitInfo.remaining).toBe('number');
    });
  });
});
