#!/usr/bin/env node

/**
 * Test Utilities and Helpers
 * 
 * Common utilities used across different test suites.
 * Provides helper functions for test setup, data generation, and assertions.
 */

import { config } from 'dotenv';
import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

// Load environment variables from project root
config({ path: join(process.cwd(), '.env') });

export class TestHelpers {
  /**
   * Validate that required environment variables are present
   */
  static validateEnvironment() {
    const required = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Get Jira client configuration from environment
   */
  static getJiraConfig() {
    this.validateEnvironment();
    
    return {
      baseUrl: process.env.JIRA_BASE_URL,
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
      timeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
    };
  }

  /**
   * Generate a unique test identifier
   */
  static generateTestId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate test issue data
   */
  static generateTestIssueData(projectKey = 'SCRUM') {
    const testId = this.generateTestId();
    
    return {
      fields: {
        project: { key: projectKey },
        summary: `Test Issue - ${testId}`,
        description: `This is a test issue created by the test suite at ${new Date().toISOString()}`,
        issuetype: { name: 'Task' },
        priority: { name: 'Medium' }
      }
    };
  }

  /**
   * Generate test comment data
   */
  static generateTestCommentData() {
    const testId = this.generateTestId();
    
    return {
      body: `Test comment - ${testId} - Created at ${new Date().toISOString()}`
    };
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`   Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.wait(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Save test results to a file
   */
  static saveTestResults(results, filename) {
    const reportsDir = join(process.cwd(), 'test-suite', 'reports');
    
    // Ensure reports directory exists
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
    
    const filePath = join(reportsDir, filename);
    const data = {
      timestamp: new Date().toISOString(),
      ...results
    };
    
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  /**
   * Format duration in human-readable format
   */
  static formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Create a test summary report
   */
  static createSummaryReport(testResults) {
    const total = testResults.passed + testResults.failed;
    const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
    
    return {
      summary: {
        total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: `${successRate}%`
      },
      details: testResults.tests || [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Print a formatted test summary
   */
  static printTestSummary(testResults, title = 'Test Results') {
    console.log(`\n📊 ${title} Summary:`);
    console.log('='.repeat(title.length + 20));
    
    const total = testResults.passed + testResults.failed;
    const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (testResults.tests && testResults.tests.length > 0) {
      console.log('\n📋 Test Details:');
      testResults.tests.forEach((test, index) => {
        const status = test.status === 'PASSED' ? '✅' : '❌';
        const duration = this.formatDuration(test.duration || 0);
        console.log(`   ${index + 1}. ${status} ${test.name} (${duration})`);
        
        if (test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });
    }
  }

  /**
   * Validate JSON-RPC response format
   */
  static validateJsonRpcResponse(response, expectedId) {
    if (!response) {
      throw new Error('Response is null or undefined');
    }
    
    if (response.jsonrpc !== '2.0') {
      throw new Error(`Invalid JSON-RPC version: ${response.jsonrpc}`);
    }
    
    if (response.id !== expectedId) {
      throw new Error(`Response ID mismatch: expected ${expectedId}, got ${response.id}`);
    }
    
    if (response.error && response.result) {
      throw new Error('Response cannot have both error and result');
    }
    
    if (!response.error && !response.result) {
      throw new Error('Response must have either error or result');
    }
    
    return true;
  }

  /**
   * Create a JSON-RPC request
   */
  static createJsonRpcRequest(method, params = {}, id = null) {
    return {
      jsonrpc: '2.0',
      id: id || Date.now(),
      method,
      params
    };
  }

  /**
   * Clean up test data (placeholder for future implementation)
   */
  static async cleanupTestData(jiraClient, testIds = []) {
    // This would implement cleanup of test issues, comments, etc.
    // For now, it's a placeholder
    console.log(`🧹 Cleanup would remove ${testIds.length} test items`);
  }
}

export default TestHelpers;
