
/**
 * Tests for RuleValidator
 */

import { RuleValidator } from '../../src/automation/RuleValidator.js';
import {
  AutomationRule,
  TriggerType,
  ActionType,
  ConditionType
} from '../../src/automation/types.js';

describe('RuleValidator', () => {
  let validator: RuleValidator;

  beforeEach(() => {
    validator = new RuleValidator();
  });

  const createValidRule = (): AutomationRule => ({
    id: 'test-rule-id',
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
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    executionCount: 0,
    failureCount: 0
  });

  describe('Basic Field Validation', () => {
    test('should validate a valid rule', async () => {
      const rule = createValidRule();
      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject rule with empty name', async () => {
      const rule = createValidRule();
      rule.name = '';

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should reject rule with name too long', async () => {
      const rule = createValidRule();
      rule.name = 'x'.repeat(256);

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'FIELD_TOO_LONG'
        })
      );
    });

    test('should reject rule with description too long', async () => {
      const rule = createValidRule();
      rule.description = 'x'.repeat(1001);

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'description',
          code: 'FIELD_TOO_LONG'
        })
      );
    });

    test('should reject rule with no triggers', async () => {
      const rule = createValidRule();
      rule.triggers = [];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should reject rule with no actions', async () => {
      const rule = createValidRule();
      rule.actions = [];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should reject rule with empty project keys array', async () => {
      const rule = createValidRule();
      rule.projectKeys = [];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'projectKeys',
          code: 'INVALID_VALUE'
        })
      );
    });
  });

  describe('Trigger Validation', () => {
    test('should reject invalid trigger type', async () => {
      const rule = createValidRule();
      rule.triggers[0].type = 'INVALID_TRIGGER' as TriggerType;

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].type',
          code: 'INVALID_ENUM_VALUE'
        })
      );
    });

    test('should validate scheduled trigger with cron expression', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.SCHEDULED,
        config: {
          cronExpression: '0 9 * * 1-5',
          timezone: 'UTC'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject scheduled trigger without cron expression', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.SCHEDULED,
        config: {}
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.cronExpression',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should reject invalid cron expression', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.SCHEDULED,
        config: {
          cronExpression: 'invalid cron'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.cronExpression',
          code: 'INVALID_FORMAT'
        })
      );
    });

    test('should warn about very frequent schedule', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.SCHEDULED,
        config: {
          cronExpression: '* * * * *'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.cronExpression',
          message: expect.stringContaining('Very frequent schedule')
        })
      );
    });

    test('should validate webhook trigger', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.WEBHOOK,
        config: {
          webhookUrl: 'https://example.com/webhook',
          secret: 'my-secret'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject webhook trigger with invalid URL', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.WEBHOOK,
        config: {
          webhookUrl: 'invalid-url'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.webhookUrl',
          code: 'INVALID_URL'
        })
      );
    });

    test('should warn about webhook without secret', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.WEBHOOK,
        config: {}
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.secret',
          message: expect.stringContaining('Webhook secret not configured')
        })
      );
    });

    test('should validate field changed trigger', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.FIELD_CHANGED,
        config: {
          fieldId: 'status',
          fromValue: 'To Do',
          toValue: 'In Progress'
        }
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject field changed trigger without field ID', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.FIELD_CHANGED,
        config: {}
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'triggers[0].config.fieldId',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should warn about conflicting triggers', async () => {
      const rule = createValidRule();
      rule.triggers = [
        {
          type: TriggerType.SCHEDULED,
          config: { cronExpression: '0 9 * * *' }
        },
        {
          type: TriggerType.MANUAL,
          config: {}
        }
      ];

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'triggers',
          message: expect.stringContaining('both scheduled and manual triggers')
        })
      );
    });
  });

  describe('Condition Validation', () => {
    test('should validate JQL condition', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.JQL,
        config: {
          jql: 'project = TEST AND status = "In Progress"'
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject JQL condition without query', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.JQL,
        config: {}
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].config.jql',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should reject dangerous JQL queries', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.JQL,
        config: {
          jql: 'DELETE FROM issues WHERE project = TEST'
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].config.jql',
          code: 'SECURITY_VIOLATION'
        })
      );
    });

    test('should validate field value condition', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.FIELD_VALUE,
        config: {
          fieldId: 'priority',
          expectedValue: 'High',
          operator: 'equals'
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject field value condition without field ID', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.FIELD_VALUE,
        config: {
          expectedValue: 'High'
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].config.fieldId',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should validate user in group condition', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.USER_IN_GROUP,
        config: {
          groupName: 'jira-administrators'
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should validate issue age condition', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.ISSUE_AGE,
        config: {
          ageInDays: 7
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject issue age condition with negative value', async () => {
      const rule = createValidRule();
      rule.conditions = [{
        type: ConditionType.ISSUE_AGE,
        config: {
          ageInDays: -1
        }
      }];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].config.ageInDays',
          code: 'INVALID_VALUE'
        })
      );
    });
  });

  describe('Action Validation', () => {
    test('should reject duplicate action orders', async () => {
      const rule = createValidRule();
      rule.actions = [
        {
          type: ActionType.ADD_COMMENT,
          config: { comment: 'First comment' },
          order: 1
        },
        {
          type: ActionType.ADD_COMMENT,
          config: { comment: 'Second comment' },
          order: 1 // Duplicate order
        }
      ];

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions',
          code: 'DUPLICATE_VALUES'
        })
      );
    });

    test('should validate update issue action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.UPDATE_ISSUE,
        config: {
          fields: {
            priority: { name: 'High' },
            labels: ['automated']
          }
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should warn about update issue action with no fields', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.UPDATE_ISSUE,
        config: {},
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].config.fields',
          message: expect.stringContaining('No fields specified')
        })
      );
    });

    test('should validate transition issue action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.TRANSITION_ISSUE,
        config: {
          transitionId: '31'
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject transition issue action without transition', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.TRANSITION_ISSUE,
        config: {},
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].config',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should validate create issue action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.CREATE_ISSUE,
        config: {
          projectKey: 'TEST',
          issueType: 'Task',
          summary: 'Automated issue'
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject create issue action without required fields', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.CREATE_ISSUE,
        config: {},
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3); // projectKey, issueType, summary
    });

    test('should validate send notification action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.SEND_NOTIFICATION,
        config: {
          recipients: ['user@example.com'],
          subject: 'Test notification',
          message: 'This is a test'
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject send notification action without recipients', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.SEND_NOTIFICATION,
        config: {
          message: 'Test message'
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].config.recipients',
          code: 'REQUIRED_FIELD'
        })
      );
    });

    test('should validate webhook call action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.WEBHOOK_CALL,
        config: {
          url: 'https://example.com/webhook',
          method: 'POST',
          payload: { message: 'test' }
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should reject webhook call action with invalid URL', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.WEBHOOK_CALL,
        config: {
          url: 'invalid-url'
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].config.url',
          code: 'INVALID_URL'
        })
      );
    });

    test('should validate bulk operation action', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = TEST AND status = "To Do"',
          batchSize: 50,
          maxIssues: 1000
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.valid).toBe(true);
    });

    test('should warn about large bulk operations', async () => {
      const rule = createValidRule();
      rule.actions[0] = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = TEST',
          maxIssues: 15000
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'actions[0].config.maxIssues',
          message: expect.stringContaining('Large bulk operation')
        })
      );
    });
  });

  describe('Rule Logic Validation', () => {
    test('should warn about potential infinite loops', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.ISSUE_UPDATED,
        config: {}
      };
      rule.actions[0] = {
        type: ActionType.UPDATE_ISSUE,
        config: {
          fields: { priority: { name: 'High' } }
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'rule',
          message: expect.stringContaining('Potential infinite loop')
        })
      );
    });

    test('should warn about performance concerns', async () => {
      const rule = createValidRule();
      rule.triggers[0] = {
        type: TriggerType.SCHEDULED,
        config: {
          cronExpression: '* * * * *' // Every minute
        }
      };
      rule.actions[0] = {
        type: ActionType.BULK_OPERATION,
        config: {
          jql: 'project = TEST',
          maxIssues: 5000
        },
        order: 1
      };

      const result = await validator.validateRule(rule);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'rule',
          message: expect.stringContaining('Performance concern')
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      const invalidRule = null as any;

      const result = await validator.validateRule(invalidRule);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'general',
          code: 'VALIDATION_ERROR'
        })
      );
    });
  });
});
