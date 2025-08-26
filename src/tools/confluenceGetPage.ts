
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { logger } from '../utils/logger.js';

export const confluenceGetPageTool: Tool = {
  name: 'confluence.page.get',
  description: 'Get a Confluence page by ID',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'ID of the page to retrieve'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional fields to expand (e.g., body.storage, version, space)'
      }
    },
    required: ['pageId']
  }
};

export async function executeConfluenceGetPage(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.page.get', { args });
    
    const { pageId, expand } = args as {
      pageId: string;
      expand?: string[];
    };

    const page = await confluenceService.getPage(pageId, expand);
    
    logger.info('Successfully retrieved Confluence page', { 
      pageId: page.id, 
      title: page.title 
    });

    return {
      success: true,
      page: {
        id: page.id,
        type: page.type,
        status: page.status,
        title: page.title,
        space: page.space ? {
          id: page.space.id,
          key: page.space.key,
          name: page.space.name
        } : undefined,
        version: page.version,
        body: page.body,
        webUrl: page._links.webui,
        editUrl: page._links.edit
      }
    };
  } catch (error) {
    logger.error('Failed to get Confluence page:', error);
    throw error;
  }
}
