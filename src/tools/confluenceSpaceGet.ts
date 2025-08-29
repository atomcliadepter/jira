import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluenceSpaceGetSchema = z.object({
  spaceKey: z.string().optional().describe('Specific space key to retrieve'),
  type: z.string().optional().describe('Space type filter (global, personal)'),
  status: z.string().optional().describe('Space status filter (current, archived)'),
  limit: z.number().optional().default(25).describe('Maximum results to return'),
  start: z.number().optional().default(0).describe('Starting index for pagination')
});

export const getConfluenceSpacesTool: Tool = {
  name: 'confluence.spaces.get',
  description: 'List and filter Confluence spaces',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: { type: 'string', description: 'Specific space key to retrieve' },
      type: { type: 'string', description: 'Space type filter (global, personal)' },
      status: { type: 'string', description: 'Space status filter (current, archived)' },
      limit: { type: 'number', default: 25, description: 'Maximum results to return' },
      start: { type: 'number', default: 0, description: 'Starting index for pagination' }
    }
  }
};

export async function executeGetConfluenceSpaces(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluenceSpaceGetSchema.parse(args);
  
  if (validatedArgs.spaceKey) {
    // Get specific space
    const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + `/rest/api/space/${validatedArgs.spaceKey}`;
    const response = await client.get(confluenceUrl);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } else {
    // List spaces with filters
    const params = new URLSearchParams();
    params.append('limit', validatedArgs.limit.toString());
    params.append('start', validatedArgs.start.toString());
    if (validatedArgs.type) params.append('type', validatedArgs.type);
    if (validatedArgs.status) params.append('status', validatedArgs.status);
    
    const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + `/rest/api/space?${params.toString()}`;
    const response = await client.get(confluenceUrl);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
}
