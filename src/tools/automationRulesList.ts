import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRulesListSchema = z.object({
  projectKey: z.string().optional().describe('Project key to filter rules'),
  maxResults: z.number().optional().default(50).describe('Maximum results to return'),
  startAt: z.number().optional().default(0).describe('Starting index for pagination')
});

export const listAutomationRulesTool: Tool = {
  name: 'automation.rules.list',
  description: 'List all automation rules with filtering',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key to filter rules' },
      maxResults: { type: 'number', default: 50, description: 'Maximum results to return' },
      startAt: { type: 'number', default: 0, description: 'Starting index for pagination' }
    }
  }
};

export async function executeListAutomationRules(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRulesListSchema.parse(args);
  
  const params = new URLSearchParams();
  params.append('maxResults', validatedArgs.maxResults.toString());
  params.append('startAt', validatedArgs.startAt.toString());
  
  const projectScope = validatedArgs.projectKey || 'GLOBAL';
  const response = await client.get(`${client.config.baseUrl}/rest/cb-automation/latest/project/${projectScope}/rule?${params.toString()}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
