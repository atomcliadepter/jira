
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { UpdatePageRequestSchema } from '../types/confluence.js';
import { logger } from '../utils/logger.js';

export const confluenceUpdatePageTool: Tool = {
  name: 'confluence.page.update',
  description: 'Update an existing Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'ID of the page to update'
      },
      title: {
        type: 'string',
        description: 'New page title (optional)'
      },
      content: {
        type: 'string',
        description: 'New page content in HTML/storage format (optional)'
      },
      versionNumber: {
        type: 'number',
        description: 'Current version number of the page'
      }
    },
    required: ['pageId', 'versionNumber']
  }
};

export async function executeConfluenceUpdatePage(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.page.update', { args });
    
    const { pageId, title, content, versionNumber } = args as {
      pageId: string;
      title?: string;
      content?: string;
      versionNumber: number;
    };

    const updateRequest: any = {
      version: {
        number: versionNumber + 1
      }
    };

    if (title) {
      updateRequest.title = title;
    }

    if (content) {
      updateRequest.body = {
        storage: {
          value: content,
          representation: 'storage'
        }
      };
    }

    const validatedRequest = UpdatePageRequestSchema.parse(updateRequest);
    const page = await confluenceService.updatePage(pageId, validatedRequest);
    
    logger.info('Successfully updated Confluence page', { 
      pageId: page.id, 
      title: page.title 
    });

    return {
      success: true,
      page: {
        id: page.id,
        title: page.title,
        version: page.version.number,
        webUrl: page._links.webui,
        editUrl: page._links.edit
      }
    };
  } catch (error) {
    logger.error('Failed to update Confluence page:', error);
    throw error;
  }
}
