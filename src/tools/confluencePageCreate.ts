import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluencePageCreateSchema = z.object({
  spaceKey: z.string().describe('Confluence space key'),
  title: z.string().describe('Page title'),
  body: z.string().describe('Page content in storage format'),
  parentId: z.string().optional().describe('Parent page ID')
});

export const createConfluencePageTool: Tool = {
  name: 'confluence.page.create',
  description: 'Create Confluence pages with rich content',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: { type: 'string', description: 'Confluence space key' },
      title: { type: 'string', description: 'Page title' },
      body: { type: 'string', description: 'Page content in storage format' },
      parentId: { type: 'string', description: 'Parent page ID' }
    },
    required: ['spaceKey', 'title', 'body']
  }
};

export async function executeCreateConfluencePage(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluencePageCreateSchema.parse(args);
  
  const pageData = {
    type: 'page',
    title: validatedArgs.title,
    space: { key: validatedArgs.spaceKey },
    body: {
      storage: {
        value: validatedArgs.body,
        representation: 'storage'
      }
    },
    ...(validatedArgs.parentId && {
      ancestors: [{ id: validatedArgs.parentId }]
    })
  };

  // Use Confluence REST API endpoint
  const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + '/rest/api/content';
  const response = await client.post(confluenceUrl, pageData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Confluence page '${validatedArgs.title}' created successfully`,
        page: response
      }, null, 2)
    }]
  };
}
