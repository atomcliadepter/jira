
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { logger } from '../utils/logger.js';

export const confluenceGetSpacesTool: Tool = {
  name: 'confluence.spaces.get',
  description: 'Get Confluence spaces',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 25
      },
      start: {
        type: 'number',
        description: 'Starting index for pagination',
        default: 0
      },
      type: {
        type: 'string',
        enum: ['global', 'personal'],
        description: 'Filter by space type'
      }
    }
  }
};

export async function executeConfluenceGetSpaces(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.spaces.get', { args });
    
    const { limit = 25, start = 0, type } = args as {
      limit?: number;
      start?: number;
      type?: 'global' | 'personal';
    };

    const spaces = await confluenceService.getSpaces(limit, start, type);
    
    logger.info('Successfully retrieved Confluence spaces', { 
      resultCount: spaces.length,
      type 
    });

    return {
      success: true,
      results: spaces.map(space => ({
        id: space.id,
        key: space.key,
        name: space.name,
        type: space.type,
        status: space.status,
        description: space.description?.plain?.value,
        webUrl: space._links.webui
      })),
      pagination: {
        start,
        limit,
        size: spaces.length
      }
    };
  } catch (error) {
    logger.error('Failed to get Confluence spaces:', error);
    throw error;
  }
}
