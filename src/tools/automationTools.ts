
/**
 * MCP tools for Automation Engine
 */

import { z } from 'zod';
import { AutomationEngine } from '../automation/AutomationEngine.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger, generateRequestId } from '../utils/logger.js';
import {
  TriggerType,
  ActionType,
  ConditionType,
  ExecutionStatus,
  AutomationRule
} from '../automation/types.js';

// Validation schemas
const TriggerConfigSchema = z.object({
  projectKeys: z.array(z.string()).optional(),
  issueTypes: z.array(z.string()).optional(),
  fields: z.array(z.string()).optional(),
  fromStatus: z.array(z.string()).optional(),
  toStatus: z.array(z.string()).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  secret: z.string().optional(),
  fieldId: z.string().optional(),
  fromValue: z.any().optional(),
  toValue: z.any().optional()
});

const ActionConfigSchema = z.object({
  fields: z.record(z.any()).optional(),
  transitionId: z.string().optional(),
  transitionName: z.string().optional(),
  projectKey: z.string().optional(),
  issueType: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  comment: z.string().optional(),
  visibility: z.enum(['public', 'internal']).optional(),
  assigneeId: z.string().optional(),
  assigneeEmail: z.string().email().optional(),
  recipients: z.array(z.string()).optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  channel: z.enum(['email', 'slack', 'teams']).optional(),
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
  payload: z.any().optional(),
  jql: z.string().optional(),
  batchSize: z.number().positive().optional(),
  maxIssues: z.number().positive().optional(),
  parentIssueKey: z.string().optional(),
  linkType: z.string().optional(),
  targetIssueKey: z.string().optional(),
  customFieldId: z.string().optional(),
  customFieldValue: z.any().optional()
});

const ConditionConfigSchema = z.object({
  jql: z.string().optional(),
  fieldId: z.string().optional(),
  expectedValue: z.any().optional(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']).optional(),
  groupName: z.string().optional(),
  categoryId: z.string().optional(),
  ageInDays: z.number().nonnegative().optional(),
  scriptCode: z.string().optional(),
  smartValueExpression: z.string().optional()
});

const AutomationTriggerSchema = z.object({
  type: z.nativeEnum(TriggerType),
  config: TriggerConfigSchema
});

const AutomationActionSchema = z.object({
  type: z.nativeEnum(ActionType),
  config: ActionConfigSchema,
  order: z.number().int().nonnegative(),
  continueOnError: z.boolean().optional()
});

const AutomationConditionSchema = z.object({
  type: z.nativeEnum(ConditionType),
  config: ConditionConfigSchema,
  operator: z.enum(['AND', 'OR']).optional()
});

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(false),
  projectKeys: z.array(z.string()).optional(),
  triggers: z.array(AutomationTriggerSchema).min(1),
  conditions: z.array(AutomationConditionSchema).optional(),
  actions: z.array(AutomationActionSchema).min(1),
  createdBy: z.string()
});

const UpdateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  projectKeys: z.array(z.string()).optional(),
  triggers: z.array(AutomationTriggerSchema).optional(),
  conditions: z.array(AutomationConditionSchema).optional(),
  actions: z.array(AutomationActionSchema).optional()
});

const ExecutionContextSchema = z.object({
  issueKey: z.string().optional(),
  projectKey: z.string().optional(),
  userId: z.string().optional(),
  webhookData: z.any().optional(),
  triggerData: z.any().optional()
});

// Initialize automation engine (will be set by the main server)
let automationEngine: AutomationEngine;

export function initializeAutomationEngine(jiraClient: JiraRestClient): void {
  automationEngine = new AutomationEngine(jiraClient);
}

/**
 * Create automation rule tool
 */
export const createAutomationRuleTool = {
  name: 'automation.rule.create',
  description: 'Create a new automation rule with triggers, conditions, and actions',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the automation rule',
        minLength: 1,
        maxLength: 255
      },
      description: {
        type: 'string',
        description: 'Description of the automation rule',
        maxLength: 1000
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the rule should be enabled immediately',
        default: false
      },
      projectKeys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project keys to scope the rule to (optional)'
      },
      triggers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Object.values(TriggerType),
              description: 'Type of trigger'
            },
            config: {
              type: 'object',
              description: 'Trigger configuration'
            }
          },
          required: ['type', 'config']
        },
        minItems: 1,
        description: 'Triggers that will fire this rule'
      },
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Object.values(ConditionType),
              description: 'Type of condition'
            },
            config: {
              type: 'object',
              description: 'Condition configuration'
            },
            operator: {
              type: 'string',
              enum: ['AND', 'OR'],
              description: 'Logical operator for combining conditions'
            }
          },
          required: ['type', 'config']
        },
        description: 'Conditions that must be met for the rule to execute'
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Object.values(ActionType),
              description: 'Type of action'
            },
            config: {
              type: 'object',
              description: 'Action configuration'
            },
            order: {
              type: 'number',
              description: 'Execution order of the action'
            },
            continueOnError: {
              type: 'boolean',
              description: 'Whether to continue if this action fails'
            }
          },
          required: ['type', 'config', 'order']
        },
        minItems: 1,
        description: 'Actions to execute when the rule is triggered'
      },
      createdBy: {
        type: 'string',
        description: 'User who created the rule'
      }
    },
    required: ['name', 'triggers', 'actions', 'createdBy']
  }
};

export async function executeCreateAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Creating automation rule', { 
    context: 'AutomationTools', 
    requestId,
    ruleName: args.name 
  });

  try {
    const validatedArgs = CreateRuleSchema.parse(args);
    const rule = await automationEngine.createRule(validatedArgs);

    logger.info('Automation rule created successfully', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: rule.id 
    });

    return {
      success: true,
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        projectKeys: rule.projectKeys,
        triggersCount: rule.triggers.length,
        actionsCount: rule.actions.length,
        conditionsCount: rule.conditions?.length || 0,
        createdAt: rule.createdAt.toISOString(),
        createdBy: rule.createdBy
      }
    };
  } catch (error) {
    logger.error('Failed to create automation rule', { 
      context: 'AutomationTools', 
      requestId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Update automation rule tool
 */
export const updateAutomationRuleTool = {
  name: 'automation.rule.update',
  description: 'Update an existing automation rule',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'ID of the rule to update'
      },
      name: {
        type: 'string',
        description: 'New name for the rule',
        minLength: 1,
        maxLength: 255
      },
      description: {
        type: 'string',
        description: 'New description for the rule',
        maxLength: 1000
      },
      enabled: {
        type: 'boolean',
        description: 'Whether the rule should be enabled'
      },
      projectKeys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project keys to scope the rule to'
      },
      triggers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(TriggerType) },
            config: { type: 'object' }
          },
          required: ['type', 'config']
        },
        description: 'Updated triggers for the rule'
      },
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(ConditionType) },
            config: { type: 'object' },
            operator: { type: 'string', enum: ['AND', 'OR'] }
          },
          required: ['type', 'config']
        },
        description: 'Updated conditions for the rule'
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(ActionType) },
            config: { type: 'object' },
            order: { type: 'number' },
            continueOnError: { type: 'boolean' }
          },
          required: ['type', 'config', 'order']
        },
        description: 'Updated actions for the rule'
      }
    },
    required: ['ruleId']
  }
};

export async function executeUpdateAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Updating automation rule', { 
    context: 'AutomationTools', 
    requestId,
    ruleId: args.ruleId 
  });

  try {
    const { ruleId, ...updates } = args;
    const validatedUpdates = UpdateRuleSchema.parse(updates);
    const rule = await automationEngine.updateRule(ruleId, validatedUpdates);

    logger.info('Automation rule updated successfully', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: rule.id 
    });

    return {
      success: true,
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        projectKeys: rule.projectKeys,
        triggersCount: rule.triggers.length,
        actionsCount: rule.actions.length,
        conditionsCount: rule.conditions?.length || 0,
        updatedAt: rule.updatedAt.toISOString()
      }
    };
  } catch (error) {
    logger.error('Failed to update automation rule', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete automation rule tool
 */
export const deleteAutomationRuleTool = {
  name: 'automation.rule.delete',
  description: 'Delete an automation rule',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'ID of the rule to delete'
      }
    },
    required: ['ruleId']
  }
};

export async function executeDeleteAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Deleting automation rule', { 
    context: 'AutomationTools', 
    requestId,
    ruleId: args.ruleId 
  });

  try {
    await automationEngine.deleteRule(args.ruleId);

    logger.info('Automation rule deleted successfully', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId 
    });

    return {
      success: true,
      message: `Automation rule ${args.ruleId} deleted successfully`
    };
  } catch (error) {
    logger.error('Failed to delete automation rule', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get automation rule tool
 */
export const getAutomationRuleTool = {
  name: 'automation.rule.get',
  description: 'Get details of a specific automation rule',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'ID of the rule to retrieve'
      }
    },
    required: ['ruleId']
  }
};

export async function executeGetAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Getting automation rule', { 
    context: 'AutomationTools', 
    requestId,
    ruleId: args.ruleId 
  });

  try {
    const rule = automationEngine.getRule(args.ruleId);
    
    if (!rule) {
      return {
        success: false,
        error: `Automation rule not found: ${args.ruleId}`
      };
    }

    logger.info('Automation rule retrieved successfully', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: rule.id 
    });

    return {
      success: true,
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        projectKeys: rule.projectKeys,
        triggers: rule.triggers,
        conditions: rule.conditions,
        actions: rule.actions,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        createdBy: rule.createdBy,
        executionCount: rule.executionCount,
        failureCount: rule.failureCount,
        lastExecuted: rule.lastExecuted?.toISOString()
      }
    };
  } catch (error) {
    logger.error('Failed to get automation rule', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * List automation rules tool
 */
export const listAutomationRulesTool = {
  name: 'automation.rules.list',
  description: 'List automation rules with optional filtering',
  inputSchema: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        description: 'Filter by enabled status'
      },
      projectKey: {
        type: 'string',
        description: 'Filter by project key'
      },
      triggerType: {
        type: 'string',
        enum: Object.values(TriggerType),
        description: 'Filter by trigger type'
      }
    }
  }
};

export async function executeListAutomationRules(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Listing automation rules', { 
    context: 'AutomationTools', 
    requestId,
    filters: args 
  });

  try {
    const rules = automationEngine.getRules(args);

    logger.info('Automation rules listed successfully', { 
      context: 'AutomationTools', 
      requestId,
      count: rules.length 
    });

    return {
      success: true,
      rules: rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        projectKeys: rule.projectKeys,
        triggersCount: rule.triggers.length,
        actionsCount: rule.actions.length,
        conditionsCount: rule.conditions?.length || 0,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
        createdBy: rule.createdBy,
        executionCount: rule.executionCount,
        failureCount: rule.failureCount,
        lastExecuted: rule.lastExecuted?.toISOString()
      })),
      count: rules.length
    };
  } catch (error) {
    logger.error('Failed to list automation rules', { 
      context: 'AutomationTools', 
      requestId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Execute automation rule tool
 */
export const executeAutomationRuleTool = {
  name: 'automation.rule.execute',
  description: 'Execute an automation rule manually',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'ID of the rule to execute'
      },
      context: {
        type: 'object',
        properties: {
          issueKey: {
            type: 'string',
            description: 'Issue key for context'
          },
          projectKey: {
            type: 'string',
            description: 'Project key for context'
          },
          userId: {
            type: 'string',
            description: 'User ID for context'
          },
          webhookData: {
            type: 'object',
            description: 'Webhook data for context'
          },
          triggerData: {
            type: 'object',
            description: 'Trigger data for context'
          }
        },
        description: 'Execution context'
      }
    },
    required: ['ruleId']
  }
};

export async function executeExecuteAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Executing automation rule', { 
    context: 'AutomationTools', 
    requestId,
    ruleId: args.ruleId 
  });

  try {
    const context = ExecutionContextSchema.parse(args.context || {});
    const execution = await automationEngine.executeRule(args.ruleId, context);

    logger.info('Automation rule executed successfully', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId,
      executionId: execution.id,
      status: execution.status 
    });

    return {
      success: true,
      execution: {
        id: execution.id,
        ruleId: execution.ruleId,
        status: execution.status,
        triggeredAt: execution.triggeredAt.toISOString(),
        triggeredBy: execution.triggeredBy,
        duration: execution.duration,
        context: execution.context,
        results: execution.results,
        error: execution.error
      }
    };
  } catch (error) {
    logger.error('Failed to execute automation rule', { 
      context: 'AutomationTools', 
      requestId,
      ruleId: args.ruleId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get automation executions tool
 */
export const getAutomationExecutionsTool = {
  name: 'automation.executions.list',
  description: 'List automation rule executions',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'Filter by rule ID'
      },
      status: {
        type: 'string',
        enum: Object.values(ExecutionStatus),
        description: 'Filter by execution status'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Maximum number of executions to return'
      }
    }
  }
};

export async function executeGetAutomationExecutions(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Getting automation executions', { 
    context: 'AutomationTools', 
    requestId,
    filters: args 
  });

  try {
    const executions = automationEngine.getExecutions(args);

    logger.info('Automation executions retrieved successfully', { 
      context: 'AutomationTools', 
      requestId,
      count: executions.length 
    });

    return {
      success: true,
      executions: executions.map(execution => ({
        id: execution.id,
        ruleId: execution.ruleId,
        status: execution.status,
        triggeredAt: execution.triggeredAt.toISOString(),
        triggeredBy: execution.triggeredBy,
        duration: execution.duration,
        context: execution.context,
        results: execution.results,
        error: execution.error
      })),
      count: executions.length
    };
  } catch (error) {
    logger.error('Failed to get automation executions', { 
      context: 'AutomationTools', 
      requestId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Validate automation rule tool
 */
export const validateAutomationRuleTool = {
  name: 'automation.rule.validate',
  description: 'Validate an automation rule configuration',
  inputSchema: {
    type: 'object',
    properties: {
      rule: {
        type: 'object',
        description: 'Rule configuration to validate',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          enabled: { type: 'boolean' },
          projectKeys: { type: 'array', items: { type: 'string' } },
          triggers: { type: 'array' },
          conditions: { type: 'array' },
          actions: { type: 'array' },
          createdBy: { type: 'string' }
        },
        required: ['name', 'triggers', 'actions', 'createdBy']
      }
    },
    required: ['rule']
  }
};

export async function executeValidateAutomationRule(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Validating automation rule', { 
    context: 'AutomationTools', 
    requestId 
  });

  try {
    const rule = args.rule as AutomationRule;
    const validation = await automationEngine.validateRule(rule);

    logger.info('Automation rule validation completed', { 
      context: 'AutomationTools', 
      requestId,
      valid: validation.valid,
      errorsCount: validation.errors.length,
      warningsCount: validation.warnings.length 
    });

    return {
      success: true,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      }
    };
  } catch (error) {
    logger.error('Failed to validate automation rule', { 
      context: 'AutomationTools', 
      requestId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get automation metrics tool
 */
export const getAutomationMetricsTool = {
  name: 'automation.metrics.get',
  description: 'Get automation metrics and statistics',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: {
        type: 'string',
        description: 'Get metrics for specific rule (optional)'
      }
    }
  }
};

export async function executeGetAutomationMetrics(args: any): Promise<any> {
  const requestId = generateRequestId();
  logger.info('Getting automation metrics', { 
    context: 'AutomationTools', 
    requestId,
    ruleId: args.ruleId 
  });

  try {
    const metrics = automationEngine.getMetrics(args.ruleId);

    logger.info('Automation metrics retrieved successfully', { 
      context: 'AutomationTools', 
      requestId,
      count: metrics.length 
    });

    return {
      success: true,
      metrics: metrics.map(metric => ({
        ruleId: metric.ruleId,
        executionCount: metric.executionCount,
        successRate: metric.successRate,
        averageDuration: metric.averageDuration,
        lastExecution: metric.lastExecution?.toISOString(),
        failureReasons: metric.failureReasons
      })),
      count: metrics.length
    };
  } catch (error) {
    logger.error('Failed to get automation metrics', { 
      context: 'AutomationTools', 
      requestId,
      error: error instanceof Error ? error.message : String(error) 
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
