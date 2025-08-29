import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const WatchersAddSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key'),
  accountId: z.string().describe('Account ID of the user to add as watcher')
});

export const addWatcherTool: Tool = {
  name: 'watchers.add',
  description: 'Add a watcher to an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' },
      accountId: { type: 'string', description: 'Account ID of the user to add as watcher' }
    },
    required: ['issueIdOrKey', 'accountId']
  }
};

export async function executeAddWatcher(args: unknown, client: JiraRestClient) {
  const validatedArgs = WatchersAddSchema.parse(args);
  
  await client.post(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/watchers`, {
    accountId: validatedArgs.accountId
  });
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Watcher added to issue ${validatedArgs.issueIdOrKey}`
      }, null, 2)
    }]
  };
}
