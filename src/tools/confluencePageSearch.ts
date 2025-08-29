import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluencePageSearchSchema = z.object({
  cql: z.string().describe('Confluence Query Language (CQL) search query'),
  limit: z.number().optional().default(25).describe('Maximum results to return'),
  start: z.number().optional().default(0).describe('Starting index for pagination'),
  expand: z.array(z.string()).optional().describe('Fields to expand')
});

export const searchConfluencePagesTool: Tool = {
  name: 'confluence.pages.search',
  description: 'Search pages across spaces with advanced filters',
  inputSchema: {
    type: 'object',
    properties: {
      cql: { type: 'string', description: 'Confluence Query Language (CQL) search query' },
      limit: { type: 'number', default: 25, description: 'Maximum results to return' },
      start: { type: 'number', default: 0, description: 'Starting index for pagination' },
      expand: { type: 'array', items: { type: 'string' }, description: 'Fields to expand' }
    },
    required: ['cql']
  }
};

export async function executeSearchConfluencePages(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluencePageSearchSchema.parse(args);
  
  const params = new URLSearchParams();
  params.append('cql', validatedArgs.cql);
  params.append('limit', validatedArgs.limit.toString());
  params.append('start', validatedArgs.start.toString());
  if (validatedArgs.expand?.length) {
    params.append('expand', validatedArgs.expand.join(','));
  }
  
  const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + `/rest/api/content/search?${params.toString()}`;
  const response = await client.get(confluenceUrl);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
