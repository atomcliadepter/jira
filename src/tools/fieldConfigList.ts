import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigListSchema = z.object({
  startAt: z.number().optional().default(0).describe('Starting index for pagination'),
  maxResults: z.number().optional().default(50).describe('Maximum results to return'),
  id: z.array(z.number()).optional().describe('Field configuration IDs to filter by')
});

export const listFieldConfigTool: Tool = {
  name: 'fieldconfig.list.new',
  description: 'List all field configurations with filtering',
  inputSchema: {
    type: 'object',
    properties: {
      startAt: { type: 'number', default: 0, description: 'Starting index for pagination' },
      maxResults: { type: 'number', default: 50, description: 'Maximum results to return' },
      id: { type: 'array', items: { type: 'number' }, description: 'Field configuration IDs to filter by' }
    }
  }
};

export async function executeListFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigListSchema.parse(args);
  
  const params = new URLSearchParams();
  params.append('startAt', validatedArgs.startAt.toString());
  params.append('maxResults', validatedArgs.maxResults.toString());
  if (validatedArgs.id?.length) {
    validatedArgs.id.forEach(id => params.append('id', id.toString()));
  }
  
  const response = await client.get(`/rest/api/3/fieldconfiguration?${params.toString()}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
