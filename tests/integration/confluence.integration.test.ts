
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { ConfluenceService } from '../../src/services/ConfluenceService.js';
import { ConfluenceRestClient } from '../../src/http/ConfluenceRestClient.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import { ConfluenceAutomation } from '../../src/automation/ConfluenceAutomation.js';
import { executeConfluenceTool } from '../../src/tools/confluenceTools.js';

// Mock external dependencies for integration tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Confluence Integration Tests', () => {
  let confluenceService: ConfluenceService;
  let jiraClient: JiraRestClient;
  let confluenceAutomation: ConfluenceAutomation;

  // Mock configuration
  const mockConfig = {
    baseUrl: 'https://test.atlassian.net',
    email: 'test@example.com',
    apiToken: 'mock-token'
  };

  beforeAll(() => {
    // Initialize services with mock configuration
    const confluenceClient = new ConfluenceRestClient(mockConfig);
    confluenceService = new ConfluenceService(confluenceClient);
    
    jiraClient = new JiraRestClient(mockConfig);
    confluenceAutomation = new ConfluenceAutomation(confluenceService, jiraClient);
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete documentation workflow', async () => {
      // This test would normally require real API credentials
      // For now, we'll test the integration structure
      
      expect(confluenceService).toBeDefined();
      expect(jiraClient).toBeDefined();
      expect(confluenceAutomation).toBeDefined();
    });

    it('should integrate MCP tools with services', async () => {
      // Test that MCP tools can be executed with services
      const mockArgs = {
        title: 'Integration Test Page',
        spaceKey: 'TEST',
        content: '<p>Integration test content</p>'
      };

      // Mock the service method
      const mockPage = {
        id: '123456',
        title: 'Integration Test Page',
        space: { key: 'TEST' },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456'
        }
      };

      jest.spyOn(confluenceService, 'createPage').mockResolvedValue(mockPage as any);

      const result = await executeConfluenceTool(
        'confluence.page.create',
        mockArgs,
        confluenceService
      );

      expect(result.success).toBe(true);
      expect(result.page.id).toBe('123456');
    });
  });

  describe('Automation Integration', () => {
    it('should create and manage documentation rules', async () => {
      const ruleData = {
        name: 'Integration Test Rule',
        description: 'Test rule for integration testing',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {
            projectKeys: ['TEST']
          }
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      const rule = await confluenceAutomation.createRule(ruleData);
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Integration Test Rule');

      // Test rule retrieval
      const retrievedRule = confluenceAutomation.getRule(rule.id);
      expect(retrievedRule).toBeDefined();
      expect(retrievedRule?.name).toBe('Integration Test Rule');

      // Test rule update
      const updatedRule = await confluenceAutomation.updateRule(rule.id, {
        description: 'Updated description'
      });
      expect(updatedRule.description).toBe('Updated description');

      // Test rule deletion
      await confluenceAutomation.deleteRule(rule.id);
      const deletedRule = confluenceAutomation.getRule(rule.id);
      expect(deletedRule).toBeUndefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors gracefully', async () => {
      // Mock a service error
      jest.spyOn(confluenceService, 'createPage').mockRejectedValue(
        new Error('Space not found')
      );

      const mockArgs = {
        title: 'Error Test Page',
        spaceKey: 'NONEXISTENT',
        content: '<p>Test content</p>'
      };

      await expect(
        executeConfluenceTool('confluence.page.create', mockArgs, confluenceService)
      ).rejects.toThrow('Space not found');
    });

    it('should handle automation errors gracefully', async () => {
      const ruleData = {
        name: 'Error Test Rule',
        description: 'Rule that will cause errors',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {
            projectKeys: ['TEST']
          }
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'NONEXISTENT'
        }
      };

      const rule = await confluenceAutomation.createRule(ruleData);

      // Mock service error
      jest.spyOn(confluenceService, 'createDocumentationFromJiraIssue').mockRejectedValue(
        new Error('Space not found')
      );

      const mockEvent = {
        webhookEvent: 'jira:issue_created',
        issue: {
          key: 'TEST-123',
          fields: {
            project: { key: 'TEST' },
            issuetype: { name: 'Story' },
            summary: 'Test Issue'
          }
        }
      };

      await confluenceAutomation.processJiraEvent(mockEvent);

      // Check that execution was recorded as failed
      const executions = confluenceAutomation.getExecutions({ ruleId: rule.id });
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('failed');
      expect(executions[0].error).toBe('Space not found');
    });
  });
});
