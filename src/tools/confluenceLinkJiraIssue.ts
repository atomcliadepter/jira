
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { logger } from '../utils/logger.js';

export const confluenceLinkJiraIssueTool: Tool = {
  name: 'confluence.jira.link',
  description: 'Link a Jira issue to a Confluence page',
  inputSchema: {
    type: 'object',
    properties: {
      pageId: {
        type: 'string',
        description: 'ID of the Confluence page'
      },
      issueKey: {
        type: 'string',
        description: 'Jira issue key (e.g., PROJ-123)'
      },
      serverId: {
        type: 'string',
        description: 'Jira server ID (optional, defaults to "System JIRA")'
      }
    },
    required: ['pageId', 'issueKey']
  }
};

export async function executeConfluenceLinkJiraIssue(
  confluenceService: ConfluenceService,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.jira.link', { args });
    
    const { pageId, issueKey, serverId } = args as {
      pageId: string;
      issueKey: string;
      serverId?: string;
    };

    await confluenceService.linkJiraIssueToPage(pageId, issueKey, serverId);
    
    logger.info('Successfully linked Jira issue to Confluence page', { 
      pageId, 
      issueKey 
    });

    return {
      success: true,
      link: {
        pageId,
        issueKey,
        serverId: serverId || 'System JIRA'
      }
    };
  } catch (error) {
    logger.error('Failed to link Jira issue to Confluence page:', error);
    throw error;
  }
}
