import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluenceSpacePermissionsSchema = z.object({
  spaceKey: z.string().describe('Confluence space key')
});

export const getConfluenceSpacePermissionsTool: Tool = {
  name: 'confluence.space.permissions.get',
  description: 'Retrieve space permissions and access controls',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: { type: 'string', description: 'Confluence space key' }
    },
    required: ['spaceKey']
  }
};

export async function executeGetConfluenceSpacePermissions(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluenceSpacePermissionsSchema.parse(args);
  
  try {
    const confluenceBaseUrl = client.config.baseUrl.replace('/jira/', '/wiki/');
    
    // Get space information first
    const space = await client.get(`${confluenceBaseUrl}/rest/api/space/${validatedArgs.spaceKey}`);
    
    // Get space permissions (this endpoint may vary based on Confluence version)
    let permissions;
    try {
      permissions = await client.get(`${confluenceBaseUrl}/rest/api/space/${validatedArgs.spaceKey}/permission`);
    } catch (error) {
      // Fallback: get basic space info if permissions endpoint is not available
      permissions = { message: 'Permissions endpoint not available, showing space info only' };
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          spaceKey: validatedArgs.spaceKey,
          spaceName: space.name,
          spaceType: space.type,
          permissions: permissions
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          spaceKey: validatedArgs.spaceKey,
          error: error.message,
          message: 'Failed to retrieve space permissions'
        }, null, 2)
      }]
    };
  }
}
