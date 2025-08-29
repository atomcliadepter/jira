import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleGetSchema = z.object({
  ruleId: z.string().describe('Automation rule ID')
});

export const getAutomationRuleTool: Tool = {
  name: 'automation.rule.get',
  description: 'Retrieve automation rule details and configurations',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID' }
    },
    required: ['ruleId']
  }
};

export async function executeGetAutomationRule(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleGetSchema.parse(args);
  
  const response = await client.get(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
