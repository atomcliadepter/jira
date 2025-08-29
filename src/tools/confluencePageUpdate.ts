import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluencePageUpdateSchema = z.object({
  pageId: z.string().describe('Confluence page ID'),
  title: z.string().optional().describe('New page title'),
  body: z.string().optional().describe('New page content in storage format'),
  version: z.number().describe('Current page version number')
});

export const updateConfluencePageTool: Tool = {
  name: 'confluence.page.update',
  description: 'Update existing pages with version control',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: { type: 'string', description: 'Confluence page ID' },
      title: { type: 'string', description: 'New page title' },
      body: { type: 'string', description: 'New page content in storage format' },
      version: { type: 'number', description: 'Current page version number' }
    },
    required: ['pageId', 'version']
  }
};

export async function executeUpdateConfluencePage(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluencePageUpdateSchema.parse(args);
  
  const updateData: any = {
    version: { number: validatedArgs.version + 1 },
    type: 'page'
  };
  
  if (validatedArgs.title) updateData.title = validatedArgs.title;
  if (validatedArgs.body) {
    updateData.body = {
      storage: {
        value: validatedArgs.body,
        representation: 'storage'
      }
    };
  }

  const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + `/rest/api/content/${validatedArgs.pageId}`;
  const response = await client.put(confluenceUrl, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Confluence page ${validatedArgs.pageId} updated successfully`,
        page: response
      }, null, 2)
    }]
  };
}
