import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const IssueLinkDeleteSchema = z.object({
  linkId: z.string().describe('ID of the issue link to delete')
});

export const deleteIssueLinkTool: Tool = {
  name: 'issuelink.delete',
  description: 'Delete an issue link',
  inputSchema: {
    type: 'object',
    properties: {
      linkId: { type: 'string', description: 'ID of the issue link to delete' }
    },
    required: ['linkId']
  }
};

export async function executeDeleteIssueLink(args: unknown, client: JiraRestClient) {
  const validatedArgs = IssueLinkDeleteSchema.parse(args);
  
  await client.delete(`/rest/api/3/issueLink/${validatedArgs.linkId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Issue link ${validatedArgs.linkId} deleted successfully`
      }, null, 2)
    }]
  };
}
