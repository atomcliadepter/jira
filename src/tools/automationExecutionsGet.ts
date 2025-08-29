import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationExecutionsGetSchema = z.object({
  ruleId: z.string().describe('Automation rule ID'),
  maxResults: z.number().optional().default(50).describe('Maximum results to return'),
  startAt: z.number().optional().default(0).describe('Starting index for pagination')
});

export const getAutomationExecutionsTool: Tool = {
  name: 'automation.executions.get',
  description: 'Get automation execution history and logs',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID' },
      maxResults: { type: 'number', default: 50, description: 'Maximum results to return' },
      startAt: { type: 'number', default: 0, description: 'Starting index for pagination' }
    },
    required: ['ruleId']
  }
};

export async function executeGetAutomationExecutions(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationExecutionsGetSchema.parse(args);
  
  const params = new URLSearchParams();
  params.append('maxResults', validatedArgs.maxResults.toString());
  params.append('startAt', validatedArgs.startAt.toString());
  
  const response = await client.get(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}/audit?${params.toString()}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
