import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldSearchSchema = z.object({
  query: z.string().optional().describe('Search query for field names'),
  type: z.array(z.string()).optional().describe('Field types to filter by'),
  maxResults: z.number().optional().default(50).describe('Maximum results to return'),
  startAt: z.number().optional().default(0).describe('Starting index for pagination')
});

export const searchCustomFieldTool: Tool = {
  name: 'customfield.search.new',
  description: 'Search custom fields with filtering and sorting',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query for field names' },
      type: { type: 'array', items: { type: 'string' }, description: 'Field types to filter by' },
      maxResults: { type: 'number', default: 50, description: 'Maximum results to return' },
      startAt: { type: 'number', default: 0, description: 'Starting index for pagination' }
    }
  }
};

export async function executeSearchCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldSearchSchema.parse(args);
  
  const params = new URLSearchParams();
  if (validatedArgs.query) params.append('query', validatedArgs.query);
  if (validatedArgs.type?.length) params.append('type', validatedArgs.type.join(','));
  params.append('maxResults', validatedArgs.maxResults.toString());
  params.append('startAt', validatedArgs.startAt.toString());
  
  const response = await client.get(`/rest/api/3/field/search?${params.toString()}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
