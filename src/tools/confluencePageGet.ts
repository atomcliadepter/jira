import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluencePageGetSchema = z.object({
  pageId: z.string().describe('Confluence page ID'),
  expand: z.array(z.string()).optional().describe('Fields to expand (body.storage, version, space, etc.)')
});

export const getConfluencePageTool: Tool = {
  name: 'confluence.page.get',
  description: 'Retrieve page content and metadata',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: { type: 'string', description: 'Confluence page ID' },
      expand: { type: 'array', items: { type: 'string' }, description: 'Fields to expand (body.storage, version, space, etc.)' }
    },
    required: ['pageId']
  }
};

export async function executeGetConfluencePage(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluencePageGetSchema.parse(args);
  
  const params = new URLSearchParams();
  if (validatedArgs.expand?.length) {
    params.append('expand', validatedArgs.expand.join(','));
  } else {
    params.append('expand', 'body.storage,version,space');
  }
  
  const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + `/rest/api/content/${validatedArgs.pageId}?${params.toString()}`;
  const response = await client.get(confluenceUrl);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
