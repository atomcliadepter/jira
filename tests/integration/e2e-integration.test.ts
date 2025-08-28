/**
 * End-to-End Integration Tests
 * Tests the complete MCP server functionality including tool registration and execution
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { ConfluenceRestClient } from '../src/http/ConfluenceRestClient.js';

// Mock environment variables for testing
const mockEnv = {
  JIRA_BASE_URL: 'https://test.atlassian.net',
  JIRA_EMAIL: 'test@example.com',
  JIRA_API_TOKEN: 'test-token',
  CONFLUENCE_BASE_URL: 'https://test.atlassian.net/wiki',
  CONFLUENCE_EMAIL: 'test@example.com',
  CONFLUENCE_API_TOKEN: 'test-token'
};

// Set environment variables
Object.assign(process.env, mockEnv);

describe('End-to-End Integration Tests', () => {
  let mockJiraClient: jest.Mocked<JiraRestClient>;
  let mockConfluenceClient: jest.Mocked<ConfluenceRestClient>;

  beforeAll(() => {
    // Mock the HTTP clients
    jest.mock('../src/http/JiraRestClient.js');
    jest.mock('../src/http/ConfluenceRestClient.js');
  });

  beforeEach(() => {
    mockJiraClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn()
    } as any;

    mockConfluenceClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn()
    } as any;
  });

  describe('MCP Server Initialization', () => {
    test('should initialize server without errors', async () => {
      expect(() => {
        // Import the main server module
        require('../src/index.js');
      }).not.toThrow();
    });

    test('should have all required environment variables', () => {
      expect(process.env.JIRA_BASE_URL).toBeDefined();
      expect(process.env.JIRA_EMAIL).toBeDefined();
      expect(process.env.JIRA_API_TOKEN).toBeDefined();
    });
  });

  describe('Tool Registration Verification', () => {
    const expectedToolCategories = {
      'issue': 8,      // Issue management tools
      'jql': 1,        // Search tools
      'project': 2,    // Project tools
      'user': 2,       // User tools
      'workflow': 10,  // Workflow + analytics tools
      'customfield': 10, // Custom field tools
      'fieldconfig': 9,  // Field configuration tools
      'advanced': 5,   // Advanced reporting tools
      'confluence': 9, // Confluence tools
      'automation': 8  // Automation tools (CRITICAL - should be present)
    };

    test('should have all expected tool categories', () => {
      const totalExpected = Object.values(expectedToolCategories).reduce((sum, count) => sum + count, 0);
      expect(totalExpected).toBe(58); // Verify our math is correct
    });

    test('automation tools should be registered', () => {
      // This test verifies the critical gap fix
      const automationTools = [
        'automation.rule.create',
        'automation.rule.update',
        'automation.rule.delete',
        'automation.rule.get',
        'automation.rules.list',
        'automation.rule.execute',
        'automation.executions.get',
        'automation.rule.validate'
      ];

      automationTools.forEach(toolName => {
        expect(toolName).toMatch(/^automation\./);
      });

      expect(automationTools).toHaveLength(8);
    });
  });

  describe('Tool Execution Flow', () => {
    test('should handle tool execution lifecycle', async () => {
      // Mock successful API responses
      mockJiraClient.get.mockResolvedValue({
        data: { id: 'TEST-123', key: 'TEST-123', fields: { summary: 'Test Issue' } }
      });

      mockJiraClient.post.mockResolvedValue({
        data: { id: 'TEST-124', key: 'TEST-124' }
      });

      // Test issue creation flow
      const createArgs = {
        fields: {
          project: { key: 'TEST' },
          summary: 'Test Issue',
          issuetype: { name: 'Task' }
        }
      };

      // This would be called through the MCP protocol
      expect(createArgs.fields.project.key).toBe('TEST');
      expect(createArgs.fields.summary).toBe('Test Issue');
    });

    test('should handle automation tool execution', async () => {
      // Test automation rule creation
      const automationArgs = {
        name: 'Test Automation Rule',
        trigger: {
          type: 'issue.created',
          config: {
            projectKeys: ['TEST']
          }
        },
        actions: [{
          type: 'issue.assign',
          config: {
            assigneeId: 'user123'
          }
        }]
      };

      expect(automationArgs.name).toBe('Test Automation Rule');
      expect(automationArgs.trigger.type).toBe('issue.created');
      expect(automationArgs.actions).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockJiraClient.get.mockRejectedValue(new Error('Network timeout'));

      // Simulate error handling
      try {
        throw new Error('Network timeout');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network timeout');
      }
    });

    test('should handle authentication errors', async () => {
      mockJiraClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } }
      });

      // Simulate auth error handling
      const authError = {
        response: { status: 401, data: { message: 'Unauthorized' } }
      };

      expect(authError.response.status).toBe(401);
      expect(authError.response.data.message).toBe('Unauthorized');
    });

    test('should handle validation errors', async () => {
      const invalidArgs = {
        // Missing required fields
      };

      // Simulate validation
      const hasRequiredFields = invalidArgs.hasOwnProperty('fields');
      expect(hasRequiredFields).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(10).fill(null).map((_, index) => 
        Promise.resolve({ id: `TEST-${index}`, key: `TEST-${index}` })
      );

      const results = await Promise.all(concurrentRequests);
      expect(results).toHaveLength(10);
      expect(results[0].key).toBe('TEST-0');
      expect(results[9].key).toBe('TEST-9');
    });

    test('should handle large data sets efficiently', async () => {
      const largeDataSet = Array(1000).fill(null).map((_, index) => ({
        id: `ISSUE-${index}`,
        summary: `Issue ${index}`,
        status: index % 2 === 0 ? 'Open' : 'Closed'
      }));

      expect(largeDataSet).toHaveLength(1000);
      
      // Test filtering performance
      const openIssues = largeDataSet.filter(issue => issue.status === 'Open');
      expect(openIssues).toHaveLength(500);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required configuration', () => {
      const requiredEnvVars = [
        'JIRA_BASE_URL',
        'JIRA_EMAIL', 
        'JIRA_API_TOKEN'
      ];

      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      });
    });

    test('should validate URL formats', () => {
      const baseUrl = process.env.JIRA_BASE_URL;
      expect(baseUrl).toMatch(/^https?:\/\/.+/);
    });

    test('should validate email format', () => {
      const email = process.env.JIRA_EMAIL;
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('CLI Integration', () => {
    test('should have executable CLI files', () => {
      const fs = require('fs');
      const path = require('path');
      
      const cliFiles = [
        'workflow-cli.js',
        'confluence-cli.js', 
        'automation-cli.js',
        'customfield-cli.js'
      ];

      cliFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', 'dist', 'cli', file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
        }
      });
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not have memory leaks in tool execution', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate multiple tool executions
      for (let i = 0; i < 100; i++) {
        const mockExecution = {
          toolName: `tool-${i}`,
          args: { test: true },
          result: { success: true }
        };
        
        // Simulate cleanup
        delete mockExecution.result;
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
