import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';

export const listIssueLinkTypesTool: Tool = {
  name: 'issuelink.types.list',
  description: 'List all available issue link types',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function executeListIssueLinkTypes(args: unknown, client: JiraRestClient) {
  const response = await client.get('/rest/api/3/issueLinkType');
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
