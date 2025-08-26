
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfluenceAutomation, DocumentationRule } from '../../src/automation/ConfluenceAutomation.js';
import { ConfluenceService } from '../../src/services/ConfluenceService.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';

// Mock dependencies
jest.mock('../../src/services/ConfluenceService.js');
jest.mock('../../src/http/JiraRestClient.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ConfluenceAutomation', () => {
  let confluenceAutomation: ConfluenceAutomation;
  let mockConfluenceService: jest.Mocked<ConfluenceService>;
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockConfluenceService = {
      createDocumentationFromJiraIssue: jest.fn()
    } as any;

    mockJiraClient = {
      get: jest.fn()
    } as any;

    confluenceAutomation = new ConfluenceAutomation(mockConfluenceService, mockJiraClient);
  });

  describe('createRule', () => {
    it('should create a documentation rule successfully', async () => {
      const ruleData = {
        name: 'Auto Documentation',
        description: 'Automatically create documentation for new issues',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {
            projectKeys: ['TEST'],
            issueTypes: ['Story']
          }
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS',
          includeComments: false,
          includeAttachments: false
        }
      };

      const rule = await confluenceAutomation.createRule(ruleData);

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Auto Documentation');
      expect(rule.enabled).toBe(true);
      expect(rule.createdAt).toBeInstanceOf(Date);
      expect(rule.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateRule', () => {
    it('should update a documentation rule successfully', async () => {
      // First create a rule
      const ruleData = {
        name: 'Auto Documentation',
        description: 'Automatically create documentation for new issues',
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

      // Then update it
      const updates = {
        name: 'Updated Auto Documentation',
        enabled: false
      };

      const updatedRule = await confluenceAutomation.updateRule(rule.id, updates);

      expect(updatedRule.name).toBe('Updated Auto Documentation');
      expect(updatedRule.enabled).toBe(false);
      expect(updatedRule.updatedAt.getTime()).toBeGreaterThan(rule.updatedAt.getTime());
    });

    it('should throw error for non-existent rule', async () => {
      await expect(
        confluenceAutomation.updateRule('non-existent', { name: 'Updated' })
      ).rejects.toThrow('Documentation rule not found: non-existent');
    });
  });

  describe('deleteRule', () => {
    it('should delete a documentation rule successfully', async () => {
      // First create a rule
      const ruleData = {
        name: 'Auto Documentation',
        description: 'Test rule',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {}
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      const rule = await confluenceAutomation.createRule(ruleData);

      // Then delete it
      await confluenceAutomation.deleteRule(rule.id);

      // Verify it's deleted
      expect(confluenceAutomation.getRule(rule.id)).toBeUndefined();
    });
  });

  describe('getRules', () => {
    it('should return all rules when no filters applied', async () => {
      const ruleData1 = {
        name: 'Rule 1',
        description: 'Test rule 1',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {}
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      const ruleData2 = {
        name: 'Rule 2',
        description: 'Test rule 2',
        enabled: false,
        trigger: {
          type: 'issue_updated' as const,
          conditions: {}
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      await confluenceAutomation.createRule(ruleData1);
      await confluenceAutomation.createRule(ruleData2);

      const rules = confluenceAutomation.getRules();
      expect(rules).toHaveLength(2);
    });

    it('should filter rules by enabled status', async () => {
      const ruleData1 = {
        name: 'Enabled Rule',
        description: 'Test rule',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {}
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      const ruleData2 = {
        name: 'Disabled Rule',
        description: 'Test rule',
        enabled: false,
        trigger: {
          type: 'issue_created' as const,
          conditions: {}
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS'
        }
      };

      await confluenceAutomation.createRule(ruleData1);
      await confluenceAutomation.createRule(ruleData2);

      const enabledRules = confluenceAutomation.getRules({ enabled: true });
      expect(enabledRules).toHaveLength(1);
      expect(enabledRules[0].name).toBe('Enabled Rule');

      const disabledRules = confluenceAutomation.getRules({ enabled: false });
      expect(disabledRules).toHaveLength(1);
      expect(disabledRules[0].name).toBe('Disabled Rule');
    });
  });

  describe('processJiraEvent', () => {
    it('should process issue created event and execute matching rules', async () => {
      // Create a rule that matches the event
      const ruleData = {
        name: 'Auto Documentation',
        description: 'Create docs for new stories',
        enabled: true,
        trigger: {
          type: 'issue_created' as const,
          conditions: {
            projectKeys: ['TEST'],
            issueTypes: ['Story']
          }
        },
        action: {
          type: 'create_page' as const,
          spaceKey: 'DOCS',
          includeComments: false,
          includeAttachments: false
        }
      };

      const rule = await confluenceAutomation.createRule(ruleData);

      // Mock the Jira event
      const jiraEvent = {
        webhookEvent: 'jira:issue_created',
        issue: {
          key: 'TEST-123',
          fields: {
            project: { key: 'TEST' },
            issuetype: { name: 'Story' },
            summary: 'Test Story',
            description: 'Test description'
          }
        }
      };

      // Mock the documentation creation
      const mockPage = {
        id: '123456',
        title: 'TEST-123: Test Story',
        space: { key: 'DOCS' },
        _links: { webui: '/spaces/DOCS/pages/123456' }
      };

      mockConfluenceService.createDocumentationFromJiraIssue.mockResolvedValue(mockPage as any);

      // Process the event
      await confluenceAutomation.processJiraEvent(jiraEvent);

      // Verify the documentation was created
      expect(mockConfluenceService.createDocumentationFromJiraIssue).toHaveBeenCalledWith(
        'TEST-123',
        jiraEvent.issue,
        'DOCS',
        undefined
      );

      // Check execution history
      const executions = confluenceAutomation.getExecutions();
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('completed');
      expect(executions[0].issueKey).toBe('TEST-123');
    });

    it('should not execute disabled rules', async () => {
      // Create a disabled rule
      const ruleData = {
        name: 'Disabled Rule',
        description: 'This rule is disabled',
        enabled: false,
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

      await confluenceAutomation.createRule(ruleData);

      const jiraEvent = {
        webhookEvent: 'jira:issue_created',
        issue: {
          key: 'TEST-123',
          fields: {
            project: { key: 'TEST' },
            issuetype: { name: 'Story' }
          }
        }
      };

      await confluenceAutomation.processJiraEvent(jiraEvent);

      // Verify no documentation was created
      expect(mockConfluenceService.createDocumentationFromJiraIssue).not.toHaveBeenCalled();

      // Check no executions were created
      const executions = confluenceAutomation.getExecutions();
      expect(executions).toHaveLength(0);
    });

    it('should handle rule execution errors gracefully', async () => {
      // Create a rule
      const ruleData = {
        name: 'Failing Rule',
        description: 'This rule will fail',
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

      await confluenceAutomation.createRule(ruleData);

      const jiraEvent = {
        webhookEvent: 'jira:issue_created',
        issue: {
          key: 'TEST-123',
          fields: {
            project: { key: 'TEST' },
            issuetype: { name: 'Story' }
          }
        }
      };

      // Mock the service to throw an error
      mockConfluenceService.createDocumentationFromJiraIssue.mockRejectedValue(
        new Error('Space not found')
      );

      await confluenceAutomation.processJiraEvent(jiraEvent);

      // Check execution history shows the failure
      const executions = confluenceAutomation.getExecutions();
      expect(executions).toHaveLength(1);
      expect(executions[0].status).toBe('failed');
      expect(executions[0].error).toBe('Space not found');
    });
  });
});
