import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionDeleteSchema = z.object({
  id: z.string().describe('Version ID'),
  moveFixIssuesTo: z.string().optional().describe('Version ID to move fix issues to'),
  moveAffectedIssuesTo: z.string().optional().describe('Version ID to move affected issues to')
});

export const deleteVersionTool: Tool = {
  name: 'version.delete',
  description: 'Delete a version',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Version ID' },
      moveFixIssuesTo: { type: 'string', description: 'Version ID to move fix issues to' },
      moveAffectedIssuesTo: { type: 'string', description: 'Version ID to move affected issues to' }
    },
    required: ['id']
  }
};

export async function executeDeleteVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionDeleteSchema.parse(args);
  
  const params = new URLSearchParams();
  if (validatedArgs.moveFixIssuesTo) params.append('moveFixIssuesTo', validatedArgs.moveFixIssuesTo);
  if (validatedArgs.moveAffectedIssuesTo) params.append('moveAffectedIssuesTo', validatedArgs.moveAffectedIssuesTo);
  
  const url = `/rest/api/3/version/${validatedArgs.id}${params.toString() ? `?${params.toString()}` : ''}`;
  await client.delete(url);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Version ${validatedArgs.id} deleted successfully`
      }, null, 2)
    }]
  };
}
