import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionMergeSchema = z.object({
  id: z.string().describe('Version ID to merge from'),
  moveIssuesTo: z.string().describe('Target version ID to merge issues to')
});

export const mergeVersionTool: Tool = {
  name: 'version.merge',
  description: 'Merge version into another version',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Version ID to merge from' },
      moveIssuesTo: { type: 'string', description: 'Target version ID to merge issues to' }
    },
    required: ['id', 'moveIssuesTo']
  }
};

export async function executeMergeVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionMergeSchema.parse(args);
  
  const response = await client.put(`/rest/api/3/version/${validatedArgs.id}/mergeto/${validatedArgs.moveIssuesTo}`, {});
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Version ${validatedArgs.id} merged into ${validatedArgs.moveIssuesTo}`,
        response
      }, null, 2)
    }]
  };
}
