import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionGetSchema = z.object({
  id: z.string().describe('Version ID'),
  expand: z.string().optional().describe('Comma-separated list of fields to expand')
});

export const getVersionTool: Tool = {
  name: 'version.get',
  description: 'Get version details',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Version ID' },
      expand: { type: 'string', description: 'Comma-separated list of fields to expand' }
    },
    required: ['id']
  }
};

export async function executeGetVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionGetSchema.parse(args);
  
  const params = new URLSearchParams();
  if (validatedArgs.expand) params.append('expand', validatedArgs.expand);
  
  const url = `/rest/api/3/version/${validatedArgs.id}${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await client.get(url);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
