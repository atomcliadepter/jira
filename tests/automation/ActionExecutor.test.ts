
/**
 * Tests for ActionExecutor
 */

import { ActionExecutor } from '../../src/automation/ActionExecutor.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import {
  ActionType,
  ExecutionContext
} from '../../src/automation/types.js';

// Mock JiraRestClient
jest.mock('../../src/http/JiraRestClient.js');

// Mock fetch for webhook calls
global.fetch = jest.fn();

describe('ActionExecutor', () => {
  let actionExecutor: ActionExecutor;
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockJiraClient = new JiraRestClient({
      baseURL: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<JiraRestClient>;

    actionExecutor = new ActionExecutor(mockJiraClient);

    // Reset fetch mock
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  const createContext = (): ExecutionContext => ({
    issueKey: 'TEST-123',
    projectKey: 'TEST',
    userId: 'user-123'
  });

  describe('Update Issue Action', () => {
    test('should update issue fields', async () => {
      const action = {
        type: ActionType.UPDATE_ISSUE,
        config: {
          fields: {
            priority: { name: 'High' },
            labels: ['automated']
          }
        },
        order: 1
      };

      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.actionType).toBe(ActionType.UPDATE_ISSUE);
      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123',
        { fields: action.config.fields }
      );
    });

    test('should fail without issue key', async () => {
      const action = {
        type: ActionType.UPDATE_ISSUE,
        config: {
          fields: { priority: { name: 'High' } }
        },
        order: 1
      };

      const context = { ...createContext(), issueKey: undefined };

      const result = await actionExecutor.executeAction(action, context);

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Issue key is required');
    });

    test('should fail without fields', async () => {
      const action = {
        type: ActionType.UPDATE_ISSUE,
        config: {},
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Fields are required');
    });
  });

  describe('Transition Issue Action', () => {
    test('should transition issue by ID', async () => {
      const action = {
        type: ActionType.TRANSITION_ISSUE,
        config: {
          transitionId: '31'
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/transitions',
        { transition: { id: '31' } }
      );
    });

    test('should transition issue by name', async () => {
      const action = {
        type: ActionType.TRANSITION_ISSUE,
        config: {
          transitionName: 'Done'
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({
        transitions: [
          { id: '31', name: 'Done' },
          { id: '21', name: 'In Progress' }
        ]
      });
      mockJiraClient.post.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(mockJiraClient.get).toHaveBeenCalledWith('/rest/api/3/issue/TEST-123/transitions');
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/transitions',
        { transition: { id: '31' } }
      );
    });

    test('should fail with invalid transition name', async () => {
      const action = {
        type: ActionType.TRANSITION_ISSUE,
        config: {
          transitionName: 'Invalid Transition'
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({
        transitions: [
          { id: '31', name: 'Done' },
          { id: '21', name: 'In Progress' }
        ]
      });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Transition \'Invalid Transition\' not found');
    });
  });

  describe('Create Issue Action', () => {
    test('should create new issue', async () => {
      const action = {
        type: ActionType.CREATE_ISSUE,
        config: {
          projectKey: 'TEST',
          issueType: 'Task',
          summary: 'Automated issue',
          description: 'Created by automation'
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({
        key: 'TEST-456',
        id: '12345'
      });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        issueKey: 'TEST-456',
        issueId: '12345'
      });
      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/issue', {
        fields: {
          project: { key: 'TEST' },
          issuetype: { name: 'Task' },
          summary: 'Automated issue',
          description: 'Created by automation'
        }
      });
    });

    test('should fail without required fields', async () => {
      const action = {
        type: ActionType.CREATE_ISSUE,
        config: {
          summary: 'Missing project and issue type'
        },
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Project key, issue type, and summary are required');
    });
  });

  describe('Add Comment Action', () => {
    test('should add comment to issue', async () => {
      const action = {
        type: ActionType.ADD_COMMENT,
        config: {
          comment: 'This is an automated comment'
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({ id: '67890' });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        issueKey: 'TEST-123',
        commentId: '67890'
      });
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/comment',
        { body: 'This is an automated comment' }
      );
    });

    test('should add internal comment', async () => {
      const action = {
        type: ActionType.ADD_COMMENT,
        config: {
          comment: 'Internal comment',
          visibility: 'internal' as const
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({ id: '67890' });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(mockJiraClient.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/comment',
        {
          body: 'Internal comment',
          visibility: {
            type: 'role',
            value: 'Administrators'
          }
        }
      );
    });
  });

  describe('Assign Issue Action', () => {
    test('should assign issue by account ID', async () => {
      const action = {
        type: ActionType.ASSIGN_ISSUE,
        config: {
          assigneeId: 'account-123'
        },
        order: 1
      };

      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/assignee',
        { assignee: { accountId: 'account-123' } }
      );
    });

    test('should assign issue by email', async () => {
      const action = {
        type: ActionType.ASSIGN_ISSUE,
        config: {
          assigneeEmail: 'user@example.com'
        },
        order: 1
      };

      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/assignee',
        { assignee: { emailAddress: 'user@example.com' } }
      );
    });

    test('should unassign issue', async () => {
      const action = {
        type: ActionType.ASSIGN_ISSUE,
        config: {},
        order: 1
      };

      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.message).toContain('unassigned');
      expect(mockJiraClient.put).toHaveBeenCalledWith(
        '/rest/api/3/issue/TEST-123/assignee',
        { assignee: null }
      );
    });
  });

  describe('Send Notification Action', () => {
    test('should send notification', async () => {
      const action = {
        type: ActionType.SEND_NOTIFICATION,
        config: {
          recipients: ['user1@example.com', 'user2@example.com'],
          subject: 'Test notification',
          message: 'This is a test notification'
        },
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.message).toContain('Notification sent to 2 recipients');
      expect(result.data).toEqual({
        recipients: ['user1@example.com', 'user2@example.com'],
        channel: 'email'
      });
    });

    test('should fail without recipients', async () => {
      const action = {
        type: ActionType.SEND_NOTIFICATION,
        config: {
          message: 'Test message'
        },
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Recipients are required');
    });
  });

  describe('Webhook Call Action', () => {
    test('should make successful webhook call', async () => {
      const action = {
        type: ActionType.WEBHOOK_CALL,
        config: {
          url: 'https://example.com/webhook',
          method: 'POST' as const,
          headers: { 'X-Custom': 'value' },
          payload: { message: 'test' }
        },
        order: 1
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve('Success')
      } as Response);

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        url: 'https://example.com/webhook',
        method: 'POST',
        statusCode: 200,
        response: 'Success'
      });
      expect(fetch).toHaveBeenCalledWith('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value'
        },
        body: JSON.stringify({ message: 'test' })
      });
    });

    test('should handle webhook call failure', async () => {
      const action = {
        type: ActionType.WEBHOOK_CALL,
        config: {
          url: 'https://example.com/webhook'
        },
        order: 1
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Webhook call failed: 500');
    });

    test('should fail without URL', async () => {
      const action = {
        type: ActionType.WEBHOOK_CALL,
        config: {},
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('URL is required');
    });
  });

  describe('Bulk Operation Action', () => {
    test('should execute bulk operation', async () => {
      const action = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = TEST AND status = "To Do"',
          batchSize: 2,
          maxIssues: 10,
          fields: {
            priority: { name: 'High' }
          }
        },
        order: 1
      };

      // Mock search response
      mockJiraClient.get.mockResolvedValue({
        issues: [
          { key: 'TEST-1', summary: 'Issue 1' },
          { key: 'TEST-2', summary: 'Issue 2' },
          { key: 'TEST-3', summary: 'Issue 3' }
        ]
      });

      // Mock update responses
      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data.processedCount).toBe(3);
      expect(result.data.successCount).toBe(3);
      expect(result.data.failureCount).toBe(0);
      expect(mockJiraClient.put).toHaveBeenCalledTimes(3);
    });

    test('should handle partial failures in bulk operation', async () => {
      const action = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = TEST',
          fields: { priority: { name: 'High' } }
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({
        issues: [
          { key: 'TEST-1', summary: 'Issue 1' },
          { key: 'TEST-2', summary: 'Issue 2' }
        ]
      });

      // First update succeeds, second fails
      mockJiraClient.put
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Update failed'));

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.data.successCount).toBe(1);
      expect(result.data.failureCount).toBe(1);
      expect(result.data.errors).toHaveLength(1);
    });

    test('should handle empty search results', async () => {
      const action = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = EMPTY'
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({ issues: [] });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.message).toContain('No issues found');
      expect(result.data.processedCount).toBe(0);
    });
  });

  describe('Create Subtask Action', () => {
    test('should create subtask', async () => {
      const action = {
        type: ActionType.CREATE_SUBTASK,
        config: {
          summary: 'Automated subtask',
          description: 'Created by automation'
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({
        fields: {
          project: { key: 'TEST' }
        }
      });

      mockJiraClient.post.mockResolvedValue({
        key: 'TEST-456',
        id: '12345'
      });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        subtaskKey: 'TEST-456',
        subtaskId: '12345',
        parentKey: 'TEST-123'
      });
    });

    test('should create subtask with custom parent', async () => {
      const action = {
        type: ActionType.CREATE_SUBTASK,
        config: {
          parentIssueKey: 'TEST-999',
          summary: 'Subtask with custom parent'
        },
        order: 1
      };

      mockJiraClient.get.mockResolvedValue({
        fields: {
          project: { key: 'TEST' }
        }
      });

      mockJiraClient.post.mockResolvedValue({
        key: 'TEST-456',
        id: '12345'
      });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data.parentKey).toBe('TEST-999');
      expect(mockJiraClient.get).toHaveBeenCalledWith('/rest/api/3/issue/TEST-999?fields=project');
    });
  });

  describe('Link Issues Action', () => {
    test('should link issues', async () => {
      const action = {
        type: ActionType.LINK_ISSUES,
        config: {
          targetIssueKey: 'TEST-456',
          linkType: 'Blocks'
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        sourceIssue: 'TEST-123',
        targetIssue: 'TEST-456',
        linkType: 'Blocks'
      });
      expect(mockJiraClient.post).toHaveBeenCalledWith('/rest/api/3/issueLink', {
        type: { name: 'Blocks' },
        inwardIssue: { key: 'TEST-123' },
        outwardIssue: { key: 'TEST-456' }
      });
    });
  });

  describe('Update Custom Field Action', () => {
    test('should update custom field', async () => {
      const action = {
        type: ActionType.UPDATE_CUSTOM_FIELD,
        config: {
          customFieldId: 'customfield_10001',
          customFieldValue: 'Custom value'
        },
        order: 1
      };

      mockJiraClient.put.mockResolvedValue({});

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('success');
      expect(result.data).toEqual({
        issueKey: 'TEST-123',
        fieldId: 'customfield_10001',
        value: 'Custom value'
      });
      expect(mockJiraClient.put).toHaveBeenCalledWith('/rest/api/3/issue/TEST-123', {
        fields: {
          customfield_10001: 'Custom value'
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported action type', async () => {
      const action = {
        type: 'UNSUPPORTED_ACTION' as ActionType,
        config: {},
        order: 1
      };

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toContain('Unsupported action type');
    });

    test('should handle JIRA API errors', async () => {
      const action = {
        type: ActionType.UPDATE_ISSUE,
        config: {
          fields: { priority: { name: 'High' } }
        },
        order: 1
      };

      mockJiraClient.put.mockRejectedValue(new Error('JIRA API Error'));

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.status).toBe('failed');
      expect(result.message).toBe('JIRA API Error');
    });

    test('should measure execution duration', async () => {
      const action = {
        type: ActionType.ADD_COMMENT,
        config: {
          comment: 'Test comment'
        },
        order: 1
      };

      mockJiraClient.post.mockResolvedValue({ id: '12345' });

      const result = await actionExecutor.executeAction(action, createContext());

      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
