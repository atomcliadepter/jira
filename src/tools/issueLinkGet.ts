import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const IssueLinkGetSchema = z.object({
  linkId: z.string().describe('ID of the issue link to retrieve')
});

export const getIssueLinkTool: Tool = {
  name: 'issuelink.get',
  description: 'Get details of an issue link',
  inputSchema: {
    type: 'object',
    properties: {
      linkId: { type: 'string', description: 'ID of the issue link to retrieve' }
    },
    required: ['linkId']
  }
};

export async function executeGetIssueLink(args: unknown, client: JiraRestClient) {
  const validatedArgs = IssueLinkGetSchema.parse(args);
  
  const response = await client.get(`/rest/api/3/issueLink/${validatedArgs.linkId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
