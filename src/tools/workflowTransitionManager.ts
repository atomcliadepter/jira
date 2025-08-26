
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, ErrorCodes, McpJiraError, ErrorCategory } from '../utils/errorCodes.js';

// Schema definitions for workflow transition automation
const WorkflowConditionSchema = z.object({
  type: z.enum(['field_value', 'user_role', 'project_role', 'custom_field', 'assignee_check', 'reporter_check']),
  field: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'greater_than', 'less_than']).optional(),
  role: z.string().optional(),
  user: z.string().optional()
});

const BulkTransitionArgsSchema = z.object({
  jql: z.string(),
  transitionId: z.string(),
  conditions: z.array(WorkflowConditionSchema).optional(),
  fields: z.record(z.any()).optional(),
  dryRun: z.boolean().default(false),
  maxIssues: z.number().default(50),
  comment: z.string().optional()
});

const ConditionalTransitionArgsSchema = z.object({
  issueIdOrKey: z.string(),
  conditions: z.array(WorkflowConditionSchema),
  transitionMapping: z.record(z.string()), // condition result -> transition ID
  defaultTransition: z.string().optional(),
  fields: z.record(z.any()).optional(),
  comment: z.string().optional()
});

const WorkflowValidationArgsSchema = z.object({
  projectKey: z.string(),
  workflowName: z.string().optional(),
  issueTypes: z.array(z.string()).optional()
});

export type WorkflowCondition = z.infer<typeof WorkflowConditionSchema>;
export type BulkTransitionArgs = z.infer<typeof BulkTransitionArgsSchema>;
export type ConditionalTransitionArgs = z.infer<typeof ConditionalTransitionArgsSchema>;
export type WorkflowValidationArgs = z.infer<typeof WorkflowValidationArgsSchema>;

export class WorkflowTransitionManager {
  private client: JiraRestClient;
  private requestId: string;

  constructor(client: JiraRestClient) {
    this.client = client;
    this.requestId = generateRequestId();
  }

  /**
   * Evaluate workflow conditions against an issue
   */
  async evaluateConditions(issue: any, conditions: WorkflowCondition[]): Promise<boolean> {
    logger.debug('Evaluating workflow conditions', { issueKey: issue.key, conditions }, this.requestId);

    try {
      for (const condition of conditions) {
        const result = await this.evaluateCondition(issue, condition);
        if (!result) {
          logger.debug('Condition failed', { condition, issueKey: issue.key }, this.requestId);
          return false;
        }
      }
      return true;
    } catch (error: any) {
      logger.error('Error evaluating conditions', { error: error.message, issueKey: issue.key }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to evaluate conditions: ${error.message}`,
        ErrorCategory.EXECUTION,
        { issueKey: issue.key, conditions },
        this.requestId
      );
    }
  }

  private async evaluateCondition(issue: any, condition: WorkflowCondition): Promise<boolean> {
    switch (condition.type) {
      case 'field_value':
        return this.evaluateFieldCondition(issue, condition);
      
      case 'user_role':
        return await this.evaluateUserRoleCondition(issue, condition);
      
      case 'project_role':
        return await this.evaluateProjectRoleCondition(issue, condition);
      
      case 'custom_field':
        return this.evaluateCustomFieldCondition(issue, condition);
      
      case 'assignee_check':
        return this.evaluateAssigneeCondition(issue, condition);
      
      case 'reporter_check':
        return this.evaluateReporterCondition(issue, condition);
      
      default:
        throw new Error(`Unknown condition type: ${condition.type}`);
    }
  }

  private evaluateFieldCondition(issue: any, condition: WorkflowCondition): boolean {
    if (!condition.field || condition.value === undefined) return false;

    const fieldValue = this.getFieldValue(issue, condition.field);
    const conditionValue = condition.value;
    const operator = condition.operator || 'equals';

    return this.compareValues(fieldValue, conditionValue, operator);
  }

  private async evaluateUserRoleCondition(issue: any, condition: WorkflowCondition): Promise<boolean> {
    if (!condition.role || !condition.user) return false;

    try {
      // Get current user info and check if they have the required role
      const currentUser = await this.client.get('/rest/api/3/myself');
      const userRoles = await this.client.get(`/rest/api/3/project/${issue.fields.project.key}/role`);
      
      // Check if user has the specified role
      for (const [roleName, roleUrl] of Object.entries(userRoles)) {
        if (roleName.toLowerCase() === condition.role.toLowerCase()) {
          const roleDetails = await this.client.get(roleUrl as string);
          const hasRole = roleDetails.actors?.some((actor: any) => 
            actor.actorUser?.emailAddress === condition.user ||
            actor.actorUser?.accountId === condition.user
          );
          return hasRole || false;
        }
      }
      return false;
    } catch (error) {
      logger.warn('Failed to evaluate user role condition', { error, condition }, this.requestId);
      return false;
    }
  }

  private async evaluateProjectRoleCondition(issue: any, condition: WorkflowCondition): Promise<boolean> {
    if (!condition.role) return false;

    try {
      const currentUser = await this.client.get('/rest/api/3/myself');
      const projectRoles = await this.client.get(`/rest/api/3/project/${issue.fields.project.key}/roledetails`);
      
      return projectRoles.some((role: any) => 
        role.name.toLowerCase() === condition.role?.toLowerCase() &&
        role.actors.some((actor: any) => actor.actorUser?.accountId === currentUser.accountId)
      );
    } catch (error) {
      logger.warn('Failed to evaluate project role condition', { error, condition }, this.requestId);
      return false;
    }
  }

  private evaluateCustomFieldCondition(issue: any, condition: WorkflowCondition): boolean {
    if (!condition.field || condition.value === undefined) return false;

    const customFieldValue = issue.fields[condition.field];
    return this.compareValues(customFieldValue, condition.value, condition.operator || 'equals');
  }

  private evaluateAssigneeCondition(issue: any, condition: WorkflowCondition): boolean {
    const assignee = issue.fields.assignee;
    if (!assignee && !condition.value) return true; // Both null
    if (!assignee || !condition.value) return false; // One is null

    const assigneeId = assignee.accountId || assignee.emailAddress;
    return this.compareValues(assigneeId, condition.value, condition.operator || 'equals');
  }

  private evaluateReporterCondition(issue: any, condition: WorkflowCondition): boolean {
    const reporter = issue.fields.reporter;
    if (!reporter || !condition.value) return false;

    const reporterId = reporter.accountId || reporter.emailAddress;
    return this.compareValues(reporterId, condition.value, condition.operator || 'equals');
  }

  private getFieldValue(issue: any, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value = issue.fields;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return value;
  }

  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case 'not_contains':
        return !String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      default:
        return false;
    }
  }

  /**
   * Perform bulk transition with conditions
   */
  async bulkTransition(args: BulkTransitionArgs): Promise<any> {
    logger.info('Starting bulk transition', { jql: args.jql, transitionId: args.transitionId, dryRun: args.dryRun }, this.requestId);

    try {
      // Search for issues using JQL
      const searchResult = await this.client.get('/rest/api/3/search', {
        params: {
          jql: args.jql,
          maxResults: args.maxIssues,
          fields: 'key,summary,status,assignee,reporter,project,issuetype'
        }
      });

      const issues = searchResult.issues || [];
      const results = {
        total: issues.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [] as any[],
        transitions: [] as any[]
      };

      logger.info(`Found ${issues.length} issues to process`, {}, this.requestId);

      for (const issue of issues) {
        results.processed++;
        
        try {
          // Check conditions if provided
          if (args.conditions && args.conditions.length > 0) {
            const conditionsMet = await this.evaluateConditions(issue, args.conditions);
            if (!conditionsMet) {
              logger.debug('Conditions not met, skipping issue', { issueKey: issue.key }, this.requestId);
              continue;
            }
          }

          // Check if transition is available
          const availableTransitions = await this.client.get(`/rest/api/3/issue/${issue.key}/transitions`);
          const targetTransition = availableTransitions.transitions?.find((t: any) => t.id === args.transitionId);
          
          if (!targetTransition) {
            results.errors.push({
              issueKey: issue.key,
              error: `Transition ${args.transitionId} not available`
            });
            results.failed++;
            continue;
          }

          if (!args.dryRun) {
            // Perform the transition
            const transitionData: any = {
              transition: { id: args.transitionId }
            };

            if (args.fields) {
              transitionData.fields = args.fields;
            }

            if (args.comment) {
              transitionData.update = {
                comment: [{ add: { body: args.comment } }]
              };
            }

            await this.client.post(`/rest/api/3/issue/${issue.key}/transitions`, transitionData);
          }

          results.transitions.push({
            issueKey: issue.key,
            fromStatus: issue.fields.status.name,
            toStatus: targetTransition.to.name,
            transitionName: targetTransition.name
          });

          results.successful++;
          logger.debug('Successfully transitioned issue', { issueKey: issue.key, transition: targetTransition.name }, this.requestId);

        } catch (error: any) {
          results.failed++;
          results.errors.push({
            issueKey: issue.key,
            error: error.message
          });
          logger.error('Failed to transition issue', { issueKey: issue.key, error: error.message }, this.requestId);
        }
      }

      logger.info('Bulk transition completed', results, this.requestId);
      return results;

    } catch (error: any) {
      logger.error('Bulk transition failed', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Bulk transition failed: ${error.message}`,
        ErrorCategory.EXECUTION,
        { args },
        this.requestId
      );
    }
  }

  /**
   * Perform conditional transition based on multiple conditions
   */
  async conditionalTransition(args: ConditionalTransitionArgs): Promise<any> {
    logger.info('Starting conditional transition', { issueKey: args.issueIdOrKey }, this.requestId);

    try {
      // Get issue details
      const issue = await this.client.get(`/rest/api/3/issue/${args.issueIdOrKey}`, {
        params: { expand: 'transitions' }
      });

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(issue, args.conditions);
      
      // Determine which transition to use
      let selectedTransitionId: string;
      if (conditionsMet) {
        // Use the first matching transition from mapping
        selectedTransitionId = Object.values(args.transitionMapping)[0];
      } else if (args.defaultTransition) {
        selectedTransitionId = args.defaultTransition;
      } else {
        throw new Error('Conditions not met and no default transition specified');
      }

      // Get available transitions
      const availableTransitions = await this.client.get(`/rest/api/3/issue/${args.issueIdOrKey}/transitions`);
      const targetTransition = availableTransitions.transitions?.find((t: any) => t.id === selectedTransitionId);

      if (!targetTransition) {
        throw new Error(`Transition ${selectedTransitionId} not available for issue ${args.issueIdOrKey}`);
      }

      // Perform the transition
      const transitionData: any = {
        transition: { id: selectedTransitionId }
      };

      if (args.fields) {
        transitionData.fields = args.fields;
      }

      if (args.comment) {
        transitionData.update = {
          comment: [{ add: { body: args.comment } }]
        };
      }

      await this.client.post(`/rest/api/3/issue/${args.issueIdOrKey}/transitions`, transitionData);

      const result = {
        issueKey: args.issueIdOrKey,
        conditionsMet,
        selectedTransition: {
          id: selectedTransitionId,
          name: targetTransition.name,
          from: issue.fields.status.name,
          to: targetTransition.to.name
        }
      };

      logger.info('Conditional transition completed', result, this.requestId);
      return result;

    } catch (error: any) {
      logger.error('Conditional transition failed', { error: error.message, issueKey: args.issueIdOrKey }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Conditional transition failed: ${error.message}`,
        ErrorCategory.EXECUTION,
        { args },
        this.requestId
      );
    }
  }

  /**
   * Validate workflow configuration
   */
  async validateWorkflow(args: WorkflowValidationArgs): Promise<any> {
    logger.info('Validating workflow', { projectKey: args.projectKey }, this.requestId);

    try {
      const results = {
        projectKey: args.projectKey,
        workflows: [] as any[],
        issues: [] as any[],
        valid: true,
        errors: [] as string[]
      };

      // Get project details
      const project = await this.client.get(`/rest/api/3/project/${args.projectKey}`);
      
      // Get project workflows
      const workflows = await this.client.get(`/rest/api/3/project/${args.projectKey}/statuses`);
      
      for (const issueType of workflows) {
        const workflowInfo = {
          issueType: issueType.name,
          statuses: issueType.statuses.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.statusCategory.name
          }))
        };

        // Validate transitions for each status
        for (const status of issueType.statuses) {
          try {
            // Create a sample issue to test transitions (dry run)
            const sampleJql = `project = "${args.projectKey}" AND issuetype = "${issueType.name}" AND status = "${status.name}"`;
            const sampleIssues = await this.client.get('/rest/api/3/search', {
              params: { jql: sampleJql, maxResults: 1 }
            });

            if (sampleIssues.issues && sampleIssues.issues.length > 0) {
              const sampleIssue = sampleIssues.issues[0];
              const transitions = await this.client.get(`/rest/api/3/issue/${sampleIssue.key}/transitions`);
              
              const statusInfo = workflowInfo.statuses.find((s: any) => s.id === status.id);
              if (statusInfo) {
                statusInfo.availableTransitions = transitions.transitions?.map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  to: t.to.name
                })) || [];
              }
            }
          } catch (error: any) {
            results.errors.push(`Failed to validate transitions for ${issueType.name} - ${status.name}: ${error.message}`);
            results.valid = false;
          }
        }

        results.workflows.push(workflowInfo);
      }

      logger.info('Workflow validation completed', { valid: results.valid, errorCount: results.errors.length }, this.requestId);
      return results;

    } catch (error: any) {
      logger.error('Workflow validation failed', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Workflow validation failed: ${error.message}`,
        ErrorCategory.EXECUTION,
        { args },
        this.requestId
      );
    }
  }
}

// Tool definitions
export const bulkTransitionTool: Tool = {
  name: 'workflow.bulk_transition',
  description: 'Perform bulk transitions on multiple issues with optional conditions',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to find issues to transition'
      },
      transitionId: {
        type: 'string',
        description: 'ID of the transition to perform'
      },
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['field_value', 'user_role', 'project_role', 'custom_field', 'assignee_check', 'reporter_check']
            },
            field: { type: 'string' },
            value: {},
            operator: {
              type: 'string',
              enum: ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'greater_than', 'less_than']
            },
            role: { type: 'string' },
            user: { type: 'string' }
          },
          required: ['type']
        },
        description: 'Optional conditions that must be met for transition'
      },
      fields: {
        type: 'object',
        description: 'Fields to update during transition'
      },
      dryRun: {
        type: 'boolean',
        default: false,
        description: 'If true, only simulate the transitions without executing them'
      },
      maxIssues: {
        type: 'number',
        default: 50,
        description: 'Maximum number of issues to process'
      },
      comment: {
        type: 'string',
        description: 'Comment to add during transition'
      }
    },
    required: ['jql', 'transitionId']
  }
};

export const conditionalTransitionTool: Tool = {
  name: 'workflow.conditional_transition',
  description: 'Perform conditional transitions based on issue conditions',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key to transition'
      },
      conditions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['field_value', 'user_role', 'project_role', 'custom_field', 'assignee_check', 'reporter_check']
            },
            field: { type: 'string' },
            value: {},
            operator: {
              type: 'string',
              enum: ['equals', 'not_equals', 'contains', 'not_contains', 'in', 'not_in', 'greater_than', 'less_than']
            },
            role: { type: 'string' },
            user: { type: 'string' }
          },
          required: ['type']
        },
        description: 'Conditions to evaluate for transition decision'
      },
      transitionMapping: {
        type: 'object',
        description: 'Mapping of condition results to transition IDs'
      },
      defaultTransition: {
        type: 'string',
        description: 'Default transition ID if conditions are not met'
      },
      fields: {
        type: 'object',
        description: 'Fields to update during transition'
      },
      comment: {
        type: 'string',
        description: 'Comment to add during transition'
      }
    },
    required: ['issueIdOrKey', 'conditions', 'transitionMapping']
  }
};

export const workflowValidationTool: Tool = {
  name: 'workflow.validate',
  description: 'Validate workflow configuration for a project',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: {
        type: 'string',
        description: 'Project key to validate workflows for'
      },
      workflowName: {
        type: 'string',
        description: 'Specific workflow name to validate (optional)'
      },
      issueTypes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific issue types to validate (optional)'
      }
    },
    required: ['projectKey']
  }
};

// Tool execution functions
export async function executeBulkTransition(client: JiraRestClient, args: unknown): Promise<any> {
  const validatedArgs = BulkTransitionArgsSchema.parse(args);
  const manager = new WorkflowTransitionManager(client);
  
  try {
    const result = await manager.bulkTransition(validatedArgs);
    return {
      content: [
        {
          type: 'text',
          text: `Bulk transition completed:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in bulk transition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeConditionalTransition(client: JiraRestClient, args: unknown): Promise<any> {
  const validatedArgs = ConditionalTransitionArgsSchema.parse(args);
  const manager = new WorkflowTransitionManager(client);
  
  try {
    const result = await manager.conditionalTransition(validatedArgs);
    return {
      content: [
        {
          type: 'text',
          text: `Conditional transition completed:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in conditional transition: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

export async function executeWorkflowValidation(client: JiraRestClient, args: unknown): Promise<any> {
  const validatedArgs = WorkflowValidationArgsSchema.parse(args);
  const manager = new WorkflowTransitionManager(client);
  
  try {
    const result = await manager.validateWorkflow(validatedArgs);
    return {
      content: [
        {
          type: 'text',
          text: `Workflow validation completed:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error in workflow validation: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
