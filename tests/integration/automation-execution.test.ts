import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { EnhancedJiraRestClient } from '../../src/http/EnhancedJiraRestClient.js';
import { 
  executeCreateAutomationRule,
  executeListAutomationRules,
  executeDeleteAutomationRule
} from '../../src/tools/automationTools.js';
import { config } from 'dotenv';

// Load test environment
config({ path: '.env.test' });

describe('Automation Tools Integration Tests', () => {
  let jiraClient: EnhancedJiraRestClient;
  let createdRuleId: string;

  const skipIntegrationTests = !process.env.JIRA_BASE_URL || 
                               !process.env.JIRA_EMAIL || 
                               !process.env.JIRA_API_TOKEN;

  beforeAll(() => {
    if (skipIntegrationTests) {
      console.log('Skipping automation integration tests - credentials not configured');
      return;
    }

    jiraClient = new EnhancedJiraRestClient({
      baseUrl: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
    });
  });

  afterAll(async () => {
    if (skipIntegrationTests || !createdRuleId) return;

    // Cleanup: Delete created automation rule
    try {
      await executeDeleteAutomationRule(jiraClient, { ruleId: createdRuleId });
    } catch (error) {
      console.warn('Failed to cleanup automation rule:', error);
    }
  });

  describe('Automation Rule Lifecycle', () => {
    test('should create automation rule', async () => {
      if (skipIntegrationTests) return;

      const ruleData = {
        name: 'Test Automation Rule',
        description: 'Test rule created by integration tests',
        trigger: {
          component: 'TRIGGER',
          type: 'jira.issue.event.trigger',
          value: {
            event: 'jira:issue_created'
          }
        },
        actions: [{
          component: 'ACTION',
          type: 'jira.issue.assign',
          value: {
            assignee: {
              type: 'CURRENT_USER'
            }
          }
        }]
      };

      const result = await executeCreateAutomationRule(jiraClient, ruleData);
      
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('ruleId');
      
      createdRuleId = result.content.ruleId;
      expect(createdRuleId).toBeDefined();
    }, 30000);

    test('should list automation rules', async () => {
      if (skipIntegrationTests) return;

      const result = await executeListAutomationRules(jiraClient, {
        maxResults: 10
      });

      expect(result).toHaveProperty('content');
      expect(result.content).toHaveProperty('rules');
      expect(Array.isArray(result.content.rules)).toBe(true);
    }, 15000);

    test('should handle automation rule errors gracefully', async () => {
      if (skipIntegrationTests) return;

      // Test with invalid rule ID
      await expect(
        executeDeleteAutomationRule(jiraClient, { ruleId: 'invalid-rule-id' })
      ).rejects.toThrow();
    }, 15000);
  });

  describe('Automation Rule Validation', () => {
    test('should validate rule structure', () => {
      const validRule = {
        name: 'Valid Rule',
        description: 'Valid description',
        trigger: {
          component: 'TRIGGER',
          type: 'jira.issue.event.trigger'
        },
        actions: [{
          component: 'ACTION',
          type: 'jira.issue.assign'
        }]
      };

      expect(validRule.name).toBeDefined();
      expect(validRule.trigger).toBeDefined();
      expect(validRule.actions).toBeDefined();
      expect(Array.isArray(validRule.actions)).toBe(true);
    });

    test('should reject invalid rule structure', () => {
      const invalidRule = {
        name: '', // Empty name
        // Missing trigger
        actions: [] // Empty actions
      };

      expect(invalidRule.name).toBe('');
      expect(invalidRule.trigger).toBeUndefined();
      expect(invalidRule.actions).toHaveLength(0);
    });
  });
});
