/**
 * Test suite for Automation Tools
 */

import { 
  createAutomationRuleTool,
  updateAutomationRuleTool,
  deleteAutomationRuleTool,
  getAutomationRuleTool,
  listAutomationRulesTool,
  executeAutomationRuleTool,
  getAutomationExecutionsTool,
  validateAutomationRuleTool,
  getAutomationMetricsTool,
  executeCreateAutomationRule,
  executeUpdateAutomationRule,
  executeDeleteAutomationRule,
  executeGetAutomationRule,
  executeListAutomationRules,
  executeExecuteAutomationRule,
  executeGetAutomationExecutions,
  executeValidateAutomationRule,
  executeGetAutomationMetrics,
  initializeAutomationEngine
} from '../src/tools/automationTools.js';
import { JiraRestClient } from '../src/http/JiraRestClient.js';

// Mock JiraRestClient
jest.mock('../src/http/JiraRestClient.js');

describe('Automation Tools', () => {
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockJiraClient = new JiraRestClient({
      baseURL: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    // Initialize automation engine with mock client
    initializeAutomationEngine(mockJiraClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Definitions', () => {
    test('createAutomationRuleTool should have correct structure', () => {
      expect(createAutomationRuleTool).toBeDefined();
      expect(createAutomationRuleTool.name).toBe('automation.rule.create');
      expect(createAutomationRuleTool.description).toContain('Create automation rule');
      expect(createAutomationRuleTool.inputSchema).toBeDefined();
      expect(createAutomationRuleTool.inputSchema.type).toBe('object');
    });

    test('updateAutomationRuleTool should have correct structure', () => {
      expect(updateAutomationRuleTool).toBeDefined();
      expect(updateAutomationRuleTool.name).toBe('automation.rule.update');
      expect(updateAutomationRuleTool.description).toContain('Update automation rule');
      expect(updateAutomationRuleTool.inputSchema).toBeDefined();
    });

    test('deleteAutomationRuleTool should have correct structure', () => {
      expect(deleteAutomationRuleTool).toBeDefined();
      expect(deleteAutomationRuleTool.name).toBe('automation.rule.delete');
      expect(deleteAutomationRuleTool.description).toContain('Delete automation rule');
      expect(deleteAutomationRuleTool.inputSchema).toBeDefined();
    });

    test('getAutomationRuleTool should have correct structure', () => {
      expect(getAutomationRuleTool).toBeDefined();
      expect(getAutomationRuleTool.name).toBe('automation.rule.get');
      expect(getAutomationRuleTool.description).toContain('Get automation rule');
      expect(getAutomationRuleTool.inputSchema).toBeDefined();
    });

    test('listAutomationRulesTool should have correct structure', () => {
      expect(listAutomationRulesTool).toBeDefined();
      expect(listAutomationRulesTool.name).toBe('automation.rules.list');
      expect(listAutomationRulesTool.description).toContain('List automation rules');
      expect(listAutomationRulesTool.inputSchema).toBeDefined();
    });

    test('executeAutomationRuleTool should have correct structure', () => {
      expect(executeAutomationRuleTool).toBeDefined();
      expect(executeAutomationRuleTool.name).toBe('automation.rule.execute');
      expect(executeAutomationRuleTool.description).toContain('Execute automation rule');
      expect(executeAutomationRuleTool.inputSchema).toBeDefined();
    });

    test('getAutomationExecutionsTool should have correct structure', () => {
      expect(getAutomationExecutionsTool).toBeDefined();
      expect(getAutomationExecutionsTool.name).toBe('automation.executions.get');
      expect(getAutomationExecutionsTool.description).toContain('Get automation executions');
      expect(getAutomationExecutionsTool.inputSchema).toBeDefined();
    });

    test('validateAutomationRuleTool should have correct structure', () => {
      expect(validateAutomationRuleTool).toBeDefined();
      expect(validateAutomationRuleTool.name).toBe('automation.rule.validate');
      expect(validateAutomationRuleTool.description).toContain('Validate automation rule');
      expect(validateAutomationRuleTool.inputSchema).toBeDefined();
    });

    test('getAutomationMetricsTool should have correct structure', () => {
      expect(getAutomationMetricsTool).toBeDefined();
      expect(getAutomationMetricsTool.name).toBe('automation.metrics.get');
      expect(getAutomationMetricsTool.description).toContain('Get automation metrics');
      expect(getAutomationMetricsTool.inputSchema).toBeDefined();
    });
  });

  describe('Tool Execution Functions', () => {
    test('executeCreateAutomationRule should handle valid input', async () => {
      const validArgs = {
        name: 'Test Rule',
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

      const result = await executeCreateAutomationRule(validArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('executeCreateAutomationRule should handle invalid input', async () => {
      const invalidArgs = {
        // Missing required fields
      };

      const result = await executeCreateAutomationRule(invalidArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('executeGetAutomationRule should handle valid rule ID', async () => {
      const validArgs = {
        ruleId: 'rule-123'
      };

      const result = await executeGetAutomationRule(validArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('executeListAutomationRules should handle optional filters', async () => {
      const validArgs = {
        projectKey: 'TEST',
        enabled: true
      };

      const result = await executeListAutomationRules(validArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('executeValidateAutomationRule should validate rule structure', async () => {
      const validArgs = {
        rule: {
          name: 'Test Rule',
          trigger: {
            type: 'issue.created',
            config: {}
          },
          actions: [{
            type: 'issue.assign',
            config: {
              assigneeId: 'user123'
            }
          }]
        }
      };

      const result = await executeValidateAutomationRule(validArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    test('executeGetAutomationMetrics should return metrics', async () => {
      const validArgs = {
        ruleId: 'rule-123'
      };

      const result = await executeGetAutomationMetrics(validArgs);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      const validArgs = {
        name: 'Test Rule',
        trigger: {
          type: 'issue.created',
          config: {}
        },
        actions: []
      };

      // Mock network error
      mockJiraClient.post = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await executeCreateAutomationRule(validArgs);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    test('should validate required fields', async () => {
      const invalidArgs = {
        // Missing name
        trigger: {
          type: 'issue.created'
        }
      };

      const result = await executeCreateAutomationRule(invalidArgs);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should initialize automation engine without errors', () => {
      expect(() => {
        initializeAutomationEngine(mockJiraClient);
      }).not.toThrow();
    });

    test('should handle rule lifecycle operations', async () => {
      // Create rule
      const createArgs = {
        name: 'Lifecycle Test Rule',
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

      const createResult = await executeCreateAutomationRule(createArgs);
      expect(createResult).toBeDefined();

      // List rules
      const listResult = await executeListAutomationRules({});
      expect(listResult).toBeDefined();

      // Get metrics
      const metricsResult = await executeGetAutomationMetrics({});
      expect(metricsResult).toBeDefined();
    });
  });
});
