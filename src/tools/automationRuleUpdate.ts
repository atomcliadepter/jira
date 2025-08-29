import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleUpdateSchema = z.object({
  ruleId: z.string().describe('Automation rule ID'),
  name: z.string().optional().describe('New rule name'),
  description: z.string().optional().describe('New rule description'),
  state: z.enum(['ENABLED', 'DISABLED']).optional().describe('Rule state')
});

export const updateAutomationRuleTool: Tool = {
  name: 'automation.rule.update',
  description: 'Update existing automation rules',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID' },
      name: { type: 'string', description: 'New rule name' },
      description: { type: 'string', description: 'New rule description' },
      state: { type: 'string', enum: ['ENABLED', 'DISABLED'], description: 'Rule state' }
    },
    required: ['ruleId']
  }
};

export async function executeUpdateAutomationRule(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleUpdateSchema.parse(args);
  
  const updateData: any = {};
  if (validatedArgs.name) updateData.name = validatedArgs.name;
  if (validatedArgs.description) updateData.description = validatedArgs.description;
  if (validatedArgs.state) updateData.state = validatedArgs.state;

  const response = await client.put(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}`, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Automation rule ${validatedArgs.ruleId} updated successfully`,
        rule: response
      }, null, 2)
    }]
  };
}
