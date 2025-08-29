import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionMoveSchema = z.object({
  id: z.string().describe('Version ID'),
  moveToVersionId: z.string().describe('Target version ID to move issues to')
});

export const moveVersionTool: Tool = {
  name: 'version.move',
  description: 'Move version issues to another version',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Version ID' },
      moveToVersionId: { type: 'string', description: 'Target version ID to move issues to' }
    },
    required: ['id', 'moveToVersionId']
  }
};

export async function executeMoveVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionMoveSchema.parse(args);
  
  const response = await client.post(`/rest/api/3/version/${validatedArgs.id}/moveIssuesTo/${validatedArgs.moveToVersionId}`, {});
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Issues moved from version ${validatedArgs.id} to ${validatedArgs.moveToVersionId}`,
        response
      }, null, 2)
    }]
  };
}
