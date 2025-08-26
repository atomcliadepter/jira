
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { logger } from '../utils/logger.js';

export const confluenceGetSpacePermissionsTool: Tool = {
  name: 'confluence.space.permissions.get',
  description: 'Get permissions for a Confluence space',
  inputSchema: {
    type: 'object',
    properties: {
      spaceId: {
        type: 'string',
        description: 'Space ID to get permissions for'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 25
      },
      cursor: {
        type: 'string',
        description: 'Cursor for pagination'
      }
    },
    required: ['spaceId']
  }
};

export async function executeConfluenceGetSpacePermissions(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.space.permissions.get', { args });
    
    const { spaceId, limit = 25, cursor } = args as {
      spaceId: string;
      limit?: number;
      cursor?: string;
    };

    const permissions = await confluenceService.getSpacePermissions(spaceId, limit, cursor);
    
    logger.info('Successfully retrieved space permissions', { 
      spaceId,
      permissionCount: permissions.length 
    });

    return {
      success: true,
      spaceId,
      permissions: permissions.map(permission => ({
        id: permission.id,
        principal: {
          type: permission.principal.type,
          id: permission.principal.id
        },
        operation: {
          key: permission.operation.key,
          targetType: permission.operation.targetType
        }
      })),
      pagination: {
        limit,
        size: permissions.length,
        cursor
      }
    };
  } catch (error) {
    logger.error('Failed to get space permissions:', error);
    throw error;
  }
}
