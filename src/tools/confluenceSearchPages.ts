
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { logger } from '../utils/logger.js';

export const confluenceSearchPagesTool: Tool = {
  name: 'confluence.pages.search',
  description: 'Search Confluence pages using CQL',
  inputSchema: {
    type: 'object',
    properties: {
      cql: {
        type: 'string',
        description: 'Confluence Query Language (CQL) search query'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 25
      },
      start: {
        type: 'number',
        description: 'Starting index for pagination',
        default: 0
      }
    },
    required: ['cql']
  }
};

export async function executeConfluenceSearchPages(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.pages.search', { args });
    
    const { cql, limit = 25, start = 0 } = args as {
      cql: string;
      limit?: number;
      start?: number;
    };

    const pages = await confluenceService.searchPages(cql, limit, start);
    
    logger.info('Successfully searched Confluence pages', { 
      cql,
      resultCount: pages.length 
    });

    return {
      success: true,
      results: pages.map(page => ({
        id: page.id,
        type: page.type,
        status: page.status,
        title: page.title,
        space: page.space ? {
          id: page.space.id,
          key: page.space.key,
          name: page.space.name
        } : undefined,
        webUrl: page._links.webui
      })),
      pagination: {
        start,
        limit,
        size: pages.length
      }
    };
  } catch (error) {
    logger.error('Failed to search Confluence pages:', error);
    throw error;
  }
}
