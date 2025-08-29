import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluenceSpaceCreateSchema = z.object({
  key: z.string().describe('Space key (unique identifier)'),
  name: z.string().describe('Space name'),
  description: z.string().optional().describe('Space description')
});

export const createConfluenceSpaceTool: Tool = {
  name: 'confluence.space.create',
  description: 'Create new Confluence spaces with permissions',
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Space key (unique identifier)' },
      name: { type: 'string', description: 'Space name' },
      description: { type: 'string', description: 'Space description' }
    },
    required: ['key', 'name']
  }
};

export async function executeCreateConfluenceSpace(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluenceSpaceCreateSchema.parse(args);
  
  const spaceData = {
    key: validatedArgs.key,
    name: validatedArgs.name,
    ...(validatedArgs.description && { description: { plain: { value: validatedArgs.description } } })
  };

  const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + '/rest/api/space';
  const response = await client.post(confluenceUrl, spaceData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Confluence space '${validatedArgs.name}' created successfully`,
        space: response
      }, null, 2)
    }]
  };
}
