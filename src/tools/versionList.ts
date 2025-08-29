import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionListSchema = z.object({
  projectIdOrKey: z.string().describe('Project ID or key'),
  expand: z.string().optional().describe('Comma-separated list of fields to expand')
});

export const listVersionsTool: Tool = {
  name: 'version.list',
  description: 'List project versions',
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: { type: 'string', description: 'Project ID or key' },
      expand: { type: 'string', description: 'Comma-separated list of fields to expand' }
    },
    required: ['projectIdOrKey']
  }
};

export async function executeListVersions(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionListSchema.parse(args);
  
  const params = new URLSearchParams();
  if (validatedArgs.expand) params.append('expand', validatedArgs.expand);
  
  const url = `/rest/api/3/project/${validatedArgs.projectIdOrKey}/versions${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await client.get(url);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
