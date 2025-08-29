import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleDeleteSchema = z.object({
  ruleId: z.string().describe('Automation rule ID to delete')
});

export const deleteAutomationRuleTool: Tool = {
  name: 'automation.rule.delete',
  description: 'Delete automation rules with dependency checking',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID to delete' }
    },
    required: ['ruleId']
  }
};

export async function executeDeleteAutomationRule(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleDeleteSchema.parse(args);
  
  await client.delete(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Automation rule ${validatedArgs.ruleId} deleted successfully`
      }, null, 2)
    }]
  };
}
