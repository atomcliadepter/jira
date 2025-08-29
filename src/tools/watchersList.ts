import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const WatchersListSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key')
});

export const listWatchersTool: Tool = {
  name: 'watchers.list',
  description: 'List watchers of an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeListWatchers(args: unknown, client: JiraRestClient) {
  const validatedArgs = WatchersListSchema.parse(args);
  
  const response = await client.get(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/watchers`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
