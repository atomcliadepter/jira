
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { CreatePageRequestSchema } from '../types/confluence.js';
import { logger } from '../utils/logger.js';

export const confluenceCreatePageTool: Tool = {
  name: 'confluence.page.create',
  description: 'Create a new Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Page title'
      },
      spaceKey: {
        type: 'string',
        description: 'Space key where the page will be created'
      },
      content: {
        type: 'string',
        description: 'Page content in HTML/storage format'
      },
      parentPageId: {
        type: 'string',
        description: 'Optional parent page ID to create as child page'
      }
    },
    required: ['title', 'spaceKey', 'content']
  }
};

export async function executeConfluenceCreatePage(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.page.create', { args });
    
    const { title, spaceKey, content, parentPageId } = args as {
      title: string;
      spaceKey: string;
      content: string;
      parentPageId?: string;
    };

    const request = CreatePageRequestSchema.parse({
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      },
      ...(parentPageId && { ancestors: [{ id: parentPageId }] })
    });

    const page = await confluenceService.createPage(request);
    
    logger.info('Successfully created Confluence page', { 
      pageId: page.id, 
      title: page.title 
    });

    return {
      success: true,
      page: {
        id: page.id,
        title: page.title,
        spaceKey: page.space?.key,
        webUrl: page._links.webui,
        editUrl: page._links.edit
      }
    };
  } catch (error) {
    logger.error('Failed to create Confluence page:', error);
    throw error;
  }
}
