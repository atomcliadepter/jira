
/**
 * Integration tests for Automation Engine
 */

import { AutomationEngine } from '../../src/automation/AutomationEngine.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import {
  TriggerType,
  ActionType,
  ExecutionStatus
} from '../../src/automation/types.js';

// Mock JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

// Mock fetch for webhook calls
global.fetch = jest.fn();

describe('Automation Engine Integration Tests', () => {
  let automationEngine: AutomationEngine;
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockJiraClient = new JiraRestClient({
      baseURL: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    automationEngine = new AutomationEngine(mockJiraClient);

    // Reset mocks
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(async () => {
    await automationEngine.shutdown();
  });

  describe('End-to-End Workflow', () => {
    test('should create and execute a complete automation workflow', async () => {
      // Create a rule that adds a comment and transitions an issue
      const rule = await automationEngine.createRule({
        name: 'Welcome New Issues',
        description: 'Welcomes new issues and moves them to In Progress',
        enabled: true,
        projectKeys: ['TEST'],
        triggers: [{
          type: TriggerType.ISSUE_CREATED,
          config: {
            projectKeys: ['TEST'],
            issueTypes: ['Task', 'Bug']
          }
        }],
        actions: [
          {
            type: ActionType.ADD_COMMENT,
            config: {
              comment: 'Welcome! This issue has been automatically processed.'
            },
            order: 1
          },
          {
            type: ActionType.TRANSITION_ISSUE,
            config: {
              transitionName: 'Start Progress'
            },
            order: 2
          },
          {
            type: ActionType.ASSIGN_ISSUE,
            config: {
              assigneeEmail: 'auto-assign@example.com'
            },
            order: 3
          }
        ],
        createdBy: 'test-user'
      });

      expect(rule).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.triggers).toHaveLength(1);
      expect(rule.actions).toHaveLength(3);

      // Mock JIRA API responses
      mockJiraClient.post.mockResolvedValueOnce({ id: '12345' }); // Add comment
      mockJiraClient.get.mockResolvedValueOnce({
        transitions: [
          { id: '31', name: 'Start Progress' },
          { id: '21', name: 'Done' }
        ]
      }); // Get transitions
      mockJiraClient.post.mockResolvedValueOnce({}); // Transition issue
      mockJiraClient.put.mockResolvedValueOnce({}); // Assign issue

      // Execute the rule
      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(rule.id, context);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.results).toHaveLength(3);
      expect(execution.results[0].status).toBe('success'); // Comment added
      expect(execution.results[1].status).toBe('success'); // Issue transitioned
      expect(execution.results[2].status).toBe('success'); // Issue assigned

      // Verify API calls
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/comment',
        { body: 'Welcome! This issue has been automatically processed.' }
      );
      expect(mockJiraClient.get).toHaveBeenCalledWith('/rest/api/3/issue/TEST-123/transitions');
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/transitions',
        { transition: { id: '31' } }
      );
      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/assignee',
        { assignee: { emailAddress: 'auto-assign@example.com' } }
      );
    });

    test('should handle partial failures gracefully', async () => {
      const rule = await automationEngine.createRule({
        name: 'Partial Failure Test',
        description: 'Tests partial failure handling',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
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
            order: 2,
            continueOnError: true
          },
          {
            type: ActionType.UPDATE_ISSUE,
            config: { fields: { priority: { name: 'High' } } },
            order: 3
          }
        ],
        createdBy: 'test-user'
      });

      // Mock responses: first succeeds, second fails, third succeeds
      mockJiraClient.post
        .mockResolvedValueOnce({ id: '12345' })
        .mockRejectedValueOnce(new Error('Comment failed'));
      mockJiraClient.put.mockResolvedValueOnce({});

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(rule.id, context);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.results).toHaveLength(3);
      expect(execution.results[0].status).toBe('success');
      expect(execution.results[1].status).toBe('failed');
      expect(execution.results[2].status).toBe('success');
    });

    test('should stop execution on critical failure', async () => {
      const rule = await automationEngine.createRule({
        name: 'Critical Failure Test',
        description: 'Tests critical failure handling',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'First comment' },
            order: 1,
            continueOnError: false // Critical action
          },
          {
            type: ActionType.ADD_COMMENT,
            config: { comment: 'Second comment' },
            order: 2
          }
        ],
        createdBy: 'test-user'
      });

      // Mock first action to fail
      mockJiraClient.post.mockRejectedValueOnce(new Error('Critical failure'));

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(rule.id, context);

      expect(execution.status).toBe(ExecutionStatus.FAILED);
      expect(execution.results).toHaveLength(1);
      expect(execution.results[0].status).toBe('failed');
      expect(execution.error).toContain('Critical failure');
    });
  });

  describe('Complex Automation Scenarios', () => {
    test('should handle bulk operations with notifications', async () => {
      const rule = await automationEngine.createRule({
        name: 'Bulk Update with Notification',
        description: 'Updates multiple issues and sends notification',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [
          {
            type: ActionType.BULK_OPERATION,
            config: {
              jql: 'project = TEST AND status = "To Do"',
              batchSize: 10,
              maxIssues: 100,
              fields: {
                priority: { name: 'High' }
              }
            },
            order: 1
          },
          {
            type: ActionType.SEND_NOTIFICATION,
            config: {
              recipients: ['manager@example.com'],
              subject: 'Bulk update completed',
              message: 'All issues have been updated to High priority'
            },
            order: 2
          }
        ],
        createdBy: 'test-user'
      });

      // Mock bulk operation
      mockJiraClient.get.mockResolvedValue({
        issues: [
          { key: 'TEST-1', summary: 'Issue 1' },
          { key: 'TEST-2', summary: 'Issue 2' },
          { key: 'TEST-3', summary: 'Issue 3' }
        ]
      });
      mockJiraClient.put.mockResolvedValue({});

      const context = {
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(rule.id, context);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.results).toHaveLength(2);
      expect(execution.results[0].status).toBe('success'); // Bulk operation
      expect(execution.results[1].status).toBe('success'); // Notification

      // Verify bulk updates
      expect(mockJiraClient.put).toHaveBeenCalledTimes(3);
      expect(mockJiraClient.put).toHaveBeenCalledWith('/rest/api/3/issue/TEST-1', {
        fields: { priority: { name: 'High' } }
      });
    });

    test('should handle webhook integration', async () => {
      const rule = await automationEngine.createRule({
        name: 'Webhook Integration',
        description: 'Calls external webhook and creates subtask',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [
          {
            type: ActionType.WEBHOOK_CALL,
            config: {
              url: 'https://external-system.com/api/notify',
              method: 'POST',
              headers: { 'Authorization': 'Bearer token123' },
              payload: {
                issueKey: '{{issue.key}}',
                action: 'automation_triggered'
              }
            },
            order: 1
          },
          {
            type: ActionType.CREATE_SUBTASK,
            config: {
              summary: 'Follow-up task created by automation',
              description: 'This subtask was created after webhook notification'
            },
            order: 2
          }
        ],
        createdBy: 'test-user'
      });

      // Mock webhook response
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('{"status": "received"}')
      } as Response);

      // Mock subtask creation
      mockJiraClient.get.mockResolvedValue({
        fields: { project: { key: 'TEST' } }
      });
      mockJiraClient.post.mockResolvedValue({
        key: 'TEST-456',
        id: '12345'
      });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      const execution = await automationEngine.executeRule(rule.id, context);

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);
      expect(execution.results).toHaveLength(2);
      expect(execution.results[0].status).toBe('success'); // Webhook call
      expect(execution.results[1].status).toBe('success'); // Subtask creation

      // Verify webhook call
      expect(fetch).toHaveBeenCalledWith('https://external-system.com/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        body: JSON.stringify({
          issueKey: 'TEST-123',
          action: 'automation_triggered'
        })
      });

      // Verify subtask creation
      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/issue', {
        fields: {
          project: { key: 'TEST' },
          parent: { key: 'TEST-123' },
          issuetype: { name: 'Sub-task' },
          summary: 'Follow-up task created by automation',
          description: 'This subtask was created after webhook notification'
        }
      });
    });
  });

  describe('Rule Management Integration', () => {
    test('should manage rule lifecycle', async () => {
      // Create rule
      const rule = await automationEngine.createRule({
        name: 'Lifecycle Test Rule',
        description: 'Testing rule lifecycle',
        enabled: false,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      expect(rule.enabled).toBe(false);

      // Update rule to enable it
      const updatedRule = await automationEngine.updateRule(rule.id, {
        enabled: true,
        description: 'Updated description'
      });

      expect(updatedRule.enabled).toBe(true);
      expect(updatedRule.description).toBe('Updated description');

      // Execute rule
      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      const execution = await automationEngine.executeRule(rule.id, {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      });

      expect(execution.status).toBe(ExecutionStatus.COMPLETED);

      // Check metrics
      const metrics = automationEngine.getMetrics(rule.id);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].executionCount).toBe(1);
      expect(metrics[0].successRate).toBe(100);

      // Delete rule
      await automationEngine.deleteRule(rule.id);

      const deletedRule = automationEngine.getRule(rule.id);
      expect(deletedRule).toBeUndefined();
    });

    test('should filter and search rules', async () => {
      // Create multiple rules
      const rule1 = await automationEngine.createRule({
        name: 'Enabled Rule',
        enabled: true,
        projectKeys: ['TEST'],
        triggers: [{ type: TriggerType.ISSUE_CREATED, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const rule2 = await automationEngine.createRule({
        name: 'Disabled Rule',
        enabled: false,
        projectKeys: ['OTHER'],
        triggers: [{ type: TriggerType.SCHEDULED, config: { cronExpression: '0 9 * * *' } }],
        actions: [{ type: ActionType.SEND_NOTIFICATION, config: { recipients: ['test@example.com'] }, order: 1 }],
        createdBy: 'test-user'
      });

      // Test filtering
      const enabledRules = automationEngine.getRules({ enabled: true });
      expect(enabledRules).toHaveLength(1);
      expect(enabledRules[0].id).toBe(rule1.id);

      const testProjectRules = automationEngine.getRules({ projectKey: 'TEST' });
      expect(testProjectRules).toHaveLength(1);
      expect(testProjectRules[0].id).toBe(rule1.id);

      const scheduledRules = automationEngine.getRules({ triggerType: TriggerType.SCHEDULED });
      expect(scheduledRules).toHaveLength(1);
      expect(scheduledRules[0].id).toBe(rule2.id);

      const allRules = automationEngine.getRules();
      expect(allRules).toHaveLength(2);
    });
  });

  describe('Execution History and Metrics', () => {
    test('should track execution history and generate metrics', async () => {
      const rule = await automationEngine.createRule({
        name: 'Metrics Test Rule',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      // Execute rule multiple times with different outcomes
      mockJiraClient.post.mockResolvedValueOnce({ id: '1' }); // Success
      await automationEngine.executeRule(rule.id, context);

      mockJiraClient.post.mockResolvedValueOnce({ id: '2' }); // Success
      await automationEngine.executeRule(rule.id, context);

      mockJiraClient.post.mockRejectedValueOnce(new Error('API Error')); // Failure
      await automationEngine.executeRule(rule.id, context);

      // Check execution history
      const executions = automationEngine.getExecutions({ ruleId: rule.id });
      expect(executions).toHaveLength(3);
      expect(executions.filter(e => e.status === ExecutionStatus.COMPLETED)).toHaveLength(2);
      expect(executions.filter(e => e.status === ExecutionStatus.FAILED)).toHaveLength(1);

      // Check metrics
      const metrics = automationEngine.getMetrics(rule.id);
      expect(metrics).toHaveLength(1);
      
      const ruleMetrics = metrics[0];
      expect(ruleMetrics.executionCount).toBe(3);
      expect(ruleMetrics.successRate).toBeCloseTo(66.67, 1);
      expect(ruleMetrics.averageDuration).toBeGreaterThan(0);
      expect(Object.keys(ruleMetrics.failureReasons)).toHaveLength(1);
      expect(ruleMetrics.failureReasons['API Error']).toBe(1);
    });

    test('should limit execution history', async () => {
      const rule = await automationEngine.createRule({
        name: 'History Limit Test',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      // Execute rule multiple times
      for (let i = 0; i < 10; i++) {
        await automationEngine.executeRule(rule.id, context);
      }

      // Test limit
      const limitedExecutions = automationEngine.getExecutions({ limit: 5 });
      expect(limitedExecutions).toHaveLength(5);

      const allExecutions = automationEngine.getExecutions();
      expect(allExecutions).toHaveLength(10);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle rule validation errors', async () => {
      const invalidRule = {
        name: '', // Invalid
        enabled: true,
        triggers: [], // Invalid
        actions: [], // Invalid
        createdBy: 'test-user'
      };

      await expect(automationEngine.createRule(invalidRule))
        .rejects.toThrow('Rule validation failed');
    });

    test('should handle execution of non-existent rule', async () => {
      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      await expect(automationEngine.executeRule('non-existent-id', context))
        .rejects.toThrow('Rule not found');
    });

    test('should handle execution of disabled rule', async () => {
      const rule = await automationEngine.createRule({
        name: 'Disabled Rule',
        enabled: false,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      await expect(automationEngine.executeRule(rule.id, context))
        .rejects.toThrow('Rule is disabled');
    });
  });

  describe('Cleanup and Shutdown', () => {
    test('should cleanup old data', async () => {
      const rule = await automationEngine.createRule({
        name: 'Cleanup Test',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      const context = {
        issueKey: 'TEST-123',
        projectKey: 'TEST',
        userId: 'user-123'
      };

      await automationEngine.executeRule(rule.id, context);

      // Verify execution exists
      let executions = automationEngine.getExecutions();
      expect(executions).toHaveLength(1);

      // Run cleanup (this would normally clean up old executions)
      await automationEngine.cleanup();

      // In a real scenario with old data, this would remove old executions
      // For this test, we just verify cleanup runs without error
    });

    test('should shutdown gracefully', async () => {
      const rule = await automationEngine.createRule({
        name: 'Shutdown Test',
        enabled: true,
        triggers: [{ type: TriggerType.MANUAL, config: {} }],
        actions: [{ type: ActionType.ADD_COMMENT, config: { comment: 'Test' }, order: 1 }],
        createdBy: 'test-user'
      });

      await expect(automationEngine.shutdown()).resolves.not.toThrow();
    });
  });
});
