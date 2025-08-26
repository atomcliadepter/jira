
/**
 * Tests for AutomationEngine
 */

import { AutomationEngine } from '../../src/automation/AutomationEngine.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import {
  TriggerType,
  ActionType,
  ExecutionStatus,
  AutomationRule
} from '../../src/automation/types.js';

// Mock JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

describe('AutomationEngine', () => {
  let automationEngine: AutomationEngine;
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockJiraClient = new JiraRestClient({
      baseURL: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    automationEngine = new AutomationEngine(mockJiraClient);
  });

  afterEach(async () => {
    await automationEngine.shutdown();
    jest.clearAllMocks();
  });

  describe('Rule Management', () => {
    const sampleRule = {
      name: 'Test Rule',
      description: 'A test automation rule',
      enabled: true,
      projectKeys: ['TEST'],
      triggers: [{
        type: TriggerType.ISSUE_CREATED,
        config: {
          projectKeys: ['TEST'],
          issueTypes: ['Task']
        }
      }],
      actions: [{
        type: ActionType.ADD_COMMENT,
        config: {
          comment: 'Welcome to the project!'
        },
        order: 1
      }],
      createdBy: 'test-user'
    };

    test('should create a new automation rule', async () => {
      const rule = await automationEngine.createRule(sampleRule);

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe(sampleRule.name);
      expect(rule.enabled).toBe(sampleRule.enabled);
      expect(rule.triggers).toHaveLength(1);
      expect(rule.actions).toHaveLength(1);
      expect(rule.executionCount).toBe(0);
      expect(rule.failureCount).toBe(0);
    });

    test('should validate rule before creation', async () => {
      const invalidRule = {
        ...sampleRule,
        name: '', // Invalid: empty name
        triggers: [] // Invalid: no triggers
      };

      await expect(automationEngine.createRule(invalidRule))
        .rejects.toThrow('Rule validation failed');
    });

    test('should update an existing rule', async () => {
      const rule = await automationEngine.createRule(sampleRule);
      
      const updates = {
        name: 'Updated Test Rule',
        description: 'Updated description',
        enabled: false
      };

      const updatedRule = await automationEngine.updateRule(rule.id, updates);

      expect(updatedRule.name).toBe(updates.name);
      expect(updatedRule.description).toBe(updates.description);
      expect(updatedRule.enabled).toBe(updates.enabled);
      expect(updatedRule.updatedAt).not.toEqual(rule.updatedAt);
    });

    test('should delete a rule', async () => {
      const rule = await automationEngine.createRule(sampleRule);
      
      await automationEngine.deleteRule(rule.id);
      
      const retrievedRule = automationEngine.getRule(rule.id);
      expect(retrievedRule).toBeUndefined();
    });

    test('should get rule by ID', async () => {
      const rule = await automationEngine.createRule(sampleRule);
      
      const retrievedRule = automationEngine.getRule(rule.id);
      
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule!.id).toBe(rule.id);
      expect(retrievedRule!.name).toBe(rule.name);
    });

    test('should list rules with filters', async () => {
      const rule1 = await automationEngine.createRule({
        ...sampleRule,
        name: 'Enabled Rule',
        enabled: true
      });

      const rule2 = await automationEngine.createRule({
        ...sampleRule,
        name: 'Disabled Rule',
        enabled: false,
        projectKeys: ['OTHER']
      });

      // Test enabled filter
      const enabledRules = automationEngine.getRules({ enabled: true });
      expect(enabledRules).toHaveLength(1);
      expect(enabledRules[0].id).toBe(rule1.id);

      // Test project filter
      const testProjectRules = automationEngine.getRules({ projectKey: 'TEST' });
      expect(testProjectRules).toHaveLength(1);
      expect(testProjectRules[0].id).toBe(rule1.id);

      // Test trigger type filter
      const issueCreatedRules = automationEngine.getRules({ 
        triggerType: TriggerType.ISSUE_CREATED 
      });
      expect(issueCreatedRules).toHaveLength(2);
    });
  });

  describe('Rule Execution', () => {
    let testRule: AutomationRule;

    beforeEach(async () => {
      testRule = await automationEngine.createRule({
        name: 'Test Execution Rule',
        description: 'Rule for testing execution',
        enabled: true,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: {
            comment: 'Test comment from automation'
          },
          order: 1
        }],
        createdBy: 'test-user'
      });

      // Mock JIRA API calls
      mockJiraClient.post.mockResolvedValue({ id: '12345' });
    });

    test('should execute a rule manually', async () => {
      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(testRule.id, context);

      expect(execution).toBeDefined();
      expect(execution.ruleId).toBe(testRule.id);
      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.context).toEqual(context);
      expect(execution.results).toHaveLength(1);
      expect(execution.results[0].status).toBe('success');
    });

    test('should handle execution errors gracefully', async () => {
      // Mock API failure
      mockJiraClient.post.mockRejectedValue(new Error('API Error'));

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(testRule.id, context);

      expect(execution.status).toBe(ExecutionStatus.FAILED);
      expect(execution.error).toBeDefined();
      expect(execution.results).toHaveLength(1);
      expect(execution.results[0].status).toBe('failed');
    });

    test('should continue execution when continueOnError is true', async () => {
      const ruleWithMultipleActions = await automationEngine.createRule({
        name: 'Multi-Action Rule',
        description: 'Rule with multiple actions',
        enabled: true,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'First comment' },
            order: 1,
            continueOnError: true
          },
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'Second comment' },
            order: 2
          }
        ],
        createdBy: 'test-user'
      });

      // Mock first call to fail, second to succeed
      mockJiraClient.post
        .mockRejectedValueOnce(new Error('First action failed'))
        .mockResolvedValueOnce({ id: '12345' });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(ruleWithMultipleActions.id, context);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.results).toHaveLength(2);
      expect(execution.results[0].status).toBe('failed');
      expect(execution.results[1].status).toBe('success');
    });

    test('should stop execution when continueOnError is false', async () => {
      const ruleWithMultipleActions = await automationEngine.createRule({
        name: 'Multi-Action Rule',
        description: 'Rule with multiple actions',
        enabled: true,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'First comment' },
            order: 1,
            continueOnError: false
          },
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'Second comment' },
            order: 2
          }
        ],
        createdBy: 'test-user'
      });

      // Mock first call to fail
      mockJiraClient.post.mockRejectedValue(new Error('First action failed'));

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(ruleWithMultipleActions.id, context);

      expect(execution.status).toBe(ExecutionStatus.FAILED);
      expect(execution.results).toHaveLength(1);
      expect(execution.results[0].status).toBe('failed');
    });

    test('should throw error for non-existent rule', async () => {
      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      await expect(automationEngine.executeRule('non-existent-id', context))
        .rejects.toThrow('Rule not found');
    });

    test('should throw error for disabled rule', async () => {
      const disabledRule = await automationEngine.createRule({
        name: 'Disabled Rule',
        description: 'This rule is disabled',
        enabled: false,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: { comment: 'Test comment' },
          order: 1
        }],
        createdBy: 'test-user'
      });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      await expect(automationEngine.executeRule(disabledRule.id, context))
        .rejects.toThrow('Rule is disabled');
    });
  });

  describe('Execution History', () => {
    let testRule: AutomationRule;

    beforeEach(async () => {
      testRule = await automationEngine.createRule({
        name: 'History Test Rule',
        description: 'Rule for testing execution history',
        enabled: true,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: { comment: 'Test comment' },
          order: 1
        }],
        createdBy: 'test-user'
      });

      mockJiraClient.post.mockResolvedValue({ id: '12345' });
    });

    test('should track execution history', async () => {
      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      // Execute rule multiple times
      await automationEngine.executeRule(testRule.id, context);
      await automationEngine.executeRule(testRule.id, context);

      const executions = automationEngine.getExecutions();
      expect(executions).toHaveLength(2);
      expect(executions[0].ruleId).toBe(testRule.id);
      expect(executions[1].ruleId).toBe(testRule.id);
    });

    test('should filter executions by rule ID', async () => {
      const anotherRule = await automationEngine.createRule({
        name: 'Another Rule',
        description: 'Another rule for testing',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };

      await automationEngine.executeRule(testRule.id, context);
      await automationEngine.executeRule(anotherRule.id, context);

      const testRuleExecutions = automationEngine.getExecutions({ ruleId: testRule.id });
      expect(testRuleExecutions).toHaveLength(1);
      expect(testRuleExecutions[0].ruleId).toBe(testRule.id);
    });

    test('should filter executions by status', async () => {
      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };

      // Successful execution
      await automationEngine.executeRule(testRule.id, context);

      // Failed execution
      mockJiraClient.post.mockRejectedValueOnce(new Error('API Error'));
      await automationEngine.executeRule(testRule.id, context);

      const completedExecutions = automationEngine.getExecutions({ 
        status: ExecutionStatus.COMPLETED 
      });
      const failedExecutions = automationEngine.getExecutions({ 
        status: ExecutionStatus.FAILED 
      });

      expect(completedExecutions).toHaveLength(1);
      expect(failedExecutions).toHaveLength(1);
    });

    test('should limit execution results', async () => {
      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };

      // Execute rule multiple times
      for (let i = 0; i < 5; i++) {
        await automationEngine.executeRule(testRule.id, context);
      }

      const limitedExecutions = automationEngine.getExecutions({ limit: 3 });
      expect(limitedExecutions).toHaveLength(3);
    });
  });

  describe('Metrics', () => {
    let testRule: AutomationRule;

    beforeEach(async () => {
      testRule = await automationEngine.createRule({
        name: 'Metrics Test Rule',
        description: 'Rule for testing metrics',
        enabled: true,
        triggers: [{
          type: TriggerType.MANUAL,
          config: {}
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: { comment: 'Test comment' },
          order: 1
        }],
        createdBy: 'test-user'
      });
    });

    test('should track execution metrics', async () => {
      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };

      // Successful executions
      mockJiraClient.post.mockResolvedValue({ id: '12345' });
      await automationEngine.executeRule(testRule.id, context);
      await automationEngine.executeRule(testRule.id, context);

      // Failed execution
      mockJiraClient.post.mockRejectedValueOnce(new Error('API Error'));
      await automationEngine.executeRule(testRule.id, context);

      const metrics = automationEngine.getMetrics(testRule.id);
      expect(metrics).toHaveLength(1);
      
      const ruleMetrics = metrics[0];
      expect(ruleMetrics.ruleId).toBe(testRule.id);
      expect(ruleMetrics.executionCount).toBe(3);
      expect(ruleMetrics.successRate).toBeCloseTo(66.67, 1); // 2/3 * 100
      expect(ruleMetrics.averageDuration).toBeGreaterThan(0);
      expect(ruleMetrics.lastExecution).toBeDefined();
      expect(Object.keys(ruleMetrics.failureReasons)).toHaveLength(1);
    });

    test('should get metrics for all rules', async () => {
      const anotherRule = await automationEngine.createRule({
        name: 'Another Metrics Rule',
        description: 'Another rule for metrics testing',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };
      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      await automationEngine.executeRule(testRule.id, context);
      await automationEngine.executeRule(anotherRule.id, context);

      const allMetrics = automationEngine.getMetrics();
      expect(allMetrics).toHaveLength(2);
      
      const ruleIds = allMetrics.map(m => m.ruleId);
      expect(ruleIds).toContain(testRule.id);
      expect(ruleIds).toContain(anotherRule.id);
    });
  });

  describe('Rule Validation', () => {
    test('should validate a valid rule', async () => {
      const validRule: AutomationRule = {
        id: 'test-id',
        name: 'Valid Rule',
        description: 'A valid automation rule',
        enabled: true,
        projectKeys: ['TEST'],
        triggers: [{
          type: TriggerType.ISSUE_CREATED,
          config: {
            projectKeys: ['TEST'],
            issueTypes: ['Task']
          }
        }],
        actions: [{
          type: ActionType.ADD_COMMENT,
          config: {
            comment: 'Welcome!'
          },
          order: 1
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        executionCount: 0,
        failureCount: 0
      };

      const validation = await automationEngine.validateRule(validRule);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect validation errors', async () => {
      const invalidRule: AutomationRule = {
        id: 'test-id',
        name: '', // Invalid: empty name
        description: 'A' + 'x'.repeat(1000), // Invalid: too long
        enabled: true,
        projectKeys: [],
        triggers: [], // Invalid: no triggers
        actions: [], // Invalid: no actions
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        executionCount: 0,
        failureCount: 0
      };

      const validation = await automationEngine.validateRule(invalidRule);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup old executions', async () => {
      const testRule = await automationEngine.createRule({
        name: 'Cleanup Test Rule',
        description: 'Rule for testing cleanup',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = { issueKey: 'TEST-123', projectKey: 'TEST', userId: 'user-123' };
      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      await automationEngine.executeRule(testRule.id, context);

      // Manually set old date for testing
      const executions = automationEngine.getExecutions();
      const execution = executions[0];
      execution.triggeredAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

      await automationEngine.cleanup();

      const remainingExecutions = automationEngine.getExecutions();
      expect(remainingExecutions).toHaveLength(0);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const testRule = await automationEngine.createRule({
        name: 'Shutdown Test Rule',
        description: 'Rule for testing shutdown',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      await expect(automationEngine.shutdown()).resolves.not.toThrow();
    });
  });
});
