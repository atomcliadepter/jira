/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

import { jest } from '@jest/globals';

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveValidToolStructure(received: any) {
    const hasName = typeof received.name === 'string' && received.name.length > 0;
    const hasDescription = typeof received.description === 'string' && received.description.length > 0;
    const hasInputSchema = received.inputSchema && typeof received.inputSchema === 'object';
    
    const pass = hasName && hasDescription && hasInputSchema;
    
    if (pass) {
      return {
        message: () => `expected tool not to have valid structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected tool to have valid structure (name, description, inputSchema)`,
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveValidToolStructure(): R;
    }
  }
}

// Global test configuration
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
  process.env.JIRA_EMAIL = 'test@example.com';
  process.env.JIRA_API_TOKEN = 'ATATT3xFfGF0123456789abcdef';
  process.env.CONFLUENCE_BASE_URL = 'https://test.atlassian.net/wiki';
  process.env.CONFLUENCE_EMAIL = 'test@example.com';
  process.env.CONFLUENCE_API_TOKEN = 'ATATT3xFfGF0123456789abcdef';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
  
  // Mock console methods to reduce test output noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test utilities
export const TestUtils = {
  /**
   * Create a mock Jira issue
   */
  createMockIssue: (overrides: any = {}) => ({
    id: '10001',
    key: 'TEST-1',
    self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    fields: {
      summary: 'Test Issue',
      description: 'Test Description',
      status: { name: 'Open', id: '1' },
      priority: { name: 'Medium', id: '3' },
      issuetype: { name: 'Task', id: '10001' },
      project: { key: 'TEST', id: '10000' },
      assignee: { accountId: 'user123', displayName: 'Test User' },
      created: '2024-01-01T00:00:00.000Z',
      updated: '2024-01-01T00:00:00.000Z',
      ...overrides.fields
    },
    ...overrides
  }),

  /**
   * Create a mock automation rule
   */
  createMockAutomationRule: (overrides: any = {}) => ({
    id: 'rule-123',
    name: 'Test Automation Rule',
    enabled: true,
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
    }],
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides
  }),

  /**
   * Create a mock API response
   */
  createMockApiResponse: (data: any, status = 200) => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'content-type': 'application/json'
    }
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random test data
   */
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  
  randomInt: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,

  /**
   * Validate tool structure
   */
  validateToolStructure: (tool: any) => {
    expect(tool).toHaveProperty('name');
    expect(tool).toHaveProperty('description');
    expect(tool).toHaveProperty('inputSchema');
    expect(typeof tool.name).toBe('string');
    expect(typeof tool.description).toBe('string');
    expect(typeof tool.inputSchema).toBe('object');
    expect(tool.name.length).toBeGreaterThan(0);
    expect(tool.description.length).toBeGreaterThan(0);
  },

  /**
   * Performance measurement utility
   */
  measurePerformance: async (fn: () => Promise<any> | any, name = 'operation') => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;
    
    console.log(`${name} took ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }
};

// Export for use in tests
export default TestUtils;
