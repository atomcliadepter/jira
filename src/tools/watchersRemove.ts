import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const WatchersRemoveSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key'),
  accountId: z.string().describe('Account ID of the user to remove as watcher')
});

export const removeWatcherTool: Tool = {
  name: 'watchers.remove',
  description: 'Remove a watcher from an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' },
      accountId: { type: 'string', description: 'Account ID of the user to remove as watcher' }
    },
    required: ['issueIdOrKey', 'accountId']
  }
};

export async function executeRemoveWatcher(args: unknown, client: JiraRestClient) {
  const validatedArgs = WatchersRemoveSchema.parse(args);
  
  await client.delete(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/watchers?accountId=${validatedArgs.accountId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Watcher removed from issue ${validatedArgs.issueIdOrKey}`
      }, null, 2)
    }]
  };
}
