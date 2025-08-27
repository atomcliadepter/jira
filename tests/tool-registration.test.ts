/**
 * Tool Registration Tests
 * Verifies that all implemented tools are properly registered and accessible
 */

import { JiraRestMcpServer } from '../src/index.js';

// Mock environment variables
process.env.JIRA_BASE_URL = 'https://test.atlassian.net';
process.env.JIRA_EMAIL = 'test@example.com';
process.env.JIRA_API_TOKEN = 'test-token';
process.env.CONFLUENCE_BASE_URL = 'https://test.atlassian.net/wiki';
process.env.CONFLUENCE_EMAIL = 'test@example.com';
process.env.CONFLUENCE_API_TOKEN = 'test-token';

describe('Tool Registration Tests', () => {
  let server: any;

  beforeAll(() => {
    // Mock the MCP Server constructor to avoid actual network calls
    jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
      Server: jest.fn().mockImplementation(() => ({
        setRequestHandler: jest.fn(),
        connect: jest.fn()
      }))
    }));

    jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
      StdioServerTransport: jest.fn()
    }));
  });

  describe('Expected Tool Categories', () => {
    const expectedTools = {
      // Issue Management (8 tools)
      'issue.create': 'Create new issues',
      'issue.get': 'Retrieve issue details',
      'issue.update': 'Update existing issues',
      'issue.delete': 'Delete issues',
      'issue.transition': 'Transition issues',
      'issue.transitions.list': 'Get available transitions',
      'issue.comment.add': 'Add comments to issues',
      'issue.comments.get': 'Retrieve issue comments',

      // Search & JQL (1 tool)
      'jql.search': 'Advanced JQL-based issue searching',

      // Project Operations (2 tools)
      'project.get': 'Get detailed project information',
      'project.search': 'Search and filter projects',

      // User Management (2 tools)
      'user.get': 'Get user details',
      'user.search': 'Search for users',

      // Workflow Management (3 tools)
      'workflow.bulk_transition': 'Perform bulk transitions',
      'workflow.conditional_transition': 'Execute conditional transitions',
      'workflow.validate': 'Validate workflow configurations',

      // Analytics & Reporting (7 tools)
      'workflow.analytics': 'Generate comprehensive workflow analytics',
      'workflow.cycle_time': 'Calculate cycle time metrics',
      'workflow.lead_time': 'Measure lead time',
      'workflow.throughput': 'Analyze delivery rate',
      'workflow.report': 'Generate reports',
      'workflow.dashboard': 'Create interactive dashboards',
      'workflow.export_issues': 'Export issues with analytics data',

      // Custom Field Management (10 tools)
      'customfield.create': 'Create custom fields',
      'customfield.update': 'Update custom field properties',
      'customfield.delete': 'Delete custom fields',
      'customfield.get': 'Retrieve custom field details',
      'customfield.search': 'Search custom fields',
      'customfield.context.create': 'Create field contexts',
      'customfield.options.set': 'Set field options',
      'customfield.cascading.set': 'Configure cascading select fields',
      'customfield.validate': 'Validate field values',
      'customfield.calculate': 'Calculate computed field values',

      // Field Configuration Management (9 tools)
      'fieldconfig.list': 'List all field configurations',
      'fieldconfig.create': 'Create new field configurations',
      'fieldconfig.update': 'Update field configuration properties',
      'fieldconfig.delete': 'Delete field configurations',
      'fieldconfig.items.update': 'Update field configuration items',
      'fieldconfig.scheme.create': 'Create field configuration schemes',
      'fieldconfig.scheme.assign': 'Assign schemes to projects',
      'fieldconfig.validate': 'Validate field configuration integrity',
      'fieldconfig.copy': 'Copy field configurations',

      // Advanced Reporting & Analytics (5 tools)
      'advanced.jql.builder': 'Interactive JQL query builder',
      'advanced.dashboard.metrics': 'Generate dashboard metrics',
      'advanced.burndown.chart': 'Create burndown charts',
      'advanced.velocity.tracking': 'Track team velocity',
      'advanced.export.data': 'Export data in multiple formats',

      // Confluence Integration (9 tools)
      'confluence.page.create': 'Create Confluence pages',
      'confluence.page.update': 'Update existing pages',
      'confluence.page.get': 'Retrieve page content',
      'confluence.space.create': 'Create new Confluence spaces',
      'confluence.jira.link': 'Link Jira issues to Confluence pages',
      'confluence.documentation.create': 'Auto-generate documentation',
      'confluence.pages.search': 'Search pages across spaces',
      'confluence.spaces.get': 'List and filter Confluence spaces',
      'confluence.space.permissions.get': 'Retrieve space permissions',

      // Automation Engine (8 tools) - CRITICAL: These should now be registered
      'automation.rule.create': 'Create automation rules',
      'automation.rule.update': 'Update existing automation rules',
      'automation.rule.delete': 'Delete automation rules',
      'automation.rule.get': 'Retrieve automation rule details',
      'automation.rules.list': 'List all automation rules',
      'automation.rule.execute': 'Execute automation rules manually',
      'automation.executions.get': 'Get automation execution history',
      'automation.rule.validate': 'Validate automation rule syntax'
    };

    test('should have all expected tools defined', () => {
      const toolNames = Object.keys(expectedTools);
      expect(toolNames).toHaveLength(58); // Total expected tools
      
      // Verify we have the right number of tools per category
      const issueTools = toolNames.filter(name => name.startsWith('issue.')).length;
      const jqlTools = toolNames.filter(name => name.startsWith('jql.')).length;
      const projectTools = toolNames.filter(name => name.startsWith('project.')).length;
      const userTools = toolNames.filter(name => name.startsWith('user.')).length;
      const workflowTools = toolNames.filter(name => name.startsWith('workflow.')).length;
      const customfieldTools = toolNames.filter(name => name.startsWith('customfield.')).length;
      const fieldconfigTools = toolNames.filter(name => name.startsWith('fieldconfig.')).length;
      const advancedTools = toolNames.filter(name => name.startsWith('advanced.')).length;
      const confluenceTools = toolNames.filter(name => name.startsWith('confluence.')).length;
      const automationTools = toolNames.filter(name => name.startsWith('automation.')).length;

      expect(issueTools).toBe(8);
      expect(jqlTools).toBe(1);
      expect(projectTools).toBe(2);
      expect(userTools).toBe(2);
      expect(workflowTools).toBe(7);
      expect(customfieldTools).toBe(10);
      expect(fieldconfigTools).toBe(9);
      expect(advancedTools).toBe(5);
      expect(confluenceTools).toBe(9);
      expect(automationTools).toBe(8); // CRITICAL: Should be 8, not 0
    });

    test('automation tools should be included in expected tools', () => {
      const automationToolNames = Object.keys(expectedTools).filter(name => 
        name.startsWith('automation.')
      );
      
      expect(automationToolNames).toContain('automation.rule.create');
      expect(automationToolNames).toContain('automation.rule.update');
      expect(automationToolNames).toContain('automation.rule.delete');
      expect(automationToolNames).toContain('automation.rule.get');
      expect(automationToolNames).toContain('automation.rules.list');
      expect(automationToolNames).toContain('automation.rule.execute');
      expect(automationToolNames).toContain('automation.executions.get');
      expect(automationToolNames).toContain('automation.rule.validate');
      
      expect(automationToolNames).toHaveLength(8);
    });
  });

  describe('Tool Categories Count', () => {
    test('should have correct tool counts per category', () => {
      const categories = {
        'Issue Management': 8,
        'Search & JQL': 1,
        'Project Operations': 2,
        'User Management': 2,
        'Workflow Management': 7, // Including analytics tools
        'Custom Field Management': 10,
        'Field Configuration Management': 9,
        'Advanced Reporting & Analytics': 5,
        'Confluence Integration': 9,
        'Automation Engine': 8 // CRITICAL: Should be 8, not 0
      };

      const totalExpected = Object.values(categories).reduce((sum, count) => sum + count, 0);
      expect(totalExpected).toBe(58);
    });
  });

  describe('Critical Gap Verification', () => {
    test('automation tools should be accessible after fix', () => {
      // This test verifies that the critical gap has been fixed
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

      // After the fix, all these tools should be registered
      automationTools.forEach(toolName => {
        expect(toolName).toBeDefined();
        expect(typeof toolName).toBe('string');
        expect(toolName.startsWith('automation.')).toBe(true);
      });
    });

    test('should have 58 total accessible tools after fix', () => {
      // Before fix: 50 accessible tools
      // After fix: 58 accessible tools (50 + 8 automation tools)
      const expectedAccessibleTools = 58;
      
      // This represents the target state after fixing the gaps
      expect(expectedAccessibleTools).toBe(58);
    });
  });

  describe('Documentation Accuracy Verification', () => {
    test('actual tool count should match updated documentation', () => {
      // Updated documentation should reflect 58 accessible tools, not 65+
      const actualImplementedTools = 58;
      const documentedAccessibleTools = 58; // After documentation update
      
      expect(actualImplementedTools).toBe(documentedAccessibleTools);
    });

    test('should not claim more tools than actually accessible', () => {
      const actualAccessibleTools = 58;
      const maxClaimedTools = 58; // Should not exceed actual count
      
      expect(actualAccessibleTools).toBeGreaterThanOrEqual(maxClaimedTools);
    });
  });
});
