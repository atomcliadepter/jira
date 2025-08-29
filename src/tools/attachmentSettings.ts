import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';

export const getAttachmentSettingsTool: Tool = {
  name: 'attachment.settings.get',
  description: 'Get attachment settings and metadata',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function executeGetAttachmentSettings(args: unknown, client: JiraRestClient) {
  const response = await client.get('/rest/api/3/attachment/meta');
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
