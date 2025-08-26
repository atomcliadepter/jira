
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { CreateSpaceRequestSchema } from '../types/confluence.js';
import { logger } from '../utils/logger.js';

export const confluenceCreateSpaceTool: Tool = {
  name: 'confluence.space.create',
  description: 'Create a new Confluence space',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Space key (must be unique)'
      },
      name: {
        type: 'string',
        description: 'Space name'
      },
      description: {
        type: 'string',
        description: 'Space description (optional)'
      },
      permissions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accountId: {
              type: 'string',
              description: 'User account ID'
            },
            operation: {
              type: 'string',
              description: 'Permission operation (e.g., administer, use)'
            }
          },
          required: ['accountId', 'operation']
        },
        description: 'Initial space permissions (optional)'
      }
    },
    required: ['key', 'name']
  }
};

export async function executeConfluenceCreateSpace(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.space.create', { args });
    
    const { key, name, description, permissions } = args as {
      key: string;
      name: string;
      description?: string;
      permissions?: Array<{ accountId: string; operation: string }>;
    };

    const request: any = {
      key,
      name
    };

    if (description) {
      request.description = {
        plain: {
          value: description,
          representation: 'plain'
        }
      };
    }

    if (permissions && permissions.length > 0) {
      request.permissions = permissions.map(perm => ({
        subjects: {
          user: {
            results: [{
              accountId: perm.accountId,
              type: 'known'
            }]
          }
        },
        operation: {
          operation: perm.operation,
          targetType: 'space'
        }
      }));
    }

    const validatedRequest = CreateSpaceRequestSchema.parse(request);
    const space = await confluenceService.createSpace(validatedRequest);
    
    logger.info('Successfully created Confluence space', { 
      spaceId: space.id, 
      spaceKey: space.key,
      name: space.name 
    });

    return {
      success: true,
      space: {
        id: space.id,
        key: space.key,
        name: space.name,
        type: space.type,
        webUrl: space._links.webui
      }
    };
  } catch (error) {
    logger.error('Failed to create Confluence space:', error);
    throw error;
  }
}
