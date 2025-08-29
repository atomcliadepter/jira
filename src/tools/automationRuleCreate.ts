import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleCreateSchema = z.object({
  name: z.string().describe('Rule name'),
  description: z.string().optional().describe('Rule description'),
  trigger: z.object({
    component: z.string().describe('Trigger component (e.g., TRIGGER)'),
    type: z.string().describe('Trigger type (e.g., jira.issue.event.trigger)')
  }).describe('Rule trigger configuration'),
  actions: z.array(z.object({
    component: z.string().describe('Action component'),
    type: z.string().describe('Action type')
  })).describe('Rule actions'),
  projects: z.array(z.string()).optional().describe('Project keys to apply rule to')
});

export const createAutomationRuleTool: Tool = {
  name: 'automation.rule.create',
  description: 'Create automation rules with triggers and actions',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Rule name' },
      description: { type: 'string', description: 'Rule description' },
      trigger: {
        type: 'object',
        properties: {
          component: { type: 'string', description: 'Trigger component (e.g., TRIGGER)' },
          type: { type: 'string', description: 'Trigger type (e.g., jira.issue.event.trigger)' }
        },
        required: ['component', 'type'],
        description: 'Rule trigger configuration'
      },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            component: { type: 'string', description: 'Action component' },
            type: { type: 'string', description: 'Action type' }
          },
          required: ['component', 'type']
        },
        description: 'Rule actions'
      },
      projects: { type: 'array', items: { type: 'string' }, description: 'Project keys to apply rule to' }
    },
    required: ['name', 'trigger', 'actions']
  }
};

export async function executeCreateAutomationRule(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleCreateSchema.parse(args);
  
  const ruleData = {
    name: validatedArgs.name,
    description: validatedArgs.description || '',
    trigger: validatedArgs.trigger,
    components: [
      validatedArgs.trigger,
      ...validatedArgs.actions
    ],
    ...(validatedArgs.projects && { projects: validatedArgs.projects })
  };

  const response = await client.post(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule`, ruleData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Automation rule '${validatedArgs.name}' created successfully`,
        rule: response
      }, null, 2)
    }]
  };
}
