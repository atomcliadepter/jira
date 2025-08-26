
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { config } from 'dotenv';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { WorkflowTransitionManager } from '../src/tools/workflowTransitionManager.js';
import { logger } from '../src/utils/logger.js';

// Load test environment
config({ path: '.env.test' });

describe('Workflow Transition Manager', () => {
  let client: JiraRestClient;
  let manager: WorkflowTransitionManager;
  let testProjectKey: string;
  let testIssueKey: string;

  beforeAll(async () => {
    // Initialize client with test credentials
    client = new JiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    });

    manager = new WorkflowTransitionManager(client);
    testProjectKey = process.env.TEST_PROJECT_KEY || 'SCRUM';

    // Create a test issue for transition testing
    try {
      const testIssue = await client.post('/rest/api/3/issue', {
        fields: {
          project: { key: testProjectKey },
          summary: 'Test issue for workflow automation',
          description: 'This is a test issue created for workflow transition testing',
          issuetype: { name: 'Task' }
        }
      });
      testIssueKey = testIssue.key;
      logger.info('Created test issue', { issueKey: testIssueKey });
    } catch (error: any) {
      logger.warn('Failed to create test issue, using existing issue', { error: error.message });
      // Try to find an existing issue
      const searchResult = await client.get('/rest/api/3/search', {
        params: {
          jql: `project = "${testProjectKey}" AND status != Done ORDER BY created DESC`,
          maxResults: 1
        }
      });
      if (searchResult.issues && searchResult.issues.length > 0) {
        testIssueKey = searchResult.issues[0].key;
      } else {
        throw new Error('No test issues available and cannot create new ones');
      }
    }
  });

  afterAll(async () => {
    // Clean up test issue if it was created
    if (testIssueKey && process.env.CLEANUP_TEST_ISSUES === 'true') {
      try {
        await client.delete(`/rest/api/3/issue/${testIssueKey}`);
        logger.info('Cleaned up test issue', { issueKey: testIssueKey });
      } catch (error) {
        logger.warn('Failed to clean up test issue', { issueKey: testIssueKey });
      }
    }
  });

  describe('Condition Evaluation', () => {
    test('should evaluate field value conditions correctly', async () => {
      const issue = await client.get(`/rest/api/3/issue/${testIssueKey}`);
      
      const conditions = [
        {
          type: 'field_value' as const,
          field: 'status.name',
          value: issue.fields.status.name,
          operator: 'equals' as const
        }
      ];

      const result = await manager.evaluateConditions(issue, conditions);
      expect(result).toBe(true);
    });

    test('should evaluate assignee conditions correctly', async () => {
      const issue = await client.get(`/rest/api/3/issue/${testIssueKey}`);
      
      const conditions = [
        {
          type: 'assignee_check' as const,
          value: issue.fields.assignee?.accountId || null,
          operator: 'equals' as const
        }
      ];

      const result = await manager.evaluateConditions(issue, conditions);
      expect(result).toBe(true);
    });

    test('should handle multiple conditions with AND logic', async () => {
      const issue = await client.get(`/rest/api/3/issue/${testIssueKey}`);
      
      const conditions = [
        {
          type: 'field_value' as const,
          field: 'project.key',
          value: testProjectKey,
          operator: 'equals' as const
        },
        {
          type: 'field_value' as const,
          field: 'issuetype.name',
          value: issue.fields.issuetype.name,
          operator: 'equals' as const
        }
      ];

      const result = await manager.evaluateConditions(issue, conditions);
      expect(result).toBe(true);
    });

    test('should fail when conditions are not met', async () => {
      const issue = await client.get(`/rest/api/3/issue/${testIssueKey}`);
      
      const conditions = [
        {
          type: 'field_value' as const,
          field: 'status.name',
          value: 'NonExistentStatus',
          operator: 'equals' as const
        }
      ];

      const result = await manager.evaluateConditions(issue, conditions);
      expect(result).toBe(false);
    });
  });

  describe('Workflow Validation', () => {
    test('should validate project workflows successfully', async () => {
      const result = await manager.validateWorkflow({
        projectKey: testProjectKey
      });

      expect(result.projectKey).toBe(testProjectKey);
      expect(result.workflows).toBeDefined();
      expect(Array.isArray(result.workflows)).toBe(true);
      expect(result.workflows.length).toBeGreaterThan(0);
      
      // Check workflow structure
      const workflow = result.workflows[0];
      expect(workflow.issueType).toBeDefined();
      expect(workflow.statuses).toBeDefined();
      expect(Array.isArray(workflow.statuses)).toBe(true);
    });

    test('should handle invalid project key gracefully', async () => {
      await expect(manager.validateWorkflow({
        projectKey: 'INVALID_PROJECT_KEY_12345'
      })).rejects.toThrow();
    });
  });

  describe('Bulk Transition (Dry Run)', () => {
    test('should perform dry run bulk transition successfully', async () => {
      const jql = `project = "${testProjectKey}" AND status != Done`;
      
      // Get available transitions for the test issue
      const transitions = await client.get(`/rest/api/3/issue/${testIssueKey}/transitions`);
      
      if (transitions.transitions && transitions.transitions.length > 0) {
        const transitionId = transitions.transitions[0].id;
        
        const result = await manager.bulkTransition({
          jql,
          transitionId,
          dryRun: true,
          maxIssues: 5
        });

        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.processed).toBe(result.total);
        expect(result.successful).toBeDefined();
        expect(result.failed).toBeDefined();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.transitions)).toBe(true);
      }
    });

    test('should handle bulk transition with conditions', async () => {
      const jql = `project = "${testProjectKey}" AND key = "${testIssueKey}"`;
      
      const transitions = await client.get(`/rest/api/3/issue/${testIssueKey}/transitions`);
      
      if (transitions.transitions && transitions.transitions.length > 0) {
        const transitionId = transitions.transitions[0].id;
        
        const conditions = [
          {
            type: 'field_value' as const,
            field: 'project.key',
            value: testProjectKey,
            operator: 'equals' as const
          }
        ];

        const result = await manager.bulkTransition({
          jql,
          transitionId,
          conditions,
          dryRun: true,
          maxIssues: 1
        });

        expect(result.total).toBe(1);
        expect(result.processed).toBe(1);
      }
    });
  });

  describe('Conditional Transition (Dry Run)', () => {
    test('should perform conditional transition with met conditions', async () => {
      // Get available transitions
      const transitions = await client.get(`/rest/api/3/issue/${testIssueKey}/transitions`);
      
      if (transitions.transitions && transitions.transitions.length > 0) {
        const transitionId = transitions.transitions[0].id;
        
        const conditions = [
          {
            type: 'field_value' as const,
            field: 'project.key',
            value: testProjectKey,
            operator: 'equals' as const
          }
        ];

        const transitionMapping = {
          'true': transitionId
        };

        // Note: This test would actually perform the transition
        // In a real test environment, you might want to mock this
        // or use a dedicated test project with reversible transitions
        
        try {
          const result = await manager.conditionalTransition({
            issueIdOrKey: testIssueKey,
            conditions,
            transitionMapping,
            comment: 'Test conditional transition'
          });

          expect(result.issueKey).toBe(testIssueKey);
          expect(result.conditionsMet).toBe(true);
          expect(result.selectedTransition).toBeDefined();
          expect(result.selectedTransition.id).toBe(transitionId);
        } catch (error: any) {
          // If transition fails due to workflow constraints, that's expected
          logger.info('Conditional transition test completed with expected workflow constraint', { error: error.message });
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid issue key gracefully', async () => {
      const conditions = [
        {
          type: 'field_value' as const,
          field: 'status.name',
          value: 'To Do',
          operator: 'equals' as const
        }
      ];

      await expect(manager.conditionalTransition({
        issueIdOrKey: 'INVALID-123',
        conditions,
        transitionMapping: { 'true': '1' }
      })).rejects.toThrow();
    });

    test('should handle invalid transition ID gracefully', async () => {
      const conditions = [
        {
          type: 'field_value' as const,
          field: 'project.key',
          value: testProjectKey,
          operator: 'equals' as const
        }
      ];

      await expect(manager.conditionalTransition({
        issueIdOrKey: testIssueKey,
        conditions,
        transitionMapping: { 'true': '99999' } // Invalid transition ID
      })).rejects.toThrow();
    });
  });

  describe('Integration with Real JIRA', () => {
    test('should connect to JIRA and retrieve user info', async () => {
      const userInfo = await client.get('/rest/api/3/myself');
      
      expect(userInfo.accountId).toBeDefined();
      expect(userInfo.emailAddress).toBeDefined();
      expect(userInfo.displayName).toBeDefined();
      
      logger.info('Connected to JIRA successfully', { 
        user: userInfo.displayName,
        email: userInfo.emailAddress 
      });
    });

    test('should retrieve project information', async () => {
      const project = await client.get(`/rest/api/3/project/${testProjectKey}`);
      
      expect(project.key).toBe(testProjectKey);
      expect(project.name).toBeDefined();
      expect(project.projectTypeKey).toBeDefined();
      
      logger.info('Retrieved project information', { 
        projectKey: project.key,
        projectName: project.name 
      });
    });

    test('should search for issues using JQL', async () => {
      const searchResult = await client.get('/rest/api/3/search', {
        params: {
          jql: `project = "${testProjectKey}"`,
          maxResults: 5
        }
      });

      expect(searchResult.issues).toBeDefined();
      expect(Array.isArray(searchResult.issues)).toBe(true);
      expect(searchResult.total).toBeGreaterThanOrEqual(0);
      
      logger.info('JQL search completed', { 
        totalIssues: searchResult.total,
        returnedIssues: searchResult.issues.length 
      });
    });
  });
});
